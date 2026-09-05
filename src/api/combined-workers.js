import { Worker } from 'bullmq';
import pool from './db/pool.js';
import redis from './db/redis.js';
import { scoreQueue, alertQueue } from './queues/index.js';
import { CHANNELS } from './worker/alertChannel.js';
import { isCircuitOpen, recordResult } from './worker/circuitBreaker.js';

const connection = redis;
const logger = (message, data = {}) => console.log(message, data);

async function probeUrl(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const response = await fetch(url, { signal: controller.signal });
    return { status_code: response.status, response_time_ms: Date.now() - start, is_timeout: false, error_type: null };
  } catch (error) {
    const errorType = error.name === 'AbortError' ? 'timeout' : error.code === 'ENOTFOUND' ? 'dns_failure' : error.code === 'ECONNREFUSED' ? 'connection_refused' : 'unknown';
    return { status_code: null, response_time_ms: Date.now() - start, is_timeout: errorType === 'timeout', error_type: errorType };
  } finally {
    clearTimeout(timeout);
  }
}

new Worker('probe', async (job) => {
  const { endpointId, url } = job.data;
  if (await isCircuitOpen(endpointId)) return;
  const result = await probeUrl(url);
  await recordResult(endpointId, result.status_code != null && result.status_code < 500);
  await pool.query('INSERT INTO probe_results (endpoint_id, status_code, response_time_ms, is_timeout, error_type) VALUES ($1, $2, $3, $4, $5)', [endpointId, result.status_code, result.response_time_ms, result.is_timeout, result.error_type]);
  await scoreQueue.add('score', { endpointId, traceId: job.id });
}, { connection });

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}

function aggregate(probes) {
  if (!probes.length) return { p95: 0, errors: 0, timeouts: 0 };
  const latencies = probes.map((probe) => probe.response_time_ms).filter(Boolean);
  return {
    p95: percentile(latencies, 0.95),
    errors: probes.filter((probe) => probe.status_code >= 400 || !probe.status_code).length / probes.length,
    timeouts: probes.filter((probe) => probe.is_timeout).length / probes.length,
  };
}

function score(metrics) {
  return Math.min(metrics.p95 / 1500 * 0.3 + metrics.errors * 0.4 + metrics.timeouts * 0.3, 1);
}

new Worker('score', async (job) => {
  const { endpointId, traceId } = job.data;
  const { rows } = await pool.query('SELECT * FROM probe_results WHERE endpoint_id = $1 ORDER BY probed_at DESC LIMIT 40', [endpointId]);
  if (!rows.length) return;
  const recent = aggregate(rows.slice(0, 20));
  const prior = aggregate(rows.slice(20));
  const recentScore = score(recent);
  const priorScore = rows.length > 20 ? score(prior) : recentScore;
  const trend = rows.length >= 40 ? recentScore - priorScore : 0;
  const endpoint = await pool.query('SELECT user_id FROM endpoints WHERE id = $1', [endpointId]);
  if (!endpoint.rows[0]) throw new Error(`Endpoint ${endpointId} not found`);
  await pool.query(`INSERT INTO endpoint_scores (endpoint_id, score, p95_latency_ms, error_rate, timeout_rate, computed_at) VALUES ($1, $2, $3, $4, $5, now()) ON CONFLICT (endpoint_id) DO UPDATE SET score = $2, p95_latency_ms = $3, error_rate = $4, timeout_rate = $5, computed_at = now()`, [endpointId, recentScore, Math.round(recent.p95), recent.errors, recent.timeouts]);
  await redis.set(`health:${endpointId}`, JSON.stringify({ score: recentScore, trend, computed_at: new Date() }), 'EX', 120);
  await redis.publish('score-updates', JSON.stringify({ userId: endpoint.rows[0].user_id, endpointId, score: recentScore, p95_latency_ms: recent.p95, error_rate: recent.errors, timeout_rate: recent.timeouts, trend }));

  if (recentScore > 0.7) {
    const existing = await pool.query(`SELECT id, alert_id, opened_at, reminder_sent FROM incidents WHERE endpoint_id = $1 AND incident_type = 'degradation' AND resolved_at IS NULL LIMIT 1`, [endpointId]);
    if (!existing.rows[0]) {
      const incident = await pool.query('INSERT INTO incidents (endpoint_id) VALUES ($1) RETURNING id, alert_id', [endpointId]);
      await alertQueue.add('alert', { incidentId: incident.rows[0].id, alertId: incident.rows[0].alert_id, endpointId, traceId, recentScore, priorScore, trend });
    } else if (!existing.rows[0].reminder_sent && Date.now() - new Date(existing.rows[0].opened_at).getTime() >= 86400000) {
      await alertQueue.add('alert', { incidentId: existing.rows[0].id, alertId: existing.rows[0].alert_id, endpointId, traceId, alertKind: 'degradation_reminder', recentScore, priorScore, trend });
    }
  } else {
    await pool.query('UPDATE incidents SET resolved_at = now() WHERE endpoint_id = $1 AND resolved_at IS NULL', [endpointId]);
  }

  if (trend > 0.15 && recentScore <= 0.7) {
    const earlyWarning = await pool.query(`INSERT INTO incidents (endpoint_id, incident_type) VALUES ($1, 'early_warning') ON CONFLICT DO NOTHING RETURNING id, alert_id`, [endpointId]);
    if (earlyWarning.rows[0]) {
      await alertQueue.add('alert', { incidentId: earlyWarning.rows[0].id, alertId: earlyWarning.rows[0].alert_id, endpointId, traceId, incidentType: 'early_warning', recentScore, priorScore, trend });
    }
  } else if (trend <= 0.15) {
    await pool.query(`UPDATE incidents SET resolved_at = now() WHERE endpoint_id = $1 AND incident_type = 'early_warning' AND resolved_at IS NULL`, [endpointId]);
  }
}, { connection });

