ALTER TABLE surveys ADD COLUMN sections_json TEXT NOT NULL DEFAULT '[{"id":"section-1","title":"セクション1","description":""}]';

ALTER TABLE survey_responses ADD COLUMN current_section_id TEXT;
