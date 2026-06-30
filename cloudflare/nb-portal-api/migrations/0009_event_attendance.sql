CREATE TABLE event_attendance (
  event_id TEXT NOT NULL,
  student_number TEXT NOT NULL,
  checked_by TEXT,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, student_number)
);

CREATE INDEX idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX idx_event_attendance_student_number ON event_attendance(student_number);
