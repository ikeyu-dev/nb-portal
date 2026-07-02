UPDATE schedules
SET attendance_deadline = date
WHERE attendance_deadline IS NULL
   OR attendance_deadline = ''
   OR attendance_deadline = date(date, '-2 days');
