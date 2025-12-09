-- Flyway migration script (if using Flyway)
-- Otherwise, JPA will auto-create tables with ddl-auto: update

CREATE TABLE IF NOT EXISTS telemetry_events (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL UNIQUE,
    path VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    latency_ms BIGINT NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    api_key VARCHAR(255),
    upstream_service VARCHAR(255),
    route_id VARCHAR(255),
    timestamp TIMESTAMP NOT NULL,
    error_type VARCHAR(100),
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timestamp ON telemetry_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_path ON telemetry_events(path);
CREATE INDEX IF NOT EXISTS idx_client_id ON telemetry_events(client_id);
CREATE INDEX IF NOT EXISTS idx_status_code ON telemetry_events(status_code);
CREATE INDEX IF NOT EXISTS idx_timestamp_path ON telemetry_events(timestamp, path);

