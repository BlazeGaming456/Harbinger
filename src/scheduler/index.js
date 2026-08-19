import pool from '../db/pool.js';
import { probeQueue } from '../queues/index.js';
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1
});

const POLL_INTERVAL_MS = 5000; //Check every 5 seconds

async function scheduleTick() {
    const result = await pool.query(
        `SELECT id, url from endpoints
        WHERE is_active = true AND next_probe_at <= now()`
    );

    for (const endpoint of result.rows) {
        await probeQueue.add('probe', { endpointId: endpoint.id, url: endpoint.url });

        await pool.query(
            `UPDATE endpoints
            SET next_probe_at = now() + (interval_seconds || ' seconds')::interval
            WHERE id = $1`,
            [endpoint.id]
        );
    }

    if (result.rows.length > 0) {
        console.log(`Enqueued ${result.rows.length} probe jobs`);
    }
}

setInterval(() => {
    scheduleTick().catch(err => {
        Sentry.captureException(err);
        console.error('Scheduler error: ', err);
    })
}, POLL_INTERVAL_MS);
console.log('Scheduler running, polling every', POLL_INTERVAL_MS, 'ms');