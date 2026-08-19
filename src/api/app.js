import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import * as Sentry from '@sentry/node';
import { randomUUID } from 'crypto';
import { authRoutes } from './routes/auth.js';
import { endpointRoutes } from './routes/endpoints.js';
import { healthRoutes } from './routes/health.js';

const app = Fastify({
    logger: true,
    genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
});

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