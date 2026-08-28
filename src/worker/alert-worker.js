import { Worker } from 'bullmq';
import pool from '../db/pool.js';
import pino from 'pino';
import * as Sentry from '@sentry/node';
import { CHANNELS } from './alertChannel.js';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
});

const logger = pino();

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};

const alertWorker = new Worker('alert', async (job) => {
    const { incidentId, alertId, endpointId, traceId } = job.data;

    const jobLogger = logger.child({ jobId: job.id, incidentId, alertId, endpointId, traceId });
    jobLogger.info('Starting alert delivery');

    const check = await pool.query(
        `SELECT alert_sent FROM incidents WHERE id = $1`,
        [incidentId]
    );

    if (!check.rows[0]) {
        throw new Error(`Incident ${incidentId} not found`);
    }

    if (check.rows[0].alert_sent) {
        jobLogger.info('Alert already sent, skipping');
        return;
    }

    const userResult = await pool.query(
        `SELECT u.email, u.alert_channel, u.alert_target, e.url AS endpoint_url
         FROM incidents i
         JOIN endpoints e ON e.id = i.endpoint_id
         JOIN users u ON u.id = e.user_id
         WHERE i.id = $1`,
        [incidentId]
    );

    if (!userResult.rows[0]) {
        throw new Error(`Could not find user/endpoint for incident ${incidentId}`);
    }

    const { email, alert_channel, alert_target, endpoint_url } = userResult.rows[0];
    const channel = alert_channel || 'email';
    const target = alert_target || email;

    const deliver = CHANNELS[channel];
    if (!deliver) {
        throw new Error(`Unknown alert channel: ${channel}`);
    }

    if (!target) {
        throw new Error(`No alert target configured for user ${email}`);
    }

    const payload = {
        alert_id: alertId,
        incident_id: incidentId,
        endpoint_id: endpointId,
        endpoint_url,
        message: `Endpoint ${endpoint_url} is degraded (health score exceeded threshold). Check your Harbinger dashboard for details.`,
        timestamp: new Date().toISOString(),
    };

    await deliver(target, payload);

    await pool.query(`UPDATE incidents SET alert_sent = true WHERE id = $1`, [incidentId]);
    jobLogger.info({ channel, target }, 'Alert delivered successfully');
}, { connection });

alertWorker.on('completed', (job) => console.log(`Alert job ${job.id} delivered`));
alertWorker.on('failed', (job, err) => Sentry.captureException(err, { extra: { jobId: job?.id, endpointId: job?.data?.endpointId } }));

process.on('SIGTERM', async () => {
    await alertWorker.close();
    await pool.end();
    process.exit(0);
});

console.log('Alert worker running');
