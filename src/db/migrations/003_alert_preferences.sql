ALTER TABLE users
  ADD COLUMN IF NOT EXISTS alert_channel TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS alert_target TEXT;

-- Prefer email alerts when no webhook is configured
UPDATE users
SET alert_channel = 'email',
    alert_target = email
WHERE alert_target IS NULL
   OR (alert_channel = 'webhook' AND (webhook_url IS NULL OR webhook_url = ''));

ALTER TABLE users ALTER COLUMN alert_channel SET DEFAULT 'email';
