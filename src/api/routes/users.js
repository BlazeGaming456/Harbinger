import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export async function userRoutes(app) {
  app.get("/users/me", { preHandler: requireAuth }, async (req, reply) => {
    const result = await pool.query(
      `SELECT id, email, alert_channel, alert_target, webhook_url, created_at FROM users WHERE id = $1`,
      [req.userId],
    );
    if (!result.rows[0])
      return reply.code(404).send({ error: "User not found" });
    const user = result.rows[0];

    const channelStr = user.alert_channel || "email";
    const channels = channelStr.split(",").map((c) => c.trim().toLowerCase());

    return {
      ...user,
      email_alerts_enabled:
        channels.includes("email") || channels.includes("all"),
      webhook_alerts_enabled:
        channels.includes("webhook") ||
        channels.includes("slack") ||
        channels.includes("all"),
    };
  });

  app.patch("/users/me", { preHandler: requireAuth }, async (req, reply) => {
    const {
      email_alerts_enabled,
      webhook_alerts_enabled,
      alert_target,
      webhook_url,
      alert_channel,
    } = req.body || {};

    let activeChannels = [];
    if (
      email_alerts_enabled !== undefined ||
      webhook_alerts_enabled !== undefined
    ) {
      if (email_alerts_enabled) activeChannels.push("email");
      if (webhook_alerts_enabled) activeChannels.push("webhook");
    } else if (alert_channel) {
      activeChannels = alert_channel.split(",").map((c) => c.trim());
    } else {
      activeChannels = ["email"];
    }

    const newChannelStr =
      activeChannels.length > 0 ? activeChannels.join(",") : "none";

    await pool.query(
      `UPDATE users 
             SET alert_channel = $1,
                 alert_target = COALESCE($2, alert_target),
                 webhook_url = COALESCE($3, webhook_url)
             WHERE id = $4`,
      [
        newChannelStr,
        alert_target !== undefined ? alert_target : null,
        webhook_url !== undefined ? webhook_url : null,
        req.userId,
      ],
    );

    const result = await pool.query(
      `SELECT id, email, alert_channel, alert_target, webhook_url, created_at FROM users WHERE id = $1`,
      [req.userId],
    );
    const user = result.rows[0];
    const channels = (user.alert_channel || "email")
      .split(",")
      .map((c) => c.trim().toLowerCase());

    return {
      ...user,
      email_alerts_enabled:
        channels.includes("email") || channels.includes("all"),
      webhook_alerts_enabled:
        channels.includes("webhook") ||
        channels.includes("slack") ||
        channels.includes("all"),
    };
  });

  app.delete("/users/me", { preHandler: requireAuth }, async (req, reply) => {
    await pool.query(`DELETE FROM users WHERE id = $1`, [req.userId]);
    reply.clearCookie("refreshToken");
    return reply.code(204).send();
  });
}
