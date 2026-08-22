export async function userRoutes(app) {
    app.delete('/users/me', { preHandler: requireAuth }, async (req, reply) => {
        await pool.query(`DELETE FROM users WHERE id = $1`,
            [req.userId]
        );
        reply.clearCookie('refresh_token');
        return reply.code(204).send();
    });
}