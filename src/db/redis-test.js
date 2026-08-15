import redis from './redis.js';

await redis.set('ping','pong');
console.log(await redis.get('ping'));
process.exit(0);