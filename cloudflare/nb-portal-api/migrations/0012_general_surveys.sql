CREATE TABLE surveys (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  creator_id TEXT NOT NULL,
  deadline_at TEXT,
  results_public INTEGER NOT NULL DEFAULT 0,
  questions_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_surveys_status_deadline ON surveys(status, deadline_at);
CREATE INDEX idx_surveys_creator ON surveys(creator_id);

CREATE TABLE survey_responses (
  survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  draft_answers_json TEXT NOT NULL DEFAULT '{}',
  submitted_answers_json TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT,
  PRIMARY KEY (survey_id, student_id)
);

CREATE INDEX idx_survey_responses_status ON survey_responses(survey_id, status);
