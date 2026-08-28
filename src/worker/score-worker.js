import { Worker } from 'bullmq';
import pool from '../db/pool.js';
import redis from '../db/redis.js';
import { alertQueue } from '../queues/index.js';
import pino from 'pino';
import * as Sentry from '@sentry/node';
import client from 'prom-client';

// ---------------
//Metrics - Example
//If we create a server for scoreWorker, then the metrics will appear at /metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const incidentOpened = new client.Counter({ name: 'incidents_opened_total', help: 'Total incidents opened'});
register.registerMetric(incidentOpened);

// ---------------

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1
})

const logger = pino();

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};

function computeScore({ p95_latency, error_rate, timeout_rate, baseline_p95 }) {
    const latencyScore = Math.min(p95_latency/(baseline_p95*3), 1);
    const score = (latencyScore*0.3) + (error_rate*0.4) + (timeout_rate*0.3);
    return Math.min(score, 1);
}

const scoreWorker = new Worker('score', async (job) => {
    const { endpointId, traceId } = job.data;

    const jobLogger = logger.child({
        jobId: job.id,
        endpointId,
        traceId
    })

    jobLogger.info('Starting score calculation');
    const { rows } = await pool.query(
        `SELECT
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_latency,
            COUNT(*) FILTER (WHERE status_code >= 400 or status_code IS NULL)*1.0/COUNT(*) AS error_rate,
            COUNT(*) FILTER (WHERE is_timeout = true)*1.0/COUNT(*) AS timeout_rate
        FROM (
            SELECT * FROM probe_results
            WHERE endpoint_id = $1
            ORDER BY probed_at DESC
            LIMIT 20
        ) recent`,
         [endpointId]
    );

    const { p95_latency, error_rate, timeout_rate } = rows[0];

    const score = computeScore({ p95_latency: Number(p95_latency), error_rate: Number(error_rate), timeout_rate: Number(timeout_rate), baseline_p95: 500 });

    await pool.query(
        `INSERT INTO endpoint_scores (endpoint_id, score, p95_latency_ms, error_rate, timeout_rate, computed_at)
        VALUES ($1, $2, $3, $4, $5, now())
        ON CONFLICT (endpoint_id) DO UPDATE
        SET score = $2, p95_latency_ms = $3, error_rate = $4, timeout_rate = $5, computed_at = now()`,
        [endpointId, score, p95_latency, error_rate, timeout_rate]
    );

    await redis.set(`health:${endpointId}`, JSON.stringify({ score, computed_at: new Date() }), 'EX', 120);

    jobLogger.info({ score }, 'Score calculation complete');

    if (score > 0.7) {
        const existing = await pool.query(
            `SELECT id FROM incidents WHERE endpoint_id = $1 AND resolved_at IS NULL LIMIT 1`,
            [endpointId]
        );

        if (!existing.rows[0]) {
            const incident = await pool.query(
                `INSERT INTO incidents (endpoint_id) VALUES ($1) RETURNING id, alert_id`,
                [endpointId]
            );
            incidentOpened.inc();
            await alertQueue.add('alert', {
                incidentId: incident.rows[0].id,
                alertId: incident.rows[0].alert_id,
                endpointId,
                traceId,
            });
            jobLogger.info('Alert job created');
        }
    }
}, { connection });

scoreWorker.on('completed', (job) => console.log(`Job ${job.id} done`));
scoreWorker.on('failed', (job, err) => Sentry.captureException(err, { extra: { jobId: job.id, endpointId: job.data.endpointId }}));

//Shutting down gracefully
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await scoreWorker.close();
    await pool.end();
    await redis.quit();
    process.exit(0);
})

console.log('Score worker running');