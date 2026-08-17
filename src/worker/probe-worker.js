import { Worker } from 'bullmq';
import pool from '../db/pool.js';
import { scoreQueue } from '../queues/index.js';

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
    const result = await probeUrl(url);

    await pool.query(
        `INSERT INTO probe_results (endpoint_id, status_code, response_time_ms, is_timeout, error_type) VALUES ($1, $2, $3, $4, $5)`,
        [endpointId, result.status_code, result.response_time_ms, result.is_timeout, result.error_type]
    )

    await scoreQueue.add('score', { endpointId });
}, { connection });

probeWorker.on('completed', (job) => console.log(`Job ${job.id} done`));
probeWorker.on('failed', (job, err) => console.error(`Job ${job.id} failed`, err));

console.log('Probe worker running!');