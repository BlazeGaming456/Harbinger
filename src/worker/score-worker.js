import { Worker } from "bullmq";
import pool from "../db/pool.js";
import redis from "../db/redis.js";
import { alertQueue } from "../queues/index.js";
import pino from "pino";
import * as Sentry from "@sentry/node";
import client from "prom-client";

// ---------------
//Metrics - Example
//If we create a server for scoreWorker, then the metrics will appear at /metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const incidentOpened = new client.Counter({
  name: "incidents_opened_total",
  help: "Total incidents opened",
});
register.registerMetric(incidentOpened);

// ---------------

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});

const logger = pino();

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
};

function computeScore({ p95_latency, error_rate, timeout_rate, baseline_p95 }) {
  const latencyScore = Math.min(p95_latency / (baseline_p95 * 3), 1);
  const score = latencyScore * 0.3 + error_rate * 0.4 + timeout_rate * 0.3;
  return Math.min(score, 1);
}

function percentile(values, p) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(p * sorted.length) - 1;

  return sorted[Math.max(0, index)];
}

function aggregateWindow(probes) {
  if (probes.length === 0) {
    return {
      p95_latency: 0,
      error_rate: 0,
      timeout_rate: 0,
    };
  }

  const latencies = probes.map((p) => p.response_time_ms).filter(Boolean);

  const p95 = percentile(latencies, 0.95);

  const errorRate =
    probes.filter((p) => p.status_code >= 400 || !p.status_code).length /
    probes.length;

  const timeoutRate = probes.filter((p) => p.is_timeout).length / probes.length;

  return {
    p95_latency: p95,
    error_rate: errorRate,
    timeout_rate: timeoutRate,
  };
}

const scoreWorker = new Worker(
  "score",
  async (job) => {
    const { endpointId, traceId } = job.data;

    const jobLogger = logger.child({
      jobId: job.id,
      endpointId,
      traceId,
    });

    jobLogger.info("Starting score calculation");
    const { rows } = await pool.query(
      `SELECT *
        FROM probe_results
        WHERE endpoint_id = $1
        ORDER BY probed_at DESC
        LIMIT 40`,
      [endpointId],
    );

    if (rows.length === 0) {
      jobLogger.info("No probes recorded yet");
      return;
    }

    const recentProbes = rows.slice(0, Math.min(20, rows.length));
    const priorProbes =
      rows.length >= 40
        ? rows.slice(20, 40)
        : rows.length > 20
          ? rows.slice(20, rows.length)
          : [];

    const recentAgg = aggregateWindow(recentProbes);
    const priorAgg =
      priorProbes.length > 0 ? aggregateWindow(priorProbes) : recentAgg;

    const recentScore = computeScore({ ...recentAgg, baseline_p95: 500 });
    const priorScore = computeScore({ ...priorAgg, baseline_p95: 500 });

    const trend = rows.length >= 40 ? recentScore - priorScore : 0;

    const TREND_THRESHOLD = 0.15;

    const isWorsening = trend > TREND_THRESHOLD;
    const isAlreadyIncident = recentScore > 0.7;

    const endpointResult = await pool.query(
      `SELECT user_id FROM endpoints WHERE id = $1`,
      [endpointId],
    );

    if (!endpointResult.rows[0]) {
      throw new Error(`Endpoint ${endpointId} not found`);
    }

    const userId = endpointResult.rows[0].user_id;

    await pool.query(
      `INSERT INTO endpoint_scores (endpoint_id, score, p95_latency_ms, error_rate, timeout_rate, computed_at)
        VALUES ($1, $2, $3, $4, $5, now())
        ON CONFLICT (endpoint_id) DO UPDATE
        SET score = $2, p95_latency_ms = $3, error_rate = $4, timeout_rate = $5, computed_at = now()`,
      [
        endpointId,
        recentScore,
        Math.round(recentAgg.p95_latency),
        recentAgg.error_rate,
        recentAgg.timeout_rate,
      ],
    );

    await redis.set(
      `health:${endpointId}`,
      JSON.stringify({ score: recentScore, trend, computed_at: new Date() }),
      "EX",
      120,
    );

    //Publish to Websocket
    await redis.publish(
      "score-updates",
      JSON.stringify({
        userId,
        endpointId,
        score: recentScore,
        p95_latency_ms: recentAgg.p95_latency,
        error_rate: recentAgg.error_rate,
        timeout_rate: recentAgg.timeout_rate,
        trend,
      }),
    );

    jobLogger.info(
      { recentScore, priorScore, trend, probeCount: rows.length },
      "Score calculation complete",
    );

    if (recentScore > 0.7) {
      const existing = await pool.query(
        `SELECT id, alert_id, opened_at, reminder_sent
             FROM incidents
             WHERE endpoint_id = $1 AND incident_type = 'degradation' AND resolved_at IS NULL
             LIMIT 1`,
        [endpointId],
      );

      if (!existing.rows[0]) {
        const incident = await pool.query(
          `INSERT INTO incidents (endpoint_id) VALUES ($1) RETURNING id, alert_id`,
          [endpointId],
        );
        incidentOpened.inc();
        await alertQueue.add("alert", {
          incidentId: incident.rows[0].id,
          alertId: incident.rows[0].alert_id,
          endpointId,
          traceId,
        });
        jobLogger.info("Alert job created");
      } else if (
        !existing.rows[0].reminder_sent &&
        Date.now() - new Date(existing.rows[0].opened_at).getTime() >=
          24 * 60 * 60 * 1000
      ) {
        await alertQueue.add("alert", {
          incidentId: existing.rows[0].id,
          alertId: existing.rows[0].alert_id,
          endpointId,
          traceId,
          alertKind: "degradation_reminder",
          recentScore,
          priorScore,
          trend,
        });
        jobLogger.info("24-hour degradation reminder job created");
      }
    } else {
      // Endpoint recovered below incident threshold - resolve active incidents
      await pool.query(
        `UPDATE incidents SET resolved_at = now()
            WHERE endpoint_id = $1 AND resolved_at IS NULL`,
        [endpointId],
      );
    }

    if (isWorsening && !isAlreadyIncident) {
      await pool.query(
        `INSERT INTO incidents (endpoint_id, incident_type)
            VALUES ($1, 'early_warning')
            ON CONFLICT DO NOTHING`,
        [endpointId],
      );

      await alertQueue.add("alert", {
        endpointId,
        incidentType: "early_warning",
        recentScore,
        priorScore,
        trend,
      });
    }

    if (!isWorsening) {
      await pool.query(
        `UPDATE incidents SET resolved_at = now()
            WHERE endpoint_id = $1 AND incident_type = 'early_warning' AND resolved_at IS NULL`,
        [endpointId],
      );
    }
  },
  { connection },
);

scoreWorker.on("completed", (job) => console.log(`Job ${job.id} done`));
scoreWorker.on("failed", (job, err) =>
  Sentry.captureException(err, {
    extra: { jobId: job.id, endpointId: job.data.endpointId },
  }),
);

//Shutting down gracefully
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await scoreWorker.close();
  await pool.end();
  await redis.quit();
  process.exit(0);
});

console.log("Score worker running");
