import redis from '../db/redis.js';

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 200;

export function rateLimit(keyPrefix) {
    return async function (req, reply) {
        const identifier = req.userId || req.ip;
        const key = `ratelimit:${keyPrefix}:${identifier}`;
        const now = Date.now();
        const windowStart = now - WINDOW_MS;

        //1. Drop anything outside the current window
        await redis.zremrangebyscore(key, 0, windowStart);

        //2. Count what's left inside the window
        const count = await redis.zcard(key);

        if (count >= MAX_REQUESTS) {
            return reply.code(429).send({ error: 'rate limit exceeded, try again shortly ' });
        }

        //3. Record this request - member must be unique, so timestamp + random suffix
        await redis.zadd(key, now, `${now}-${Math.random()}`);

        //4. Let the key expire on its own if the user goes quiet, so Redis doesn't fill up forever
        await redis.expire(key, Math.ceil(WINDOW_MS / 1000));
    };
}