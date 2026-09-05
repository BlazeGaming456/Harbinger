import redis from "../db/redis.js";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

export async function healthRoutes(app) {
  app.get(
    "/health/:endpointId",
    { preHandler: [requireAuth, rateLimit("endpoint")] },
    async (req, reply) => {
      const { endpointId } = req.params;

      const owns = await pool.query(
        `SELECT id from endpoints WHERE id = $1 AND user_id = $2`,
        [endpointId, req.userId],
      );
      if (!owns.rows[0]) return reply.code(404).send({ error: "Not found" });

      //Cache aside: try Redis first
      const cached = await redis.get(`health:${endpointId}`);
      if (cached) {
        const data = JSON.parse(cached);
        return {
          ...data,
          score: data.score != null ? Number(data.score) : null,
          error_rate: data.error_rate != null ? Number(data.error_rate) : null,
          timeout_rate:
            data.timeout_rate != null ? Number(data.timeout_rate) : null,
          trend: data.trend != null ? Number(data.trend) : null,
          source: "cache",
        };
      }

      //Cache miss - fall back to Postgres
      const result = await pool.query(
        `SELECT
            es.score,
            es.p95_latency_ms,
            es.error_rate,
            es.timeout_rate,
            es.trend,
            es.computed_at,
            i.incident_type
        FROM endpoint_scores es
        LEFT JOIN incidents i
            ON i.endpoint_id = es.endpoint_id
            AND i.resolved_at IS NULL
        WHERE es.endpoint_id = $1`,
        [endpointId],
      );

      if (!result.rows[0]) {
        return { score: null, message: "No data yet", source: "db" };
      }

      const row = result.rows[0];
      const payload = {
        ...row,
        score: row.score != null ? Number(row.score) : null,
        error_rate: row.error_rate != null ? Number(row.error_rate) : null,
        timeout_rate:
          row.timeout_rate != null ? Number(row.timeout_rate) : null,
        trend: row.trend != null ? Number(row.trend) : null,
      };

      await redis.set(
        `health:${endpointId}`,
        JSON.stringify(payload),
        "EX",
        120,
      );

      return { ...payload, source: "db" };
    },
  );
}