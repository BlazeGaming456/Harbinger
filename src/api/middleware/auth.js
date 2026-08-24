import jwt from 'jsonwebtoken';

export async function requireAuth(req, reply) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Missing token' });
    }

    const token = authHeader.slice(7);;
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.userId;
    }
    catch {
        return reply.code(401).send({ error: 'Invalid or expired token' })
    }
}