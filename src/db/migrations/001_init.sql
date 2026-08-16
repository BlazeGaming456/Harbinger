CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    interval_seconds INT NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT true,
    next_probe_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_endpoints_due on endpoints (next_probe_at) where is_active = true;

CREATE TABLE probe_results (
    id BIGSERIAL PRIMARY KEY,
    endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    status_code INT,
    response_time_ms INT,
    is_timeout BOOLEAN NOT NULL DEFAULT false,
    error_type TEXT,
    probed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_probe_results_endpoint_time on probe_results(endpoint_id, probed_at DESC);

CREATE TABLE endpoint_scores (
    endpoint_id UUID PRIMARY KEY REFERENCES endpoints(id) ON DELETE CASCADE,
    score NUMERIC(4,3) NOT NULL,
    p95_latency_ms INT,
    error_rate NUMERIC(4,3),
    timeout_rate NUMERIC(4,3),
    computed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_endpoints_user_created on (user_id, created_at DESC);

CREATE TABLE INCIDENTS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    alert_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    alert_sent BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_incidents_open on incidents(endpoint_id) where resolved_at IS NULL;

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);