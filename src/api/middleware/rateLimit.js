import redis from '../db/redis.js';

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 200;

export function rateLimit(keyPrefix) {
    return async function (req, reply) {
        const identifier = req.userId || req.ip;
        const key = `ratelimit:${keyPrefix}:${identifier}`;
        const now = Date.now();
        const windowStart = now - WINDOW_MS;

        try {
            await redis.zremrangebyscore(key, 0, windowStart);
            const count = await redis.zcard(key);

            if (count >= MAX_REQUESTS) {
                return reply.code(429).send({ error: 'rate limit exceeded, try again shortly ' });
            }

            await redis.zadd(key, now, `${now}-${Math.random()}`);
            await redis.expire(key, Math.ceil(WINDOW_MS / 1000));
        } catch (error) {
            req.log.warn({ err: error }, "Rate limiter unavailable; allowing request");
        }
    };
}