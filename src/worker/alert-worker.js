import { Worker } from 'bullmq';
import pool from '../db/pool.js';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};

const alertWorker = new Worker('alert', async (job) => {
    const { incidentId, alertId, endpointId } = job.data;
    
    const check = await pool.query(
        `SELECT alert_sent FROM incidents where id = $1`,
        [incidentId]
    );

    if (check.rows[0]?.alert_sent) {
        console.log(`Alert ${alert_id} already sent, skipping`);
        return;
    }

    const userResult = await pool.query(
        `SELECT u.webhook_url, e.url AS endpoint_url
        FROM incidents i
        JOIN endpoints e on e.id = i.endpoint_id
        JOIN users u on u.id = e.user_id
        WHERE i.id = $1`,
        [incidentId]
    );
    const { webhook_url, endpoint_url } = userResult.rows[0];

    if (!webhook_url) {
        console.log(`No webhook configured for incident ${incidentId}, skipping`);
        return;
    }

    const response = await fetch(webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            alert_id: alertId,
            incident_id: incidentId,
            endpoint_url,
            message: `Endpoint ${endpoint_url} is degraded`,
            timestamp: new Date().toISOString(),
        }),
    });

    if (!response.ok) {
        throw new Error(`Webhook delivery failed with status ${response.status}`);
    }

    await pool.query(`UPDATE incidents SET alert_sent = true WHERE id = $1`,
        [incidentId]
    );
}, { connection });

alertWorker.on('complete', (job) => console.log(`Alert ${job.id} delivered`));
alertWorker.on('failed', (job) => console.error(`Alert ${job.id} failed, err`));

console.log('Alert worker running');