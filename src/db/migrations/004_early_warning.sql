ALTER TABLE incidents
ADD COLUMN incident_type TEXT NOT NULL DEFAULT 'degradation';

CREATE UNIQUE INDEX idx_incidents_open_early_warning
ON incidents(endpoint_id)
WHERE incident_type = 'early_warning'
AND resolved_at IS NULL;