# Harbinger

**Harbinger detects API degradation before vendor status pages acknowledge it — by continuously scoring behavioral anomalies across response time, error rate, and timeout patterns, rather than waiting for a full outage.**

Live demo: `[your Render/Vercel link here]`
Demo video: `[link here]`

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Why five separate processes](#why-five-separate-processes)
- [The scoring engine](#the-scoring-engine)
- [Key technical decisions](#key-technical-decisions)
- [Tech stack](#tech-stack)
- [Running it locally](#running-it-locally)
- [Deployment](#deployment)
- [Documented but not built](#documented-but-not-built)
- [What I'd change with more time](#what-id-change-with-more-time)

---

## What it does

Most uptime monitors give you a binary signal: the endpoint returned a 2xx, or it didn't. That's too crude to catch the failure mode that actually costs people the most — an API that's still technically "up" but has quietly gotten slow, flaky, or partially broken.

Harbinger watches endpoints you register, probes them on a schedule, and computes a **weighted degradation score** from three signals over a rolling window of recent probes:

- **p95 latency deviation** from a learned baseline
- **error rate**
- **timeout rate**

When that score crosses a threshold, an incident opens and an alert fires — through a webhook or email, your choice. A second layer compares the score across two consecutive windows to catch a **worsening trend** even before it crosses the hard threshold, so you get an early warning while things are still getting worse, not only once they're already bad.

You also get a live dashboard: real-time score updates over WebSocket, a latency chart per endpoint, and recent probe history — so this isn't just an API, it's something you can actually watch.

---

## Architecture

```
                                   User
                                    │
                                    ▼
                            ┌───────────────┐
                            │  Next.js UI   │
                            │   (Vercel)    │
                            └───────┬───────┘
                                    │ HTTPS + WebSocket
                                    ▼
                            ┌───────────────┐
                            │  Fastify API  │◄──────────┐
                            │   (Render)    │           │
                            └───────┬───────┘           │
                                    │                    │ pub/sub
                    ┌───────────────┼────────────────┐   │
                    ▼               ▼                ▼   │
              ┌──────────┐   ┌────────────┐   ┌──────────────┐
              │PostgreSQL│   │   Redis    │◄──┤ Score Worker │
              │  (RDS /  │   │(ElastiCache│   └──────┬───────┘
              │  Render) │   │ / Render)  │          │
              └────┬─────┘   └─────┬──────┘          │
                   │               │  BullMQ queues   │
                   │               │                  │
                   │        ┌──────▼───────┐          │
                   │        │  Scheduler   │          │
                   │        └──────┬───────┘          │
                   │               │ enqueues          │
                   │               ▼                  │
                   │        ┌──────────────┐           │
                   └───────►│ Probe Worker │───────────┘
                            └──────┬───────┘
                                   │ HTTP request
                                   ▼
                          [ user's endpoint ]
                                   │
                          (if degraded) enqueues
                                   ▼
                            ┌──────────────┐
                            │ Alert Worker │──► Webhook / Email
                            └──────────────┘
```

**Data flow, end to end:**

1. User registers an endpoint (`POST /endpoints`)
2. Scheduler polls Postgres for endpoints due for a probe, enqueues a job in Redis
3. Probe worker picks up the job, makes the HTTP request, records the outcome (`status_code`, `response_time_ms`, `is_timeout`, `error_type`)
4. Probe worker enqueues a score job
5. Score worker computes the degradation score across the last 20 probes, writes it to Postgres and the Redis cache, publishes it over Redis pub/sub
6. API server relays that pub/sub message to any connected WebSocket clients — the dashboard updates live, no polling required
7. If the score crosses the threshold (or is trending toward it), an incident opens and an alert job is enqueued
8. Alert worker delivers the notification, using an idempotency key so retries never double-send

---

## Why five separate processes

Instead of one monolithic server doing everything, Harbinger runs the API, scheduler, probe worker, score worker, and alert worker as **five independent processes**, connected only through Postgres and Redis.

This isn't complexity for its own sake — it buys three specific things:

- **Independent failure.** If the probe worker crashes mid-request, the API server, scheduler, and alert worker are unaffected. A bug in one layer doesn't take down the whole system.
- **Independent scaling.** Probing is the most variable workload — if you're monitoring hundreds of endpoints, you scale probe workers horizontally without touching the API or scheduler at all.
- **Clear separation of concerns.** The scheduler's only job is deciding *what's due*; it never makes an HTTP request itself. The probe worker only records facts; it never decides what's "healthy." The score worker owns that judgment call alone. This makes each piece small enough to reason about (and test) independently.

---

## The scoring engine

This is the actual differentiator, so it's worth explaining precisely rather than just naming it.

```javascript
function computeScore({ p95_latency, error_rate, timeout_rate, baseline_p95 }) {
  const latencyScore = Math.min(p95_latency / (baseline_p95 * 3), 1);
  return Math.min(
    (latencyScore * 0.3) + (error_rate * 0.4) + (timeout_rate * 0.3),
    1
  );
}
```

**Why p95, not average.** An average hides outliers — if 19 of 20 requests are fast and one takes 5 seconds, the average looks fine, but 5% of real users just had a terrible experience. p95 captures the tail directly, which is what "feels slow" to an actual user.

**Why p95 specifically, not p99.** With a 20-probe window, p99 is close to just "the single worst sample" — too noisy to be a stable signal at this sample size. p95 is the standard middle ground.

**Why a weighted composite, not a hard threshold on any one metric.** A single slow probe shouldn't trigger an alert — that's noise. Aggregating across 20 probes with weighted contributions from latency, errors, and timeouts means it takes a *pattern*, not a blip, to move the score meaningfully.

**Why 0.7 as the incident threshold.** It's a tunable constant, not a derived value — a real system would tune this against observed false-positive/false-negative rates from live traffic. For this project, it's a defensible starting point, documented as such rather than presented as more rigorous than it is.

**Early warning layer.** Separately, the score worker compares the score across the last 20 probes against the 20 before that. If the score is worsening significantly even while still under the hard threshold, an early-warning incident opens — distinct from a full degradation incident. This is a two-window trend comparison, not statistical forecasting or machine learning; it's worth being precise about that distinction rather than overselling it as "prediction."

---

## Key technical decisions

| Decision | Why |
|---|---|
| **Cursor pagination, not offset** | Offset pagination gets slower as `OFFSET` grows, since Postgres has to scan and discard rows every time. Cursor pagination jumps straight to the right point using an index, and stays fast regardless of dataset size. |
| **`PERCENTILE_CONT` in SQL, not application code** | Postgres computes the p95 directly across the relevant rows in one query — no need to pull 20 rows into Node and sort them manually. |
| **Cache-aside health cache (Redis)** | Health checks are read-heavy and latency-sensitive. Reading from Redis first, falling back to Postgres on a miss, keeps the hot path fast without adding write complexity to every score update. |
| **Idempotent alert delivery (`alert_id`)** | BullMQ retries failed jobs. Without an idempotency check, a retried alert job would send a duplicate notification. Every incident carries a unique `alert_id`, checked before send. |
| **Sliding-window rate limiting (Redis sorted sets)** | Fixed-window rate limiting allows a burst at the window boundary (e.g. 20 requests at 0:59, another 20 at 1:00). A sliding window, implemented with a Redis sorted set keyed by timestamp, closes that gap. |
| **Refresh token rotation, httpOnly cookie** | Short-lived access tokens limit exposure if leaked. The refresh token lives in an httpOnly cookie (unreadable by JavaScript, mitigating XSS) and rotates on every use — reuse of an old, already-rotated token is a strong signal of theft and can be detected. |
| **Circuit breaker on the probe worker** | Without it, a permanently-dead endpoint gets probed forever, wasting queue throughput. After repeated consecutive failures, the circuit opens and probing pauses for a cooldown window, using a Redis TTL as the reset mechanism — no separate scheduled job needed. |
| **`ON DELETE CASCADE` throughout the schema** | Deleting a user cleanly removes every dependent row (endpoints, probe history, scores, incidents, refresh tokens) with a single query, enforced by the database rather than a manual cleanup script. |
| **Redis pub/sub bridging score worker → WebSocket clients** | The score worker and API server are separate processes and can't call each other directly. Pub/sub decouples them — the score worker publishes an update with no knowledge of who's listening, and the API server forwards it to connected clients. This also means the design doesn't change if the API server is ever scaled to multiple instances. |

---

## Tech stack

**Backend:** Node.js, Fastify, PostgreSQL, Redis, BullMQ, Pino (structured logging), Sentry
**Frontend:** Next.js (App Router), Tailwind CSS, Recharts, native WebSocket
**Infra:** Docker Compose (local development), Render + Vercel (primary deployment), AWS EC2/RDS/ElastiCache/PM2 (also deployed and verified — see notes below)
**Testing:** Vitest, Supertest, GitHub Actions (CI)

---

## Running it locally

```bash
git clone https://github.com/<you>/harbinger.git
cd harbinger
docker compose up --build
```

This starts PostgreSQL, Redis, the API server, scheduler, and all workers. Run the migration once against the local database:

```bash
docker exec -i harbinger-postgres-1 psql -U harbinger -d harbinger < src/db/migrations/001_init.sql
```

Then, in a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The API runs on `localhost:3000`; the frontend runs on its own dev port (default `localhost:3000` for Next.js, adjust if both are running simultaneously).

---

## Deployment

**Primary (live):** Render (API + 4 background workers + managed Postgres + managed Redis) and Vercel (Next.js frontend). Chosen for a genuinely free tier with no card requirement and no billing risk, while still mapping cleanly onto the same architecture — separate compute, managed database, managed cache.

**Also deployed and verified:** AWS EC2 (compute, managed via PM2), RDS (PostgreSQL), and ElastiCache (Redis), with security groups restricting database/cache access to the EC2 instance only. This was run as a bounded exercise to gain hands-on experience with VPCs, security groups, and managed AWS services, then torn down after verification to avoid ongoing cost — screenshots and notes from that deployment are in `/docs/aws-deployment.md`.

---

## Documented but not built

Being explicit about what's out of scope, rather than implying broader coverage than exists:

- **Horizontal scaling of the scheduler.** The current design assumes a single scheduler instance. Running multiple would require a leader-election mechanism (or partitioning endpoints across instances) to avoid duplicate scheduling — BullMQ itself supports multiple consumers per queue natively, but the *scheduling* decision isn't currently distributed.
- **Full observability stack.** A `/metrics` endpoint (Prometheus-format) is exposed and scrape-ready, but no Grafana dashboard sits on top of it.
- **Multi-region probing.** All probes currently originate from one region; a production version would probe from multiple regions to distinguish "the endpoint is down" from "there's a network issue between one region and the endpoint."
- **Continuous deployment.** CI runs the test suite on every push; deployment itself is still manual.
- **True statistical forecasting.** The early-warning layer compares two recent windows — it is a defensible detection technique, not a trained model, and I want to be precise about that distinction rather than overstate it.

## What I'd change with more time

- Add a proper OpenAPI spec beyond the Swagger auto-generation from route schemas
- Move the shared `db/` and `queues/` modules into a proper local package rather than relative-path imports across service folders — the current setup works but requires every Dockerfile to manually replicate the folder structure, which is a known rough edge
- Expand the alert channel system (currently webhook + email) to Slack, given the dispatch structure already supports adding a channel with one new function and one line in a lookup table

---