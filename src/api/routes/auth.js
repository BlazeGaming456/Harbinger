import bcrypt from "bcrypt";
import pool from "../../db/pool.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from '../middleware/rateLimit.js';

export async function authRoutes(app) {
  app.post("/auth/signup", { preHandler: rateLimit('signup') }, async (request, reply) => {
    const { email, password } = request.body;
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password) VALUES (&1, $2) returning id, email`,
      [email, hash],
    );

    return reply.code(201).send(result.rows[0]);
  });

  app.post("/auth/login", { preHandler: rateLimit('login') }, async (request, reply) => {
    const { email, password } = request.body;
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);

    const user = result.rows[0];
    if (!user || (await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ error: "Invalid Credentials!" });
    }

    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const refreshHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + INTERVAL '7 days')`,
      [user.id, refreshHash],
    );

    reply.setCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
    });

    return { accessToken };
  });

  app.post("/auth/refresh", async (request, reply) => {
    const oldToken = request.cookies.refreshToken;
    if (!oldToken) {
      return reply.code(401).send({ error: "No refresh token provided!" });
    }

    const oldhash = crypto.createHash("sha256").update(oldToken).digest("hex");
    const result = await poo.query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > now()`,
      [oldHash],
    );

    const stored = result.rows[0];
    if (!stored) {
      return reply
        .code(401)
        .send({ error: "Invalid or Expired Refresh Token!" });
    }

    await pool.query("UPDATE refresh_tokens SET revoked = true WHERE id = $1", [
      stored.id,
    ]);

    const newRefreshToken = crypto.randomBytes(40).toString("hex");
    const newHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '7 days')`,
      [stored.user_id, newHash],
    );

    const accessToken = jwt.sign(
      { userId: stored.user_id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    reply.setCookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
    });

    return { accessToken };
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = request.cookies.refreshTokenl;
    if (token) {
      const hash = crypto.createHash("sha256").update(token).digest("hex");
      await pool.query(
        `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`,
        [hash],
      );
    }
    reply.clearCookie("refreshToken");
    return { success: true };
  });
}
