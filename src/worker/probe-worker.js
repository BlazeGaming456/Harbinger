import { Worker } from 'bullmq';
import pool from '../db/pool.js';
import { scoreQueue } from '../queues/index.js';
import pino from 'pino';
import * as Sentry from '@sentry/node';
import { isCircuitOpen, recordResult } from './circuitBreaker.js';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1
})

const logger = pino();

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};

async function probeUrl(url, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        return {
            status_code: response.status,
            response_time_ms: Date.now() - start,
            is_timeout: false,
            error_type: null,
        };
    }
    catch (err) {
        clearTimeout(timeout);
        const response_time_ms = Date.now() - start;

        if (err.name === 'AbortError') {
            return { status_code: null, response_time_ms, is_timeout: true, error_type: 'timeout'};
        }
        if (err.code === 'ENOTFOUND') {
            return { status_code: null, response_time_ms, is_timeout: false, error_type: 'dns_failure'};
        }
        if (err.code === 'ECONNREFUSED') {
            return { status_code: null, response_time_ms, is_timeout: false, error_type: 'connection_refused' };
        }
        
        return {status_code: null, response_time_ms, is_timeout: false, error_type: 'unknown'}
    }
}

const probeWorker = new Worker('probe', async (job) => {
    const { endpointId, url } = job.data;
    
    //Circuit breaker
    if (await isCircuitOpen(endpointId)) {
        console.log(`Circuit open for ${endpointId}, skipping real probe`);
        return;
    }
    
    const jobLogger = logger.child({ jobId: job.id, endpointId});
    
    jobLogger.info({ url }, 'Starting probe');
    const result = await probeUrl(url);
    jobLogger.info({ result }, 'Probe complete');

    //Record for circuit breaker
    await recordResult(endpointId, result.status_code != null && result.status_code < 500);

    await pool.query(
        `INSERT INTO probe_results (endpoint_id, status_code, response_time_ms, is_timeout, error_type) VALUES ($1, $2, $3, $4, $5)`,
        [endpointId, result.status_code, result.response_time_ms, result.is_timeout, result.error_type]
    );

    await scoreQueue.add('score', { endpointId, traceId: job.id });
}, { connection });

probeWorker.on('completed', (job) => console.log(`Job ${job.id} done`));
probeWorker.on('failed', (job, err) => Sentry.captureException(err, { extra: { jobId: job.id, endpointId: job.data.endpointId }}));

//Shutting down gracefully
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await probeWorker.close();
    await pool.end();
    process.exit(0);
})

console.log('Probe worker running!');