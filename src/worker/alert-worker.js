import { Worker } from 'bullmq';
import pool from '../db/pool.js';
import pino from 'pino';
import * as Sentry from '@sentry/node';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1
})

const logger = pino();

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};

function shouldSendAlert(incident) {
    return !incident.alertSent;
}

const alertWorker = new Worker('alert', async (job) => {
    const { incidentId, alertId, endpointId, traceId } = job.data;
    
    const jobLogger = logger.child({
        jobId: job.id,
        incidentId,
        alertId,
        endpointId,
        traceId
    })

    jobLogger.info('Starting alert delivery')

    const check = await pool.query(
        `SELECT alert_sent FROM incidents where id = $1`,
        [incidentId]
    );

    if (check.rows.length === 0) {
        throw new Error(
            `Incident ${incidentId} not found`
        );
    }

    if (check.rows[0].alert_sent) {
        console.log(`Alert ${alertId} already sent, skipping`);
        return;
    }

    const userResult = await pool.query(
        `SELECT
            u.email,
            u.alert_channel,
            u.alert_target,
            e.url as endpoint_url
        from incidents i
        JOIN endpoints e
            on e.id = i.endpoint_id
        JOIN users u
            on u.id = e.user_id
        where i.id = &1`
        [incidentId]
    );

    if (userResult.rows.length === 0) {
        throw new Error(
            `Could not finf user/endpoint for incident ${incidentId}`
        );
    }

    const deliver = CHANNELS[alert_channel];

    if (!deliver) {
        throw new Error(
            `Unknown alert channel: ${alert_channel}`
        );
    }

    if (!alert_target) {
        throw new Error(
            `No alert target configured for user ${email}`
        );
    }

    //Create common payload
    const payload = {
        alert_id: alertId,
        incident_id: incidentId,
        endpoint_id: endpointId,
        endpoint_url,
        message: `Endpoint ${endpoint_url} is degraded`,
        timestamp: new Date().toISOString(),
    };

    await deliver(alert_target, payload);

    // const { webhook_url, endpoint_url } = userResult.rows[0];

    // if (!webhook_url) {
    //     console.log(`No webhook configured for incident ${incidentId}, skipping`);
    //     return;
    // }

    // const response = await fetch(webhook_url, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //         alert_id: alertId,
    //         incident_id: incidentId,
    //         endpoint_url,
    //         message: `Endpoint ${endpoint_url} is degraded`,
    //         timestamp: new Date().toISOString(),
    //     }),
    // });

    // if (!response.ok) {
    //     throw new Error(`Webhook delivery failed with status ${response.status}`);
    // }

    await pool.query(`UPDATE incidents SET alert_sent = true WHERE id = $1`,
        [incidentId]
    );

    jobLogger.info('Alert delivered successfully');
}, { connection });

alertWorker.on('complete', (job) => console.log(`Alert ${job.id} delivered`));
alertWorker.on('failed', (job, err) => Sentry.captureException(err, { extra: { jobId: job.id, endpointId: job.data.endpointId }}));

//Shutting down gracefully
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await alertWorker.close();
    await pool.end();
    process.exit(0);
})

console.log('Alert worker running');