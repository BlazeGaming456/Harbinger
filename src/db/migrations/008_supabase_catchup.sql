-- Idempotent catch-up for a fresh Supabase database that only ran 001_init.sql
-- (or failed later migrations). Safe to re-run.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS alert_channel TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS alert_target TEXT,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS google_sub TEXT UNIQUE;

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS incident_type TEXT NOT NULL DEFAULT 'degradation',
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE endpoint_scores ADD COLUMN IF NOT EXISTS trend NUMERIC(4,3);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_active
    ON password_reset_tokens (token_hash, expires_at)
    WHERE used = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_open_early_warning
ON incidents(endpoint_id)
WHERE incident_type = 'early_warning'
AND resolved_at IS NULL;

UPDATE users
SET alert_target = email
WHERE alert_target IS NULL;
