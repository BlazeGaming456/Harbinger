import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import * as Sentry from "@sentry/node";
import { randomUUID } from "crypto";
import { authRoutes } from "./routes/auth.js";
import { endpointRoutes } from "./routes/endpoints.js";
import { healthRoutes } from "./routes/health.js";
import { userRoutes } from "./routes/users.js";
import client from "prom-client";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import websocket from "@fastify/websocket";
import Redis from "ioredis";
import jwt from "jsonwebtoken";

const app = Fastify({
  logger: true,
  genReqId: (req) => req.headers["x-request-id"] || randomUUID(),
});

//API documentation via swagger
await app.register(swagger, {
  openapi: {
    info: { title: "Harbinger API", version: "1.0.0" },
  },
});

await app.register(swaggerUi, { routePrefix: "/docs" });

// ---------------
//Websockets

await app.register(websocket);

const connections = new Map(); //userId -> Set of actve socket connections

app.get("/ws", { websocket: true }, (connection, req) => {
  const token = new URL(req.url, "http://localhost").searchParams.get("token");

  let userId;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    userId = payload.userId;
  } catch {
    connection.socket.close(4008, "Unauthorized");
    return;
  }

  //Create new set for the user if necessary
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }

  //Add this browser's socket
  connections.get(userId).add(connection.socket);

  console.log(`Websocket connected for user ${userId}`);

  //Remove socket when browser disconnects
  connection.socket.on("close", () => {
    const sockets = connections.get(userId);

    if (!sockets) return;

    sockets.delete(connection.socket);

    //Remove empty set
    if (sockets.size === 0) {
      connections.delete(userId);
    }

    console.log(`Websocket disconnected for user ${userId}`);
  });
});

//Broadcast helper
function broadcastToUser(userId, data) {
  const sockets = connections.get(userId);

  if (!sockets) return;

  const payload = JSON.stringify(data);

  for (const socket of sockets) {
    //1 = Websocket.OPEN
    if (socket.readyState === 1) {
      socket.send(payload);
    }
  }
}

//Redis Pub/Sub
const subscriber = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});

await subscriber.subscribe("score-updates");

subscriber.on("message", (channel, message) => {
  if (channel != "score-updates") return;

  try {
    const update = JSON.parse(message);

    broadcastToUser(update.userId, {
      type: "score-update",
      ...update,
    });
  } catch (error) {
    app.log.error(error, "Failed to process score update");
  }
});

// ---------------

// ---------------
//Metrics
const register = new client.Registry(); //A box where the metrics are stored
client.collectDefaultMetrics({ register });

//Custom metric component
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP request in ms",
  labelNames: ["method", "route", "status_code"],
});

register.registerMetric(httpRequestDuration);

app.addHook("onRequest", (req, reply, done) => {
  req.startTime = process.hrtime.bigint();
  done();
});

app.addHook("onResponse", (req, reply, done) => {
  //Measuring the custom metric
  httpRequestDuration.observe(
    {
      method: req.method,
      route: req.routerPath,
      status_code: reply.status_code,
    },
    Number(process.hrtime.bigint() - req.startTime) / 1e6,
  );
  done();
});

app.get("/metrics", async (req, reply) => {
  reply.header("Content-Type", register.contentType);
  return register.metrics();
});

// ---------------

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});

app.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error);

  request.log.error(error);

  const statusCode =
    error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
  reply.code(statusCode).send({
    error: statusCode === 500 ? "Internal Server Error" : error.message,
  });
});

await app.register(cookie);
app.register(cors, {
  origin: (origin, cb) => {
    const allowedOrigins = [
      "http://localhost:3001",
      "http://localhost:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
      return;
    }

    cb(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "X-Requested-With",
    "Accept",
  ],
  exposedHeaders: ["set-cookie"],
});
app.register(authRoutes);
app.register(endpointRoutes);
app.register(healthRoutes);
app.register(userRoutes);

app.get("/health", async () => ({ status: "ok" }));

const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

//Shutting down gracefully
process.on("SIGTERM", async () => {
  await app.close();
  process.exit(0);
});
