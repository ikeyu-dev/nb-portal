const timestamp = "strftime('%Y-%m-%dT%H:%M:%S+09:00', 'now', '+9 hours')";
const failure = (message: string, status: number) => Response.json({ success: false, error: message }, { status });
export const normalizeParticipantIds = (value: unknown): string[] | null => {
	if (!Array.isArray(value) || value.length > 300 || value.some(id => typeof id !== "string" || !/^[a-z0-9-]{1,20}$/i.test(id.trim()))) return null;
	return [...new Set(value.map(id => id.trim().toLowerCase()))].sort();
};

export const scheduleOwner = (db: D1Database, eventId: string) => db.prepare(
	"SELECT created_by, COALESCE(NULLIF(attendance_mode, ''), 'ABSENCE') AS attendance_mode, participants_revision FROM schedules WHERE id = ?"
).bind(eventId).first<{ created_by: string | null; attendance_mode: string; participants_revision: number }>();

export const readScheduledParticipants = async (db: D1Database, eventId: string) => {
	// One SQL snapshot keeps the revision and the returned collection consistent.
	const rows = await db.prepare(`SELECT s.created_by, s.participants_revision,
		p.student_number, COALESCE(NULLIF(NULLIF(trim(m.nickname), ''), '---'), NULLIF(trim(m.name), ''), p.display_name_snapshot) AS display_name
		FROM schedules s LEFT JOIN scheduled_participants p ON p.event_id = s.id
		LEFT JOIN members m ON lower(m.student_number) = p.student_number
		WHERE s.id = ? ORDER BY p.student_number`).bind(eventId).all<{
		created_by: string | null; participants_revision: number; student_number: string | null; display_name: string | null;
	}>();
	if (!rows.results.length) return null;
	const participants = rows.results.filter(row => row.student_number !== null).map(row => ({ studentNumber: row.student_number!, displayName: row.display_name || "不明" }));
	return { eventId, createdBy: rows.results[0].created_by || "", revision: rows.results[0].participants_revision, participants, count: participants.length };
};

export const validateParticipantIds = async (db: D1Database, eventId: string, ids: string[]) => {
	const row = await db.prepare(`SELECT count(*) AS count FROM json_each(?) j WHERE
		EXISTS (SELECT 1 FROM members m WHERE lower(m.student_number) = j.value AND m.is_active = 1)
		OR EXISTS (SELECT 1 FROM scheduled_participants p WHERE p.event_id = ? AND p.student_number = j.value)`)
		.bind(JSON.stringify(ids), eventId).first<{ count: number }>();
	return row?.count === ids.length;
};

export const participantInsertStatement = (db: D1Database, eventId: string, ids: string[], actor: string) => db.prepare(
	`INSERT INTO scheduled_participants (event_id, student_number, display_name_snapshot, assigned_by, assigned_at)
	 SELECT ?, lower(m.student_number), COALESCE(NULLIF(NULLIF(trim(m.nickname), ''), '---'), NULLIF(trim(m.name), ''), '不明'), ?, ${timestamp}
	 FROM members m WHERE m.is_active = 1 AND lower(m.student_number) IN (SELECT value FROM json_each(?))
	 AND NOT EXISTS (SELECT 1 FROM scheduled_participants p WHERE p.event_id = ? AND p.student_number = lower(m.student_number))`
).bind(eventId, actor, JSON.stringify(ids), eventId);

// A failed assertion must abort the entire D1 batch, not just update zero rows.
export const assertParticipantCount = (db: D1Database, eventId: string, count: number) => db.prepare(
	"SELECT CASE WHEN (SELECT count(*) FROM scheduled_participants WHERE event_id = ?) = ? THEN 1 ELSE json('participant_count_conflict') END"
).bind(eventId, count);

export const getScheduledParticipants = async (db: D1Database, eventId: string) => {
	const data = await readScheduledParticipants(db, eventId);
	return data ? Response.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } }) : failure("予定が見つかりません", 404);
};

export const updateScheduledParticipants = async (db: D1Database, body: Record<string, unknown>) => {
	const eventId = typeof body.eventId === "string" ? body.eventId : "";
	const actor = typeof body.actor === "string" ? body.actor.trim().toLowerCase() : "";
	const ids = normalizeParticipantIds(body.studentNumbers);
	if (!eventId || !actor || !ids || !Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 0) return failure("入力内容を確認してください", 400);
	const owner = await scheduleOwner(db, eventId);
	if (!owner) return failure("予定が見つかりません", 404);
	if (!owner.created_by || owner.created_by.toLowerCase() !== actor) return failure("作成者のみ変更できます", 403);
	if (owner.attendance_mode !== "ASSIGNED") return failure("参加者指定の予定ではありません", 409);
	const current = await readScheduledParticipants(db, eventId);
	if (current && JSON.stringify(current.participants.map(p => p.studentNumber)) === JSON.stringify(ids)) return getScheduledParticipants(db, eventId);
	if (owner.participants_revision !== body.expectedRevision) return failure("参加者が更新されています。再読み込みしてください", 409);
	if (!await validateParticipantIds(db, eventId, ids)) return failure("指定できない部員が含まれています", 400);
	try {
		await db.batch([
			db.prepare(`SELECT CASE WHEN EXISTS (SELECT 1 FROM schedules WHERE id = ? AND lower(created_by) = ? AND attendance_mode = 'ASSIGNED' AND participants_revision = ?)
				THEN 1 ELSE json('participant_revision_conflict') END`).bind(eventId, actor, body.expectedRevision),
			db.prepare("DELETE FROM scheduled_participants WHERE event_id = ? AND student_number NOT IN (SELECT value FROM json_each(?))").bind(eventId, JSON.stringify(ids)),
			participantInsertStatement(db, eventId, ids, actor),
			assertParticipantCount(db, eventId, ids.length),
			db.prepare(`UPDATE schedules SET participants_revision = participants_revision + 1, updated_by = ?, updated_at = ${timestamp} WHERE id = ?`).bind(actor, eventId),
		]);
	} catch (error) {
		if (error instanceof Error && /malformed JSON|participant_.*conflict/.test(error.message)) return failure("参加者が更新されています。再読み込みしてください", 409);
		throw error;
	}
	return getScheduledParticipants(db, eventId);
};
