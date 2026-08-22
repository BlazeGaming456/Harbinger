import redis from '../db/redis.js';

const FAILURE_THRESHOLD = 5;
const COOLDOWN_SECONDS = 300; //5 mins

export async function isCircuitOpen(endPointId) {
    const state = await redis.get(`circuit:${endpointId}`);
    return state === 'open';
}

export async function recordResult(endpointId, success) {
    const key = `failures:${endpointId}`;
    if (success) {
        await redis.del(key);
        await redis.del(`circuit:${endpointId}`);
        return;
    }
    
    const failures = await redis.incr(key);
    if (failures >= FAILURE_THRESHOLD) {
        await redis.set(`circuit:${endpointId}`, 'open', 'EX', COOLDOWN_SECONDS);
    }
}