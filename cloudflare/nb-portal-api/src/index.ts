type ApiResponse<T> = {
	success: boolean;
	data?: T;
	count?: number;
	error?: string;
	message?: string;
	timestamp?: string;
};

type MemberRow = {
	student_number: string;
	name: string;
	nickname: string | null;
	is_joined_line: number;
	line_name: string | null;
	is_joined_discord: number;
	is_signed: number;
	permission: string;
};

type ScheduleRow = {
	id: string;
	title: string;
	date: string;
	start_time: string | null;
	end_time: string | null;
	location: string | null;
	description: string | null;
	attendance_mode: string;
	created_by: string | null;
	created_at: string;
	updated_by: string | null;
	updated_at: string;
};

type AbsenceRow = {
	event_id: string;
	student_number: string;
	name: string;
	type: string;
	reason: string | null;
	reason_detail: string | null;
	time_leaving_early: string | null;
	time_step_out: string | null;
	time_return: string | null;
	submitted_at: string;
};

type NextMeetingRow = {
	event_id: string | null;
	date: string;
	time: string;
	mode: string;
	updated_by: string | null;
	updated_at: string | null;
};

type PushSubscriptionRow = {
	student_id: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	created_at: string;
};

type NotificationRow = {
	event_id: string;
	title: string;
	date: string;
	created_by: string | null;
	created_at: string;
	updated_by: string | null;
	updated_at: string;
	created_by_name: string | null;
	updated_by_name: string | null;
};

const memberHeaders = [
	"StudentNumber",
	"Name",
	"Nickname",
	"isJoinedLine",
	"LineName",
	"isJoinedDiscord",
	"isSigned",
	"Permission",
] as const;

const json = (body: unknown, init?: ResponseInit) =>
	new Response(JSON.stringify(body), {
		...init,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...init?.headers,
		},
	});

const ok = <T>(data: T, extra?: Omit<ApiResponse<T>, "success" | "data">) =>
	json({ success: true, data, ...extra } satisfies ApiResponse<T>);

const error = (message: string, status = 500) =>
	json({ success: false, error: message }, { status });

const notFound = () => error("Not found", 404);

const normalizeStudentId = (value: unknown) => String(value ?? "").trim();

const toBool = (value: unknown) => {
	const normalized = String(value ?? "").trim().toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "yes";
};

const toSqlBool = (value: unknown) => (toBool(value) ? 1 : 0);

