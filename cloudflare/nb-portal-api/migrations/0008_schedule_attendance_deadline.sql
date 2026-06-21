ALTER TABLE schedules ADD COLUMN attendance_deadline TEXT;

UPDATE schedules
SET attendance_deadline = date(date, '-2 days')
WHERE attendance_deadline IS NULL OR attendance_deadline = '';
