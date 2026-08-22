import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import * as Sentry from '@sentry/node';
import { randomUUID } from 'crypto';
import { authRoutes } from './routes/auth.js';
import { endpointRoutes } from './routes/endpoints.js';
import { healthRoutes } from './routes/health.js';
import { userRoutes } from './routes/users.js';
import client from 'prom-client';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

const app = Fastify({
    logger: true,
    genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
});

//API documentation via swagger
await app.register(swagger, {
    openapi: {
        info: { title: 'Harbinger API', version:  '1.0.0' },
    },
});

await app.register(swaggerUi, { routePrefix: '/docs' });


// ---------------
//Metrics
const register = new client.Registry(); //A box where the metrics are stored
client.collectDefaultMetrics({ register });

//Custom metric component
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP request in ms',
    labelNames: ['method', 'route', 'status_code'],
});

register.registerMetric(httpRequestDuration);

app.addHook('onResponse', (req, reply, done) => {
    //Measuring the custom metric
    httpRequestDuration.observe(
        { method: req.method,
        route: req.routerPath,
        status_code: reply.status_code, },
        reply.getResponseTime()
    );
    done();
})

app.get('/metrics', async (req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
});

// ---------------

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1
});

app.setErrorHandler((error, request, reply) => {
    Sentry.captureException(error);

    request.log.error(error);

    reply.code(500).send({
        error: 'Internal Server Error'
    });
});

app.register(cookie);
app.register(authRoutes);
app.register(endpointRoutes);
app.register(healthRoutes);
app.register(userRoutes);

app.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
    try {
        await app.listen({ port: 3000, host: '0.0.0.0' });
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();

//Shutting down gracefully
process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
})