const splitDate = (date: string | null) => {
	const match = String(date ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
	return {
		year: match?.[1] || "",
		month: match?.[2] ? String(Number(match[2])) : "",
		day: match?.[3] ? String(Number(match[3])) : "",
	};
};

const splitTime = (time: string | null) => {
	const match = String(time ?? "").match(/^(\d{1,2}):(\d{2})/);
	return {
		hour: match?.[1] ? String(Number(match[1])) : "",
		minute: match?.[2] ? String(Number(match[2])) : "",
	};
};

const buildDate = (year: unknown, month: unknown, day: unknown) => {
	const y = String(year ?? "").trim();
	const m = String(month ?? "").trim().padStart(2, "0");
	const d = String(day ?? "").trim().padStart(2, "0");
	return y && m && d ? `${y}-${m}-${d}` : "";
};

const buildTime = (hour: unknown, minute: unknown) => {
	const h = String(hour ?? "").trim();
	const m = String(minute ?? "").trim();
	if (!h && !m) return null;
	return `${h.padStart(2, "0")}:${(m || "0").padStart(2, "0")}`;
};

const toMemberResponse = (row: MemberRow, rowNumber: number) => ({
	rowNumber,
	values: [
		row.student_number,
		row.name,
		row.nickname || "",
		row.is_joined_line === 1,
		row.line_name || "",
		row.is_joined_discord === 1,
		row.is_signed === 1,
		row.permission,
	],
});

const toScheduleResponse = (row: ScheduleRow) => {
	const startDate = splitDate(row.date);
	const startTime = splitTime(row.start_time);
	const endTime = splitTime(row.end_time);

	return {
		EVENT_ID: row.id,
		YYYY: startDate.year,
		MM: startDate.month,
		DD: startDate.day,
		TIME_HH: startTime.hour,
		TIME_MM: startTime.minute,
		TITLE: row.title,
		WHERE: row.location || "",
		DETAIL: row.description || "",
		END_YYYY: "",
		END_MM: "",
		END_DD: "",
		COLOR: "primary",
		CREATED_BY: row.created_by || "",
		CREATED_AT: row.created_at || "",
		UPDATED_BY: row.updated_by || "",
		UPDATED_AT: row.updated_at || "",
		ATTENDANCE_MODE: row.attendance_mode || "ABSENCE",
		END_TIME_HH: endTime.hour,
		END_TIME_MM: endTime.minute,
	};
};

const toAbsenceResponse = (row: AbsenceRow) => ({
	TIMESTAMP: row.submitted_at,
	EVENT_ID: row.event_id,
	STUDENT_NUMBER: row.student_number,
	NAME: row.name,
	TYPE: row.type,
	REASON: row.reason || "",
	DETAIL: row.reason_detail || "",
	TimeLeavingEarly: row.time_leaving_early || "",
	TimeStepOut: row.time_step_out || "",
	TimeReturn: row.time_return || "",
});

const getBody = async (request: Request) => {
	try {
		return (await request.json()) as Record<string, unknown>;
	} catch {
		return {};
	}
};

const getMembers = async (env: Env) => {
	const rows = await env.DB.prepare(
		`SELECT student_number, name, nickname, is_joined_line, line_name,
			is_joined_discord, is_signed, permission
		FROM members
		WHERE is_active = 1
		ORDER BY student_number`
	).all<MemberRow>();

	return ok({
		headers: [...memberHeaders],
		members: (rows.results || []).map((row, index) =>
			toMemberResponse(row, index + 2)
		),
	});
};

const findMemberByRowNumber = async (env: Env, rowNumber: number) => {
	const offset = rowNumber - 2;
	if (offset < 0) return null;

	return env.DB.prepare(
		`SELECT student_number FROM members
		WHERE is_active = 1
		ORDER BY student_number
		LIMIT 1 OFFSET ?`
	)
		.bind(offset)
		.first<{ student_number: string }>();
};

const upsertMemberFromValues = async (
	env: Env,
	values: unknown[],
	existingStudentNumber?: string
) => {
	const studentNumber = normalizeStudentId(values[0] ?? existingStudentNumber);
	if (!studentNumber) throw new Error("StudentNumber is required");

	await env.DB.prepare(
		`INSERT INTO members (
			student_number, name, nickname, is_joined_line, line_name,
			is_joined_discord, is_signed, permission, is_active, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
		ON CONFLICT(student_number) DO UPDATE SET
			name = excluded.name,
			nickname = excluded.nickname,
			is_joined_line = excluded.is_joined_line,
			line_name = excluded.line_name,
			is_joined_discord = excluded.is_joined_discord,
			is_signed = excluded.is_signed,
			permission = excluded.permission,
			is_active = 1,
			updated_at = CURRENT_TIMESTAMP`
	)
		.bind(
			studentNumber,
			String(values[1] ?? "").trim(),
			String(values[2] ?? "").trim(),
			toSqlBool(values[3]),
			String(values[4] ?? "").trim(),
			toSqlBool(values[5]),
			toSqlBool(values[6]),
			String(values[7] ?? "NORMAL").trim() || "NORMAL"
		)
		.run();

	return studentNumber;
};

const createMember = async (request: Request, env: Env) => {
	const body = await getBody(request);
	const values = Array.isArray(body.values) ? body.values : [];
	const studentNumber = await upsertMemberFromValues(env, values);
	const row = await env.DB.prepare(
		`SELECT student_number, name, nickname, is_joined_line, line_name,
			is_joined_discord, is_signed, permission
		FROM members
		WHERE student_number = ?`
	)
		.bind(studentNumber)
		.first<MemberRow>();
	const rowNumberResult = await env.DB.prepare(
		`SELECT COUNT(*) + 1 AS row_number
		FROM members
		WHERE is_active = 1 AND student_number < ?`
	)
		.bind(studentNumber)
		.first<{ row_number: number }>();

	return json({
		success: true,
		message: "Member saved",
		rowNumber: rowNumberResult?.row_number || 2,
		values: row ? toMemberResponse(row, 2).values : values,
	});
};

const updateMember = async (request: Request, env: Env) => {
	const body = await getBody(request);
	const rowNumber = Number(body.rowNumber);
	const current = await findMemberByRowNumber(env, rowNumber);
	if (!current) return error("Member not found", 404);

	const values = Array.isArray(body.values) ? body.values : [];
	await upsertMemberFromValues(env, values, current.student_number);

	const nextStudentNumber = normalizeStudentId(values[0] ?? current.student_number);
	if (nextStudentNumber !== current.student_number) {
		await env.DB.prepare("UPDATE members SET is_active = 0 WHERE student_number = ?")
			.bind(current.student_number)
			.run();
	}

	return ok(null, { message: "Member updated" });
};

const deleteMember = async (request: Request, env: Env) => {
	const body = await getBody(request);
	const current = await findMemberByRowNumber(env, Number(body.rowNumber));
	if (!current) return error("Member not found", 404);

	await env.DB.prepare("UPDATE members SET is_active = 0 WHERE student_number = ?")
		.bind(current.student_number)
		.run();
	return ok(null, { message: "Member deleted" });
};

const verifyMember = async (url: URL, env: Env) => {
	const identifier = normalizeStudentId(url.searchParams.get("identifier"));
	const row = await env.DB.prepare(
		`SELECT name, nickname, permission FROM members
		WHERE lower(student_number) = lower(?) AND is_active = 1`
	)
		.bind(identifier)
		.first<{ name: string; nickname: string | null; permission: string }>();

	return json({
		success: true,
		isMember: Boolean(row),
		name: row?.name || null,
		nickname: row?.nickname || null,
		permission: row?.permission || null,
	});
};

const getSchedules = async (env: Env) => {
	const rows = await env.DB.prepare(
		`SELECT id, title, date, start_time, end_time, location, description,
			attendance_mode, created_by, created_at, updated_by, updated_at
		FROM schedules
		ORDER BY date, start_time, id`
	).all<ScheduleRow>();

	return ok((rows.results || []).map(toScheduleResponse), {
		count: rows.results?.length || 0,
	});
};

const createSchedule = async (request: Request, env: Env) => {
	const body = await getBody(request);
	const eventId =
		String(body.eventId ?? "").trim() ||
		`E-${Date.now().toString(36).toUpperCase()}`;
	const date = buildDate(body.year, body.month, body.date);
	if (!date) return error("Schedule date is required", 400);

	await env.DB.prepare(
		`INSERT INTO schedules (
			id, title, date, start_time, end_time, location, description,
			attendance_mode, created_by, created_at, updated_by, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)`
	)
		.bind(
			eventId,
			String(body.title ?? "").trim(),
			date,
			buildTime(body.timeHH, body.timeMM),
			buildTime(body.endTimeHH, body.endTimeMM),
			String(body.where ?? "").trim(),
			String(body.detail ?? "").trim(),
			String(body.attendanceMode ?? "ABSENCE").trim() || "ABSENCE",
			String(body.createdBy ?? "").trim(),
			String(body.createdBy ?? "").trim()
		)
		.run();

	return ok({
		eventId,
		year: String(body.year ?? ""),
		month: String(body.month ?? ""),
		date: String(body.date ?? ""),
		timeHH: String(body.timeHH ?? ""),
		timeMM: String(body.timeMM ?? ""),
		endTimeHH: String(body.endTimeHH ?? ""),
		endTimeMM: String(body.endTimeMM ?? ""),
		title: String(body.title ?? ""),
		where: String(body.where ?? ""),
		detail: String(body.detail ?? ""),
		color: String(body.color ?? "primary"),
		attendanceMode: String(body.attendanceMode ?? "ABSENCE"),
	});
};

const updateSchedule = async (request: Request, env: Env) => {
	const body = await getBody(request);
	const eventId = String(body.eventId ?? body.EVENT_ID ?? "").trim();
	if (!eventId) return error("eventId is required", 400);

	const date = buildDate(body.year, body.month, body.date);
	if (!date) return error("Schedule date is required", 400);

	await env.DB.prepare(
		`UPDATE schedules SET
			title = ?, date = ?, start_time = ?, end_time = ?, location = ?,
			description = ?, attendance_mode = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?`
	)
		.bind(
			String(body.title ?? "").trim(),
			date,
			buildTime(body.timeHH, body.timeMM),
			buildTime(body.endTimeHH, body.endTimeMM),
			String(body.where ?? "").trim(),
			String(body.detail ?? "").trim(),
			String(body.attendanceMode ?? "ABSENCE").trim() || "ABSENCE",
			String(body.updatedBy ?? "").trim(),
			eventId
		)
		.run();

	return ok({
		eventId,
		year: String(body.year ?? ""),
		month: String(body.month ?? ""),
		date: String(body.date ?? ""),
		timeHH: String(body.timeHH ?? ""),
		timeMM: String(body.timeMM ?? ""),
		endTimeHH: String(body.endTimeHH ?? ""),
		endTimeMM: String(body.endTimeMM ?? ""),
		title: String(body.title ?? ""),
		where: String(body.where ?? ""),
		detail: String(body.detail ?? ""),
		endYear: String(body.endYear ?? ""),
		endMonth: String(body.endMonth ?? ""),
		endDate: String(body.endDate ?? ""),
		color: String(body.color ?? "primary"),
		attendanceMode: String(body.attendanceMode ?? "ABSENCE"),
	});
};

const deleteSchedule = async (request: Request, env: Env) => {
	const body = await getBody(request);
	const eventId = String(body.eventId ?? body.EVENT_ID ?? "").trim();
	if (!eventId) return error("eventId is required", 400);

	await env.DB.prepare("DELETE FROM schedules WHERE id = ?").bind(eventId).run();
	return ok(null, { message: "Schedule deleted" });
};

const getAbsences = async (url: URL, env: Env) => {
	const date = url.searchParams.get("date");
	const query = date
		? `SELECT a.* FROM absences a
			LEFT JOIN schedules s ON s.id = a.event_id
			WHERE s.date = ?
			ORDER BY a.submitted_at`
		: `SELECT * FROM absences ORDER BY submitted_at`;
	const statement = env.DB.prepare(query);
	const rows = date
		? await statement.bind(date).all<AbsenceRow>()
		: await statement.all<AbsenceRow>();

	return ok((rows.results || []).map(toAbsenceResponse), {
		count: rows.results?.length || 0,
	});
};

const getEventAbsences = async (url: URL, env: Env) => {
	const eventId = String(url.searchParams.get("eventId") ?? "").trim();
	const rows = await env.DB.prepare(
		`SELECT * FROM absences WHERE event_id = ? ORDER BY submitted_at`
	)
		.bind(eventId)
		.all<AbsenceRow>();
	return ok((rows.results || []).map(toAbsenceResponse), {
		count: rows.results?.length || 0,
	});
};

const upsertAbsence = async (request: Request, env: Env) => {
	const body = await getBody(request);
	const eventId = String(body.eventId ?? "").trim();
	const studentNumber = normalizeStudentId(body.studentNumber);
	if (!eventId || !studentNumber) {
		return error("eventId and studentNumber are required", 400);
	}

	await env.DB.prepare(
		`INSERT INTO absences (
			id, event_id, student_number, name, type, reason, reason_detail,
			time_leaving_early, time_step_out, time_return, event_title,
			event_date_label, event_time_label, event_where, submitted_at, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON CONFLICT(event_id, student_number) DO UPDATE SET
			name = excluded.name,
			type = excluded.type,
			reason = excluded.reason,
			reason_detail = excluded.reason_detail,
			time_leaving_early = excluded.time_leaving_early,
			time_step_out = excluded.time_step_out,
			time_return = excluded.time_return,
			event_title = excluded.event_title,
			event_date_label = excluded.event_date_label,
			event_time_label = excluded.event_time_label,
			event_where = excluded.event_where,
			updated_at = CURRENT_TIMESTAMP`
	)
		.bind(
			`${eventId}:${studentNumber}`,
			eventId,
			studentNumber,
			String(body.name ?? "").trim(),
			String(body.type ?? "").trim(),
			String(body.reason ?? "").trim(),
			String(body.reasonDetail ?? "").trim(),
			String(body.timeLeavingEarly ?? "").trim(),
			String(body.timeStepOut ?? "").trim(),
			String(body.timeReturn ?? "").trim(),
			String(body.eventTitle ?? "").trim(),
			String(body.eventDateLabel ?? "").trim(),
			String(body.eventTimeLabel ?? "").trim(),
			String(body.eventWhere ?? "").trim()
		)
		.run();

	return ok({
		timestamp: new Date().toISOString(),
		eventId,
		studentNumber,
	});
};

const deleteAbsence = async (request: Request, env: Env) => {
	const body = await getBody(request);
	await env.DB.prepare(
		"DELETE FROM absences WHERE event_id = ? AND lower(student_number) = lower(?)"
	)
		.bind(String(body.eventId ?? "").trim(), normalizeStudentId(body.studentNumber))
		.run();
	return ok(null, { message: "Absence deleted" });
};

const getNextMeeting = async (env: Env) => {
	const row = await env.DB.prepare(
		`SELECT event_id, date, time, mode, updated_by, updated_at
		FROM next_meeting_settings WHERE id = 1`
	).first<NextMeetingRow>();

	return ok(
		row
			? {
					eventId: row.event_id || undefined,
					date: row.date,
					time: row.time,
					mode: row.mode,
					updatedBy: row.updated_by,
					updatedAt: row.updated_at,
				}
			: null
	);
};

const updateNextMeeting = async (request: Request, env: Env) => {
	const body = await getBody(request);
	await env.DB.prepare(
		`INSERT INTO next_meeting_settings (id, event_id, date, time, mode, updated_by, updated_at)
		VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(id) DO UPDATE SET
			event_id = excluded.event_id,
			date = excluded.date,
			time = excluded.time,
			mode = excluded.mode,
			updated_by = excluded.updated_by,
			updated_at = CURRENT_TIMESTAMP`
	)
		.bind(
			String(body.eventId ?? "").trim() || null,
			String(body.date ?? "").trim(),
			String(body.time ?? "").trim(),
			String(body.mode ?? "IN_PERSON").trim(),
			String(body.updatedBy ?? "").trim()
		)
		.run();

	const response = await env.DB.prepare(
		`SELECT event_id, date, time, mode, updated_by, updated_at
		FROM next_meeting_settings WHERE id = 1`
	).first<NextMeetingRow>();

	return ok({
		eventId: response?.event_id || undefined,
		date: response?.date || String(body.date ?? ""),
		time: response?.time || String(body.time ?? ""),
		mode: response?.mode || String(body.mode ?? "IN_PERSON"),
		updatedBy: response?.updated_by || null,
		updatedAt: response?.updated_at || null,
	});
};

const getDashboardData = async (env: Env) => {
	const [absences, schedules, nextMeeting] = await Promise.all([
		env.DB.prepare("SELECT * FROM absences ORDER BY submitted_at").all<AbsenceRow>(),
		env.DB.prepare(
			`SELECT id, title, date, start_time, end_time, location, description,
				attendance_mode, created_by, created_at, updated_by, updated_at
			FROM schedules
			ORDER BY date, start_time, id`
		).all<ScheduleRow>(),
		env.DB.prepare(
			`SELECT event_id, date, time, mode, updated_by, updated_at
			FROM next_meeting_settings WHERE id = 1`
		).first<NextMeetingRow>(),
	]);

	return ok({
		absences: (absences.results || []).map(toAbsenceResponse),
		schedules: (schedules.results || []).map(toScheduleResponse),
		nextMeeting: nextMeeting
			? {
					eventId: nextMeeting.event_id || undefined,
					date: nextMeeting.date,
					time: nextMeeting.time,
					mode: nextMeeting.mode,
					updatedBy: nextMeeting.updated_by,
					updatedAt: nextMeeting.updated_at,
				}
			: null,
	});
};

const getNotifications = async (url: URL, env: Env) => {
	const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
	const rows = await env.DB.prepare(
		`SELECT
			s.id AS event_id,
			s.title,
			s.date,
			s.created_by,
			s.created_at,
			s.updated_by,
			s.updated_at,
			created_member.nickname AS created_by_name,
			updated_member.nickname AS updated_by_name
		FROM schedules s
		LEFT JOIN members created_member
			ON lower(created_member.student_number) = lower(s.created_by)
		LEFT JOIN members updated_member
			ON lower(updated_member.student_number) = lower(s.updated_by)
		ORDER BY COALESCE(s.updated_at, s.created_at) DESC
		LIMIT ?`
	)
		.bind(limit)
		.all<NotificationRow>();

	const notifications = (rows.results || []).flatMap((row) => {
		const created = {
			eventId: row.event_id,
			title: row.title,
			date: row.date,
			actionBy: row.created_by || "",
			actionByName: row.created_by_name || row.created_by || "不明",
			actionAt: row.created_at,
			actionType: "created" as const,
		};

		if (!row.updated_at || row.updated_at === row.created_at) {
			return [created];
		}

		return [
			{
				eventId: row.event_id,
				title: row.title,
				date: row.date,
				actionBy: row.updated_by || "",
				actionByName: row.updated_by_name || row.updated_by || "不明",
				actionAt: row.updated_at,
				actionType: "updated" as const,
			},
			created,
		];
	});

	return ok(notifications.slice(0, limit), { count: notifications.length });
};

const savePushSubscription = async (request: Request, env: Env) => {
	const body = await getBody(request);
	const subscription = body.subscription as
		| { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
		| undefined;
	const studentId = normalizeStudentId(body.studentId);
	if (!subscription?.endpoint || !studentId) {
		return error("studentId and subscription are required", 400);
	}

	await env.DB.prepare(
		`INSERT INTO push_subscriptions (endpoint, student_id, p256dh, auth, created_at, updated_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON CONFLICT(endpoint) DO UPDATE SET
			student_id = excluded.student_id,
			p256dh = excluded.p256dh,
			auth = excluded.auth,
			updated_at = CURRENT_TIMESTAMP`
	)
		.bind(
			subscription.endpoint,
			studentId,
			subscription.keys?.p256dh || "",
			subscription.keys?.auth || ""
		)
		.run();

	return ok(null, { message: "Subscription saved" });
};

const deletePushSubscription = async (request: Request, env: Env) => {
	const body = await getBody(request);
	await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")
		.bind(String(body.endpoint ?? "").trim())
		.run();
	return ok(null, { message: "Subscription deleted" });
};

const getPushSubscriptions = async (env: Env) => {
	const rows = await env.DB.prepare(
		`SELECT student_id, endpoint, p256dh, auth, created_at
		FROM push_subscriptions
		ORDER BY created_at`
	).all<PushSubscriptionRow>();

	return ok(
		(rows.results || []).map((row) => ({
			studentId: row.student_id,
			endpoint: row.endpoint,
			p256dh: row.p256dh,
			auth: row.auth,
			createdAt: row.created_at,
		})),
		{ count: rows.results?.length || 0 }
	);
};

const saveAccessLogs = async (request: Request, env: Env) => {
	const body = await getBody(request);
	const logs = Array.isArray(body.logs) ? body.logs : [];
	const statements = logs.map((log) => {
		const entry = log as Record<string, unknown>;
		return env.DB.prepare(
			`INSERT INTO access_logs (
				timestamp, client_timestamp, student_id, display_name, permission,
				path, method, user_agent, ip_hash
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(
			String(entry.timestamp ?? new Date().toISOString()),
			String(entry.clientTimestamp ?? ""),
			normalizeStudentId(entry.studentId),
			String(entry.displayName ?? ""),
			String(entry.permission ?? ""),
			String(entry.path ?? ""),
			String(entry.method ?? "GET"),
			String(entry.userAgent ?? ""),
			String(entry.ipHash ?? "")
		);
	});

	if (statements.length > 0) {
		await env.DB.batch(statements);
	}
	return ok(null, { count: statements.length });
};

const health = async (env: Env) => {
	await env.DB.prepare("SELECT 1").first();

	return ok({
		status: "ok",
		database: "connected",
	});
};

const routeGet = (url: URL, env: Env) => {
	const path = url.searchParams.get("path") || url.pathname.replace(/^\//, "");

	switch (path) {
		case "health":
			return health(env);
		case "members":
			return getMembers(env);
		case "verify-member":
			return verifyMember(url, env);
		case "schedules":
			return getSchedules(env);
		case "absences":
			return getAbsences(url, env);
		case "event-absences":
			return getEventAbsences(url, env);
		case "next-meeting":
			return getNextMeeting(env);
		case "dashboard-data":
			return getDashboardData(env);
		case "notifications":
			return getNotifications(url, env);
		case "push-subscriptions":
			return getPushSubscriptions(env);
		case "items":
			return ok([], { count: 0, message: "Items are not migrated to D1" });
		default:
			return notFound();
	}
};

const routePost = (request: Request, url: URL, env: Env) => {
	const path = url.searchParams.get("path") || url.pathname.replace(/^\//, "");

	switch (path) {
		case "members":
			return createMember(request, env);
		case "members/update":
			return updateMember(request, env);
		case "members/delete":
			return deleteMember(request, env);
		case "schedules":
			return createSchedule(request, env);
		case "schedules/update":
			return updateSchedule(request, env);
		case "schedules/delete":
			return deleteSchedule(request, env);
		case "absences":
		case "absences/update":
			return upsertAbsence(request, env);
		case "absences/delete":
			return deleteAbsence(request, env);
		case "next-meeting":
			return updateNextMeeting(request, env);
		case "push-subscribe":
			return savePushSubscription(request, env);
		case "push-unsubscribe":
			return deletePushSubscription(request, env);
		case "access-logs":
			return saveAccessLogs(request, env);
		default:
			return notFound();
	}
};

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		try {
			if (request.method === "GET") {
				return routeGet(url, env);
			}

			if (request.method === "POST") {
				return routePost(request, url, env);
			}

			return error("Method not allowed", 405);
		} catch (caught) {
			console.error("Worker API error", caught);
			return error(caught instanceof Error ? caught.message : "Internal error");
		}
	},
} satisfies ExportedHandler<Env>;
