import { Worker } from "bullmq";
import pool from "../db/pool.js";
import pino from "pino";
import * as Sentry from "@sentry/node";
import { CHANNELS } from "./alertChannel.js";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sampleRate: Number(process.env.SENTRY_ERROR_SAMPLE_RATE || 0.2),
  tracesSampleRate: 0.1,
});

const logger = pino();

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
};

const alertWorker = new Worker(
  "alert",
  async (job) => {
    const {
      incidentId,
      alertId,
      endpointId,
      traceId,
      incidentType,
      alertKind,
      recentScore,
      priorScore,
      trend,
    } = job.data;

    const jobLogger = logger.child({
      jobId: job.id,
      incidentId,
      alertId,
      endpointId,
      traceId,
      incidentType,
    });
    jobLogger.info("Starting alert delivery");

    const check = await pool.query(
      `SELECT alert_sent, reminder_sent, incident_type, resolved_at FROM incidents WHERE id = $1`,
      [incidentId],
    );

    if (!check.rows[0]) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const incident = check.rows[0];
    const dbIncidentType = incident.incident_type;

    if (incident.resolved_at) {
      jobLogger.info("Incident has recovered, skipping alert");
      return;
    }

    if (alertKind === "degradation_reminder" && incident.reminder_sent) {
      jobLogger.info("Degradation reminder already sent, skipping");
      return;
    }

    if (alertKind !== "degradation_reminder" && incident.alert_sent) {
      jobLogger.info("Alert already sent, skipping");
      return;
    }

    const userResult = await pool.query(
      `SELECT u.email, u.alert_channel, u.alert_target, u.webhook_url, e.url AS endpoint_url
         FROM incidents i
         JOIN endpoints e ON e.id = i.endpoint_id
         JOIN users u ON u.id = e.user_id
         WHERE i.id = $1`,
      [incidentId],
    );

    if (!userResult.rows[0]) {
      throw new Error(
        `Could not find user/endpoint for incident ${incidentId}`,
      );
    }

    const { email, alert_channel, alert_target, webhook_url, endpoint_url } =
      userResult.rows[0];
    const channelStr = alert_channel || "email";
    const activeChannels = channelStr
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    const safePrior =
      typeof priorScore === "number" ? priorScore.toFixed(2) : "0.00";
    const safeRecent =
      typeof recentScore === "number" ? recentScore.toFixed(2) : "0.00";

    const message =
      alertKind === "degradation_reminder"
        ? `Endpoint ${endpoint_url} has remained degraded for 24 hours (current health score: ${safeRecent}). Check your Harbinger dashboard for details.`
        : dbIncidentType === "early_warning"
          ? `Endpoint ${endpoint_url} is trending towards degradation (score moved from ${safePrior} to ${safeRecent}). Check your Harbinger dashboard for details.`
          : `Endpoint ${endpoint_url} is degraded (health score exceeded threshold). Check your Harbinger dashboard for details.`;

    const payload = {
      alert_id: alertId,
      incident_id: incidentId,
      endpoint_id: endpointId,
      endpoint_url,
      incident_type: dbIncidentType,
      alert_kind: alertKind || dbIncidentType,
      recent_score: recentScore ?? 0,
      prior_score: priorScore ?? 0,
      trend,
      message,
      timestamp: new Date().toISOString(),
    };

    let deliveredCount = 0;

    if (activeChannels.includes("email") || activeChannels.includes("all")) {
      const targetEmail = alert_target || email;
      if (targetEmail) {
        try {
          await CHANNELS.email(targetEmail, payload);
          deliveredCount++;
        } catch (err) {
          jobLogger.error(
            { err: err.message },
            "Failed to deliver email alert",
          );
        }
      }
    }

    if (
      activeChannels.includes("webhook") ||
      activeChannels.includes("slack") ||
      activeChannels.includes("all")
    ) {
      const targetWebhook = webhook_url || alert_target;
      if (targetWebhook && targetWebhook.startsWith("http")) {
        try {
          await CHANNELS.webhook(targetWebhook, payload);
          deliveredCount++;
        } catch (err) {
          jobLogger.error(
            { err: err.message },
            "Failed to deliver webhook alert",
          );
        }
      }
    }

    if (deliveredCount > 0) {
      const column =
        alertKind === "degradation_reminder" ? "reminder_sent" : "alert_sent";
      await pool.query(`UPDATE incidents SET ${column} = true WHERE id = $1`, [
        incidentId,
      ]);
    }
    jobLogger.info(
      { activeChannels, deliveredCount },
      "Alert delivery completed",
    );
  },
  { connection },
);

alertWorker.on("completed", (job) =>
  console.log(`Alert job ${job.id} delivered`),
);
alertWorker.on("failed", (job, err) =>
  Sentry.captureException(err, {
    extra: { jobId: job?.id, endpointId: job?.data?.endpointId },
  }),
);

process.on("SIGTERM", async () => {
  await alertWorker.close();
  await pool.end();
  process.exit(0);
});

console.log("Alert worker running");
