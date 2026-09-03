import pool from '../../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

function normalizeEndpoint(row) {
    return {
        ...row,
        score: row.score != null ? Number(row.score) : null,
    };
}

const createEndpointSchema = {
    body: {
        type: 'object',
        required: ['url'],
        properties: {
            url: { type: 'string', format: 'url' },
            name: { type: 'string', maxLength: 100 },
            interval_seconds: { type: 'integer', minimum: 10, maximum: 86400 },
        },
    },
};

export async function endpointRoutes(app) {
    app.post('/endpoints', { schema: createEndpointSchema, preHandler: [requireAuth, rateLimit('endpoint')] }, async (req, reply) => {
        const { url, name, interval_seconds } = req.body;
        const result = await pool.query(
            `INSERT INTO endpoints (user_id, url, name, interval_seconds, next_probe_at) VALUES ($1, $2, $3, $4, now()) RETURNING *`,
            [req.userId, url, name || null, interval_seconds || 60]
        );

        return reply.code(201).send(result.rows[0]);
    });

    app.patch('/endpoints/:id', { preHandler: [requireAuth, rateLimit('endpoint')] }, async (req, reply) => {
        const { url, name, interval_seconds, is_active } = req.body;
        const result = await pool.query(
            `UPDATE endpoints SET url = COALESCE($1, url), name = COALESCE($2, name), interval_seconds = COALESCE($3, interval_seconds), is_active = COALESCE($4, is_active) where id = $5 and user_id = $6 RETURNING *`,
            [url, name, interval_seconds, is_active, req.params.id, req.userId]
        );
        if (!result.rows[0]) return reply.code(404).send({ error: 'Not found' });
        return result.rows[0];
    });

    app.delete('/endpoints/:id', { preHandler: [requireAuth, rateLimit('endpoint')] }, async (req, reply) => {
        const result = await pool.query(
            `DELETE FROM endpoints WHERE id = $1 and user_id = $2 RETURNING id`,
            [req.params.id, req.userId]
        );

        if (!result.rows[0]) return reply.code(404).send({ error: 'Not found' });
        return reply.code(204).send();
    });

    app.get('/endpoints', { preHandler: [requireAuth, rateLimit('endpoint')] }, async (req, reply) => {
        const { cursor, limit = 20 } = req.query;
        const capped = Math.min(Number(limit), 50);

        let result;
        if (cursor) {
            result = await pool.query(
                `SELECT e.*, es.score
                FROM endpoints e
                LEFT JOIN endpoint_scores es ON es.endpoint_id = e.id
                WHERE e.user_id = $1 and e.created_at < $2
                ORDER BY e.created_at DESC
                LIMIT $3`,
                [req.userId, cursor, capped]
            );
        }
        else {
            result = await pool.query(
                `SELECT e.*, es.score
                FROM endpoints e
                LEFT JOIN endpoint_scores es ON es.endpoint_id = e.id
                WHERE e.user_id = $1
                ORDER BY e.created_at DESC
                LIMIT $2`,
                [req.userId, capped]
            );
        }

        const rows = result.rows.map(normalizeEndpoint);
        const nextCursor = rows.length === capped ? rows[rows.length - 1].created_at : null;

        return { data: rows, nextCursor };
    });

    app.get('/endpoints/:id/probes', { preHandler: requireAuth }, async (req, reply) => {
        const result = await pool.query(
            `SELECT pr .* FROM probe_results pr
            JOIN endpoints e ON e.id = pr.endpoint_id
            WHERE pr.endpoint_id = $1 AND e.user_id = $2
            ORDER BY pr.probed_at DESC LIMIT 50`,
            [req.params.id, req.userId]
        );
        return result.rows.reverse();
    });

    app.get('/endpoints/:id', { preHandler: requireAuth }, async (req, reply) => {
        const result = await pool.query(
            `SELECT e.*, es.score
             FROM endpoints e
             LEFT JOIN endpoint_scores es ON es.endpoint_id = e.id
             WHERE e.id = $1 AND e.user_id = $2`,
            [req.params.id, req.userId]
        );
        if (!result.rows[0]) return reply.code(404).send({ error: 'Not found' });
        return normalizeEndpoint(result.rows[0]);
    });
}