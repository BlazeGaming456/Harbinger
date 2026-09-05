import { Queue } from "bullmq";
import redis from "../db/redis.js";

export const probeQueue = new Queue("probe", { connection: redis });
export const scoreQueue = new Queue("score", { connection: redis });
export const alertQueue = new Queue("alert", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  }
});
