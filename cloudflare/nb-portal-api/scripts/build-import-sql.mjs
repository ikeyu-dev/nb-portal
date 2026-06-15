import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const csvDir =
	process.argv[2] || "/Users/uyuyu/Downloads/nb-portal_csv_from_spreadsheet";
const outputPath = process.argv[3] || "/tmp/nb-portal-d1-import.sql";

const files = {
	members: "NB_Portal - members.csv",
	schedules: "NB_Portal - schedules.csv",
	absences: "NB_Portal - absence_data.csv",
	pushSubscriptions: "NB_Portal - push_subscriptions.csv",
};

const parseCsv = (text) => {
	const rows = [];
	let row = [];
	let field = "";
	let inQuotes = false;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		const next = text[index + 1];

		if (inQuotes) {
			if (char === '"' && next === '"') {
				field += '"';
				index += 1;
			} else if (char === '"') {
				inQuotes = false;
			} else {
				field += char;
			}
			continue;
		}

		if (char === '"') {
			inQuotes = true;
		} else if (char === ",") {
			row.push(field);
			field = "";
		} else if (char === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else if (char !== "\r") {
			field += char;
		}
	}

	if (field || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows.filter((currentRow) =>
		currentRow.some((value) => String(value).trim() !== "")
	);
};

const readCsv = (fileName) => {
	const rows = parseCsv(readFileSync(join(csvDir, fileName), "utf8"));
	const [headers = [], ...records] = rows;
	return records.map((record) =>
		Object.fromEntries(
			headers.map((header, index) => [header, record[index] ?? ""])
		)
	);
};

const sqlString = (value) => {
	const stringValue = String(value ?? "").trim();
	return `'${stringValue.replaceAll("'", "''")}'`;
};

const sqlNullableString = (value) => {
	const stringValue = String(value ?? "").trim();
	return stringValue ? sqlString(stringValue) : "NULL";
};

const sqlBool = (value) => {
	const normalized = String(value ?? "").trim().toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "yes"
		? "1"
		: "0";
};

const parseSpreadsheetDateTime = (value) => {
	const raw = String(value ?? "").trim();
	const match = raw.match(
		/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
	);
	if (!match) return raw;

	const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
	return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${hour.padStart(
		2,
		"0"
	)}:${minute}:${second.padStart(2, "0")}`;
};

const buildDate = (year, month, day) => {
	const y = String(year ?? "").trim();
	const m = String(month ?? "").trim();
	const d = String(day ?? "").trim();
	if (!y || !m || !d) return "";
	return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

const buildTime = (hour, minute) => {
	const h = String(hour ?? "").trim();
	const m = String(minute ?? "").trim();
	if (!h && !m) return "";
	return `${(h || "0").padStart(2, "0")}:${(m || "0").padStart(2, "0")}`;
};

const buildTodayJst = () =>
	new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());

const statements = [
	"PRAGMA foreign_keys = OFF;",
	"DELETE FROM push_subscriptions;",
	"DELETE FROM absences;",
	"DELETE FROM schedules;",
	"DELETE FROM members;",
];

const todayJst = buildTodayJst();

for (const member of readCsv(files.members)) {
	const studentNumber = member.StudentNumber;
	if (!studentNumber) continue;

	statements.push(`INSERT INTO members (
  student_number, name, nickname, is_joined_line, line_name, is_joined_discord,
  is_signed, permission, is_active, created_at, updated_at
) VALUES (
  ${sqlString(studentNumber)},
  ${sqlString(member.Name)},
  ${sqlNullableString(member.Nickname)},
  ${sqlBool(member.isJoinedLine)},
  ${sqlNullableString(member.LineName)},
  ${sqlBool(member.isJoinedDiscord)},
  ${sqlBool(member.isSigned)},
  ${sqlString(member.Permission || "NORMAL")},
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);`);
}

for (const schedule of readCsv(files.schedules)) {
	const eventId = schedule.EVENT_ID;
	if (!eventId) continue;

	statements.push(`INSERT INTO schedules (
  id, title, date, end_date, start_time, end_time, location, description, color, attendance_mode,
  is_past, created_by, created_at, updated_by, updated_at
) VALUES (
  ${sqlString(eventId)},
  ${sqlString(schedule.TITLE)},
  ${sqlString(buildDate(schedule.YYYY, schedule.MM, schedule.DD))},
  ${sqlNullableString(buildDate(schedule.END_YYYY, schedule.END_MM, schedule.END_DD))},
  ${sqlNullableString(buildTime(schedule.TIME_HH, schedule.TIME_MM))},
  ${sqlNullableString(buildTime(schedule.END_TIME_HH, schedule.END_TIME_MM))},
  ${sqlNullableString(schedule.WHERE)},
  ${sqlNullableString(schedule.DETAIL)},
  ${sqlString(schedule.COLOR || "primary")},
  ${sqlString(schedule.ATTENDANCE_MODE || "ABSENCE")},
  ${buildDate(schedule.YYYY, schedule.MM, schedule.DD) < todayJst ? "1" : "0"},
  ${sqlNullableString(schedule.CREATED_BY)},
  ${sqlString(parseSpreadsheetDateTime(schedule.CREATED_AT) || new Date().toISOString())},
  ${sqlNullableString(schedule.UPDATED_BY)},
  ${sqlString(parseSpreadsheetDateTime(schedule.UPDATED_AT) || new Date().toISOString())}
);`);
}

for (const absence of readCsv(files.absences)) {
	const eventId = absence.EVENT_ID;
	const studentNumber = absence.STUDENT_NUMBER;
	if (!eventId || !studentNumber) continue;

	statements.push(`INSERT INTO absences (
  id, event_id, student_number, name, type, reason, reason_detail,
  time_leaving_early, time_step_out, time_return, submitted_at, updated_at
) VALUES (
  ${sqlString(`${eventId}:${studentNumber}`)},
  ${sqlString(eventId)},
  ${sqlString(studentNumber)},
  ${sqlString(absence.NAME)},
  ${sqlString(absence.TYPE)},
  ${sqlNullableString(absence.REASON)},
  ${sqlNullableString(absence.DETAIL)},
  ${sqlNullableString(absence.TimeLeavingEarly)},
  ${sqlNullableString(absence.TimeStepOut)},
  ${sqlNullableString(absence.TimeReturn)},
  ${sqlString(parseSpreadsheetDateTime(absence.TIMESTAMP) || new Date().toISOString())},
  CURRENT_TIMESTAMP
) ON CONFLICT(event_id, student_number) DO UPDATE SET
  name = excluded.name,
  type = excluded.type,
  reason = excluded.reason,
  reason_detail = excluded.reason_detail,
  time_leaving_early = excluded.time_leaving_early,
  time_step_out = excluded.time_step_out,
  time_return = excluded.time_return,
  submitted_at = excluded.submitted_at,
  updated_at = CURRENT_TIMESTAMP;`);
}

for (const subscription of readCsv(files.pushSubscriptions)) {
	if (!subscription.STUDENT_ID || !subscription.ENDPOINT) continue;

	statements.push(`INSERT INTO push_subscriptions (
  student_id, endpoint, p256dh, auth, created_at, updated_at
) VALUES (
  ${sqlString(subscription.STUDENT_ID)},
  ${sqlString(subscription.ENDPOINT)},
  ${sqlString(subscription.P256DH)},
  ${sqlString(subscription.AUTH)},
  ${sqlString(parseSpreadsheetDateTime(subscription.CREATED_AT) || new Date().toISOString())},
  CURRENT_TIMESTAMP
) ON CONFLICT(endpoint) DO UPDATE SET
  student_id = excluded.student_id,
  p256dh = excluded.p256dh,
  auth = excluded.auth,
  updated_at = CURRENT_TIMESTAMP;`);
}

statements.push("PRAGMA foreign_keys = ON;");

writeFileSync(outputPath, `${statements.join("\n\n")}\n`);
console.log(`Wrote ${outputPath}`);
