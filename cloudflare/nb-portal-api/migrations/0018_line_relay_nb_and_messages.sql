CREATE TABLE line_relay_contacts_new (
    organization_key TEXT PRIMARY KEY CHECK (organization_key IN ('RFC', 'YUYU', 'MFSC', 'SOM', 'NB')),
    organization_name TEXT NOT NULL,
    president_name TEXT NOT NULL DEFAULT '',
    line_display_name TEXT NOT NULL DEFAULT '',
    line_user_id TEXT UNIQUE,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (line_user_id IS NULL OR (length(line_user_id) = 33 AND line_user_id GLOB 'U[0-9a-fA-F]*' AND substr(line_user_id, 2) NOT GLOB '*[^0-9a-fA-F]*'))
);
INSERT INTO line_relay_contacts_new SELECT * FROM line_relay_contacts;
INSERT INTO line_relay_contacts_new (organization_key, organization_name) VALUES ('NB', 'NB');

CREATE TABLE line_relay_events_new (
    webhook_event_id TEXT PRIMARY KEY,
    organization_key TEXT NOT NULL REFERENCES line_relay_contacts_new(organization_key),
    status TEXT NOT NULL CHECK (status IN ('QUEUING', 'QUEUED', 'PROCESSING', 'SENT', 'NOTICE', 'FAILED')),
    queue_claimed_at TEXT,
    processing_started_at TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO line_relay_events_new SELECT * FROM line_relay_events;
DROP TABLE line_relay_events;
DROP TABLE line_relay_contacts;
ALTER TABLE line_relay_contacts_new RENAME TO line_relay_contacts;
ALTER TABLE line_relay_events_new RENAME TO line_relay_events;
CREATE INDEX idx_line_relay_events_status_created ON line_relay_events(status, created_at DESC);

CREATE TABLE line_relay_candidate_messages (
    message_id TEXT PRIMARY KEY NOT NULL,
    line_user_id TEXT NOT NULL REFERENCES line_relay_candidates(line_user_id) ON DELETE CASCADE,
    received_at TEXT NOT NULL,
    body TEXT NOT NULL
);
CREATE INDEX idx_line_relay_candidate_messages_recent
    ON line_relay_candidate_messages(line_user_id, received_at DESC, message_id DESC);
