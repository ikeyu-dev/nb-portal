CREATE TABLE cron_executions (
  id TEXT PRIMARY KEY,
  cron TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  error TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cron_executions_status ON cron_executions(status);
CREATE INDEX idx_cron_executions_scheduled_time ON cron_executions(scheduled_time);
