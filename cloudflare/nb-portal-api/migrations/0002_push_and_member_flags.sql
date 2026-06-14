ALTER TABLE members ADD COLUMN is_joined_line INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN line_name TEXT;
ALTER TABLE members ADD COLUMN is_joined_discord INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN is_signed INTEGER NOT NULL DEFAULT 0;

CREATE TABLE push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_push_subscriptions_student_id ON push_subscriptions(student_id);

CREATE TABLE access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  client_timestamp TEXT,
  student_id TEXT,
  display_name TEXT,
  permission TEXT,
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  user_agent TEXT,
  ip_hash TEXT
);

CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);
CREATE INDEX idx_access_logs_student_id ON access_logs(student_id);
