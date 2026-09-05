import { Queue } from "bullmq";

const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
    };

export const probeQueue = new Queue("probe", { connection });
export const scoreQueue = new Queue("score", { connection });
export const alertQueue = new Queue("alert", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  }
});
