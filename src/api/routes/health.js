import redis from '../../db/redis.js';
import pool from '../../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export async function healthRoutes(app) {
    app.get('/health/:endpointId', { preHandler: requireAuth }, async (req, reply) => {
        const { endpointId } = req.params;

        const owns = await pool.query(
            `SELECT id from endpoints WHERE id = $1 AND user_id = $2`,
            [endpointId, req.userId]
        );
        if (!owns.rows[0]) return reply.code(404).send({ error: 'Not found'});

        //Cache aside: try Redis first
        const cached = await redis.get(`health:${endpointId}`);
        if (cached) {
            return { ...JSON.parse(cached), source: 'cache' };
        }

        //Cache miss- fall back to Postgres
        const result = await pool.query(
            `SELECT score, p95_latency_ms, error_rate, timeout_rate, computed_at FROM endpoint_scores WHERE endpoint_id = $1`,
            [endpointId]
        );
        if (!result.rows[0]) {
            return { score: null, message: 'No data yet', source: 'db'};
        }

        //Populate cache for next read
        await redis.set(`health:${endpointId}`, JSON.stringify(result.rows[0]), 'EX', 120);

        return { ...result.rows[0], source: 'db' };
    });
}