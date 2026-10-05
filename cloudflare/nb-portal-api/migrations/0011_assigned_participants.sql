ALTER TABLE schedules ADD COLUMN participants_revision INTEGER NOT NULL DEFAULT 0 CHECK (participants_revision >= 0);

CREATE TABLE scheduled_participants (
  event_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  student_number TEXT NOT NULL,
  display_name_snapshot TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (event_id, student_number)
);
CREATE INDEX idx_scheduled_participants_student_number ON scheduled_participants(student_number);

CREATE TRIGGER schedules_attendance_mode_immutable
BEFORE UPDATE OF attendance_mode ON schedules
WHEN COALESCE(NEW.attendance_mode, 'ABSENCE') <> COALESCE(OLD.attendance_mode, 'ABSENCE')
BEGIN
  SELECT RAISE(ABORT, 'attendance_mode_immutable');
END;

CREATE TRIGGER schedules_creator_immutable
BEFORE UPDATE OF created_by ON schedules
WHEN NEW.created_by IS NOT OLD.created_by
BEGIN
  SELECT RAISE(ABORT, 'schedule_creator_immutable');
END;
