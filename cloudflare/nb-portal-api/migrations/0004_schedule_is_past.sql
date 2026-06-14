ALTER TABLE schedules ADD COLUMN is_past INTEGER NOT NULL DEFAULT 0;

UPDATE schedules
SET is_past = CASE WHEN date < date('now', '+9 hours') THEN 1 ELSE 0 END;

CREATE INDEX idx_schedules_is_past ON schedules(is_past);
