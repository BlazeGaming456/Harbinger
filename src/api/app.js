import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { authRoutes } from './routs/auth.js';
import { endpointRoutes } from './routes/endpoints.js';
const app = Fastify({ logger: true });

app.register(cookie);
app.register(authRoutes);
app.register(endpointRoutes);

app.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
    try {
        await app.listen({ port: 300, host: '0.0.0.0' });
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();