new Worker('alert', async (job) => {
  const { incidentId, alertId, endpointId, alertKind, recentScore = 0, priorScore = 0, trend } = job.data;
  const incidentResult = await pool.query('SELECT alert_sent, reminder_sent, incident_type, resolved_at FROM incidents WHERE id = $1', [incidentId]);
  const incident = incidentResult.rows[0];
  if (!incident || incident.resolved_at || (alertKind === 'degradation_reminder' ? incident.reminder_sent : incident.alert_sent)) return;
  const result = await pool.query(`SELECT u.email, u.alert_channel, u.alert_target, u.webhook_url, e.url AS endpoint_url FROM incidents i JOIN endpoints e ON e.id = i.endpoint_id JOIN users u ON u.id = e.user_id WHERE i.id = $1`, [incidentId]);
  const user = result.rows[0];
  if (!user) throw new Error(`Could not find alert target for incident ${incidentId}`);
  const message = alertKind === 'degradation_reminder' ? `Endpoint ${user.endpoint_url} has remained degraded for 24 hours (current health score: ${recentScore.toFixed(2)}). Check your Harbinger dashboard for details.` : `Endpoint ${user.endpoint_url} is degraded (health score exceeded threshold). Check your Harbinger dashboard for details.`;
  const payload = { alert_id: alertId, incident_id: incidentId, endpoint_id: endpointId, endpoint_url: user.endpoint_url, incident_type: incident.incident_type, alert_kind: alertKind || incident.incident_type, recent_score: recentScore, prior_score: priorScore, trend, message, timestamp: new Date().toISOString() };
  const channels = (user.alert_channel || 'email').split(',').map((value) => value.trim().toLowerCase());
  let delivered = false;
  if (channels.includes('email') || channels.includes('all')) { await CHANNELS.email(user.alert_target || user.email, payload); delivered = true; }
  if (channels.includes('webhook') || channels.includes('slack') || channels.includes('all')) { const target = user.webhook_url || user.alert_target; if (target?.startsWith('http')) { await CHANNELS.webhook(target, payload); delivered = true; } }
  if (delivered) await pool.query(`UPDATE incidents SET ${alertKind === 'degradation_reminder' ? 'reminder_sent' : 'alert_sent'} = true WHERE id = $1`, [incidentId]);
  logger('Alert delivered', { incidentId, alertKind });
}, { connection });

console.log('Combined scheduler and workers enabled');
