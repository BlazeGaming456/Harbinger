import pool from '../../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export async function userRoutes(app) {
    app.delete('/users/me', { preHandler: requireAuth }, async (req, reply) => {
        await pool.query(`DELETE FROM users WHERE id = $1`,
            [req.userId]
        );
        reply.clearCookie('refreshToken');
        return reply.code(204).send();
    });
}