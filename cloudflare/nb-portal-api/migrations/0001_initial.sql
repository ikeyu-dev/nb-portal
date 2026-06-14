CREATE TABLE members (
  student_number TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  grade TEXT,
  permission TEXT NOT NULL DEFAULT 'NORMAL',
  discord_id TEXT,
  email TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  description TEXT,
  attendance_mode TEXT NOT NULL DEFAULT 'ABSENCE',
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE absences (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  student_number TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  reason_detail TEXT,
  time_step_out TEXT,
  time_return TEXT,
  time_leaving_early TEXT,
  event_title TEXT,
  event_date_label TEXT,
  event_time_label TEXT,
  event_where TEXT,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, student_number)
);

CREATE TABLE next_meeting_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  event_id TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  mode TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_members_permission ON members(permission);
CREATE INDEX idx_members_is_active ON members(is_active);

CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_attendance_mode ON schedules(attendance_mode);

CREATE INDEX idx_absences_event_id ON absences(event_id);
CREATE INDEX idx_absences_student_number ON absences(student_number);
CREATE INDEX idx_absences_submitted_at ON absences(submitted_at);
