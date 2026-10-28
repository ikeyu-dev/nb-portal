CREATE TABLE meeting_number_series (
	id TEXT PRIMARY KEY,
	department_head_student_number TEXT NOT NULL,
	reset_reason TEXT NOT NULL CHECK (reset_reason IN ('INITIAL', 'LEADER_CHANGED', 'MANUAL')),
	created_by TEXT,
	created_at TEXT NOT NULL
);

CREATE TABLE meeting_numbering_state (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	current_series_id TEXT NOT NULL REFERENCES meeting_number_series(id),
	observed_head_student_number TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE executive_meetings (
	id TEXT PRIMARY KEY,
	series_id TEXT NOT NULL REFERENCES meeting_number_series(id),
	meeting_number INTEGER NOT NULL CHECK (meeting_number > 0),
	meeting_date TEXT,
	start_time TEXT,
	end_time TEXT,
	location_type TEXT CHECK (location_type IS NULL OR location_type IN ('MEETING_ROOM', 'DISCORD', 'CLUB_ROOM', 'OTHER')),
	location_detail TEXT NOT NULL DEFAULT '',
	attendee_student_numbers_json TEXT NOT NULL CHECK (json_valid(attendee_student_numbers_json)),
	content_json TEXT NOT NULL CHECK (json_valid(content_json)),
	creator_student_number TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_by TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	discord_embed_state TEXT NOT NULL DEFAULT 'NOT_SENT' CHECK (discord_embed_state IN ('NOT_SENT', 'SENDING', 'SENT', 'FAILED')),
	discord_embed_started_at TEXT,
	discord_embed_sent_at TEXT,
	discord_embed_attempt_count INTEGER NOT NULL DEFAULT 0,
	discord_embed_last_error TEXT,
	discord_body_state TEXT NOT NULL DEFAULT 'NOT_SENT' CHECK (discord_body_state IN ('NOT_SENT', 'SENDING', 'SENT', 'FAILED')),
	discord_body_started_at TEXT,
	discord_body_sent_at TEXT,
	discord_body_attempt_count INTEGER NOT NULL DEFAULT 0,
	discord_body_last_error TEXT,
	discord_sent_at TEXT,
	UNIQUE (series_id, meeting_number)
);

CREATE INDEX idx_executive_meetings_date
	ON executive_meetings(meeting_date DESC, start_time DESC, created_at DESC);

CREATE INDEX idx_executive_meetings_series_number
	ON executive_meetings(series_id, meeting_number);
