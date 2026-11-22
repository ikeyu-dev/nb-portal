CREATE TABLE line_relay_candidates (
    line_user_id TEXT PRIMARY KEY NOT NULL,
    last_seen_at TEXT NOT NULL
);

CREATE INDEX line_relay_candidates_last_seen_idx
    ON line_relay_candidates(last_seen_at);
