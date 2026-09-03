import bcrypt from "bcrypt";
import pool from "../../db/pool.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { rateLimit } from '../middleware/rateLimit.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

//Input validation
const signupSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
    },
  },
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function authRoutes(app) {
  app.post("/auth/signup", { schema: signupSchema, preHandler: rateLimit('signup') }, async (request, reply) => {
    const email = normalizeEmail(request.body.email);
    const { password } = request.body;
    const hash = await bcrypt.hash(password, 10);

    try {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, alert_channel, alert_target) VALUES ($1, $2, 'email', $1) RETURNING id, email`,
        [email, hash],
      );

      return reply.code(201).send(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        return reply.code(409).send({ error: 'An account with that email already exists.' });
      }
      throw error;
    }
  });

  app.post("/auth/login", { preHandler: rateLimit('login') }, async (request, reply) => {
    const email = normalizeEmail(request.body.email);
    const { password } = request.body;
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return { accessToken };
  });

  app.post('/auth/forgot-password', async (request, reply) => {
    const email = normalizeEmail(request.body.email || '');
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const response = { message: 'If an account exists, a reset link has been sent to your email.' };

    if (result.rows[0]) {
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false', [result.rows[0].id]);
      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + INTERVAL '1 hour')`,
        [result.rows[0].id, hashToken(token)],
      );

      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;

      try {
        await resend.emails.send({
          from: process.env.ALERT_FROM_EMAIL || 'onboarding@resend.dev',
          to: email,
          subject: `Reset your Harbinger password`,
          text: `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.`,
        });
      } catch (err) {
        request.log.error(err, 'Failed to send reset email');
      }
    }

    return reply.send(response);
  });

  app.post('/auth/reset-password', async (request, reply) => {
    const { token, password } = request.body;
    if (!token || typeof password !== 'string' || password.length < 8) {
      return reply.code(400).send({ error: 'A valid reset token and password of at least 8 characters are required.' });
    }

    const result = await pool.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used = false AND expires_at > now()`,
      [hashToken(token)],
    );
    const resetToken = result.rows[0];
    if (!resetToken) return reply.code(400).send({ error: 'This reset link is invalid or expired.' });

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, resetToken.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [resetToken.id]);
    await pool.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [resetToken.user_id]);

    return reply.send({ message: 'Password updated successfully.' });
  });

  app.post("/auth/refresh", async (request, reply) => {
    const oldToken = request.cookies.refreshToken;
    if (!oldToken) {
      return reply.code(401).send({ error: "No refresh token provided!" });
    }

    const oldHash = crypto.createHash("sha256").update(oldToken).digest("hex");
    const result = await pool.query(
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return { accessToken };
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = request.cookies.refreshToken;
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
