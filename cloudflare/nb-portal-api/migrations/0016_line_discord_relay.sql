CREATE TABLE line_relay_contacts (
	organization_key TEXT PRIMARY KEY CHECK (organization_key IN ('RFC', 'YUYU', 'MFSC', 'SOM')),
	organization_name TEXT NOT NULL,
	president_name TEXT NOT NULL DEFAULT '',
	line_display_name TEXT NOT NULL DEFAULT '',
	line_user_id TEXT UNIQUE,
	updated_by TEXT,
	updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CHECK (line_user_id IS NULL OR (length(line_user_id) = 33 AND line_user_id GLOB 'U[0-9a-fA-F]*' AND substr(line_user_id, 2) NOT GLOB '*[^0-9a-fA-F]*'))
);

INSERT INTO line_relay_contacts (organization_key, organization_name)
VALUES
	('RFC', 'RFC'),
	('YUYU', '友遊'),
	('MFSC', 'MFSC'),
	('SOM', 'SoM');

CREATE TABLE line_relay_events (
	webhook_event_id TEXT PRIMARY KEY,
	organization_key TEXT NOT NULL REFERENCES line_relay_contacts(organization_key),
	status TEXT NOT NULL CHECK (status IN ('QUEUING', 'QUEUED', 'PROCESSING', 'SENT', 'NOTICE', 'FAILED')),
	queue_claimed_at TEXT,
	processing_started_at TEXT,
	attempts INTEGER NOT NULL DEFAULT 0,
	last_error TEXT,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_line_relay_events_status_created
	ON line_relay_events(status, created_at DESC);
