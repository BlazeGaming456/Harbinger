import pool from '../../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export async function userRoutes(app) {
    app.get('/users/me', { preHandler: requireAuth }, async (req, reply) => {
        const result = await pool.query(`SELECT id, email, alert_channel, alert_target, created_at FROM users WHERE id = $1`, [req.userId]);
        if (!result.rows[0]) return reply.code(404).send({ error: 'User not found' });
        return result.rows[0];
    });

    app.delete('/users/me', { preHandler: requireAuth }, async (req, reply) => {
        await pool.query(`DELETE FROM users WHERE id = $1`,
            [req.userId]
        );
        reply.clearCookie('refreshToken');
        return reply.code(204).send();
    });
}