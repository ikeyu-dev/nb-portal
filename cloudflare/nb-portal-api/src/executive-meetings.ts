type MeetingContent = {
	agendas: Array<{ id: string; title: string; body: string }>;
	other: string;
};

type RichTextNode = {
	type: string;
	text?: string;
	marks?: Array<{ type: string }>;
	attrs?: { start?: number };
	content?: RichTextNode[];
};

type MeetingRow = {
	id: string;
	series_id: string;
	meeting_number: number;
	meeting_date: string | null;
	start_time: string | null;
	location_type: string | null;
	location_detail: string;
	attendee_student_numbers_json: string;
	content_json: string;
	creator_student_number: string;
	created_at: string;
	updated_by: string;
	updated_at: string;
	discord_embed_state: string;
	discord_embed_started_at: string | null;
	discord_embed_sent_at: string | null;
	discord_embed_attempt_count: number;
	discord_embed_last_error: string | null;
	discord_body_state: string;
	discord_body_started_at: string | null;
	discord_body_sent_at: string | null;
	discord_body_attempt_count: number;
	discord_body_last_error: string | null;
	discord_sent_at: string | null;
};

const officers = ['HEAD', 'SUB_HEAD', 'ACCOUNTANT'];
const locations = ['MEETING_ROOM', 'DISCORD', 'CLUB_ROOM', 'OTHER'];
const reply = (data: unknown, status = 200) =>
	Response.json(
		{ success: status < 400, ...(status < 400 ? { data } : { error: data }) },
		{ status, headers: { 'Cache-Control': 'no-store' } },
	);
const fail = (message: string, status = 400) => reply(message, status);
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const jstDate = () => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Tokyo',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(new Date());
	return `${parts.find((part) => part.type === 'year')!.value}-${parts.find((part) => part.type === 'month')!.value}-${parts.find((part) => part.type === 'day')!.value}`;
};
const parseJson = <T>(value: string, fallback: T): T => {
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
};

const richTextPrefix = 'tiptap-json-v1:';
const richTextChildren: Record<string, string[]> = {
	doc: ['paragraph', 'bulletList', 'orderedList'],
	paragraph: ['text', 'hardBreak'],
	bulletList: ['listItem'],
	orderedList: ['listItem'],
	listItem: ['paragraph', 'bulletList', 'orderedList'],
	text: [],
	hardBreak: [],
};

const validateRichTextNode = (value: unknown, depth: number, state: { nodes: number; characters: number }): value is RichTextNode => {
	if (!value || typeof value !== 'object' || depth > 12) return false;
	const node = value as RichTextNode;
	if (!Object.hasOwn(richTextChildren, node.type)) return false;
	state.nodes += 1;
	if (state.nodes > 2000) return false;
	if (node.type === 'text') {
		if (typeof node.text !== 'string') return false;
		state.characters += node.text.length;
		if (state.characters > 20000) return false;
		return !node.marks || node.marks.every((mark) => mark.type === 'bold');
	}
	if (
		node.type === 'orderedList' &&
		node.attrs?.start !== undefined &&
		(!Number.isInteger(node.attrs.start) || node.attrs.start < 1 || node.attrs.start > 100000)
	)
		return false;
	if (node.content !== undefined && !Array.isArray(node.content)) return false;
	const children = node.content ?? [];
	if (node.type === 'listItem' && children[0]?.type !== 'paragraph') return false;
	return children.every((child) => richTextChildren[node.type].includes(child.type) && validateRichTextNode(child, depth + 1, state));
};

const normalizeAgendaBody = (value: unknown): string | null => {
	if (typeof value !== 'string' || value.length > 100000) return null;
	if (!value.startsWith(richTextPrefix)) return value.length <= 20000 ? value : null;
	try {
		const document = JSON.parse(value.slice(richTextPrefix.length)) as unknown;
		return validateRichTextNode(document, 0, { nodes: 0, characters: 0 }) && document.type === 'doc' ? value : null;
	} catch {
		return null;
	}
};
const normalizeContent = (value: unknown): MeetingContent | null => {
	if (!value || typeof value !== 'object') return null;
	const content = value as Record<string, unknown>;
	if (!Array.isArray(content.agendas) || content.agendas.length > 100) return null;
	const other = normalizeAgendaBody(content.other);
	if (other === null) return null;
	const agendas: MeetingContent['agendas'] = [];
	const ids = new Set<string>();
	for (const item of content.agendas) {
		if (!item || typeof item !== 'object') return null;
		const agenda = item as Record<string, unknown>;
		if (
			typeof agenda.id !== 'string' ||
			!/^[\w-]{1,80}$/.test(agenda.id) ||
			ids.has(agenda.id) ||
			typeof agenda.title !== 'string' ||
			agenda.title.length > 300
		)
			return null;
		const body = normalizeAgendaBody(agenda.body);
		if (body === null) return null;
		ids.add(agenda.id);
		agendas.push({ id: agenda.id, title: agenda.title, body });
	}
	return { agendas, other };
};
const isDate = (value: string) => {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!m) return false;
	const year = Number(m[1]);
	const month = Number(m[2]);
	const day = Number(m[3]);
	const d = new Date(0);
	d.setUTCHours(0, 0, 0, 0);
	d.setUTCFullYear(year, month - 1, day);
	return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
};
const isTime = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const readActor = (url: URL, body?: Record<string, unknown>) => String(body?.actor ?? url.searchParams.get('actor') ?? '').trim();
const decode = (row: MeetingRow) => ({
	id: row.id,
	seriesId: row.series_id,
	meetingNumber: row.meeting_number,
	title: `第${row.meeting_number}回 幹部役員会議`,
	meetingDate: row.meeting_date,
	startTime: row.start_time,
	locationType: row.location_type,
	locationDetail: row.location_detail,
	attendeeStudentNumbers: parseJson<string[]>(row.attendee_student_numbers_json, []),
	content: parseJson<MeetingContent>(row.content_json, { agendas: [], other: '' }),
	createdBy: row.creator_student_number,
	createdAt: row.created_at,
	updatedBy: row.updated_by,
	updatedAt: row.updated_at,
	discord: {
		embed: {
			state: row.discord_embed_state,
			sentAt: row.discord_embed_sent_at,
			attemptCount: row.discord_embed_attempt_count,
			error: row.discord_embed_last_error,
		},
		body: {
			state: row.discord_body_state,
			sentAt: row.discord_body_sent_at,
			attemptCount: row.discord_body_attempt_count,
			error: row.discord_body_last_error,
		},
		sentAt: row.discord_sent_at,
	},
});

async function authorize(db: D1Database, actor: string) {
	if (!actor) return { response: fail('ログインが必要です', 401), member: null };
	const member = await db
		.prepare('SELECT student_number, permission, is_active FROM members WHERE lower(student_number) = lower(?)')
		.bind(actor)
		.first<{ student_number: string; permission: string; is_active: number }>();
	if (!member || !member.is_active || !officers.includes(member.permission))
		return { response: fail('幹部役員のみ利用できます', 403), member: null };
	return { response: null, member };
}

async function getHead(db: D1Database) {
	return db
		.prepare("SELECT student_number FROM members WHERE permission = 'HEAD' AND is_active = 1 ORDER BY student_number LIMIT 1")
		.first<{ student_number: string }>();
}

async function ensureSeries(db: D1Database, actor: string) {
	const head = await getHead(db);
	if (!head) throw new Error('部長が登録されていません');
	let state = await db
		.prepare('SELECT current_series_id, observed_head_student_number FROM meeting_numbering_state WHERE id = 1')
		.first<{ current_series_id: string; observed_head_student_number: string }>();
	if (state && state.observed_head_student_number.toLowerCase() === head.student_number.toLowerCase()) return state.current_series_id;
	const seriesId = id();
	const timestamp = now();
	await db.batch([
		db
			.prepare(
				'INSERT INTO meeting_number_series (id, department_head_student_number, reset_reason, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
			)
			.bind(seriesId, head.student_number, state ? 'LEADER_CHANGED' : 'INITIAL', actor, timestamp),
		db
			.prepare(
				'INSERT INTO meeting_numbering_state (id, current_series_id, observed_head_student_number, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
			)
			.bind(seriesId, head.student_number, timestamp),
		db
			.prepare(
				'UPDATE meeting_numbering_state SET current_series_id = ?, observed_head_student_number = ?, updated_at = ? WHERE id = 1 AND lower(observed_head_student_number) <> lower(?)',
			)
			.bind(seriesId, head.student_number, timestamp, head.student_number),
	]);
	state = await db
		.prepare('SELECT current_series_id, observed_head_student_number FROM meeting_numbering_state WHERE id = 1')
		.first<{ current_series_id: string; observed_head_student_number: string }>();
	return state!.current_series_id;
}

async function readMeeting(db: D1Database, meetingId: string) {
	return db.prepare('SELECT * FROM executive_meetings WHERE id = ?').bind(meetingId).first<MeetingRow>();
}

const detail = async (db: D1Database, row: MeetingRow, actor: string) => {
	const result = decode(row);
	const attendees = await db
		.prepare(
			`SELECT m.student_number AS studentNumber, m.nickname, m.name FROM members m WHERE lower(m.student_number) IN (${result.attendeeStudentNumbers.map(() => '?').join(',') || "''"}) ORDER BY m.student_number`,
		)
		.bind(...result.attendeeStudentNumbers.map((number) => number.toLowerCase()))
		.all<{ studentNumber: string; nickname: string | null; name: string }>();
	const availableOfficers = await db
		.prepare(
			"SELECT student_number AS studentNumber, nickname, name, permission FROM members WHERE is_active = 1 AND permission IN ('HEAD','SUB_HEAD','ACCOUNTANT') ORDER BY permission, student_number",
		)
		.all<{ studentNumber: string; nickname: string | null; name: string; permission: string }>();
	const creator = await db
		.prepare('SELECT student_number AS studentNumber, nickname, name FROM members WHERE lower(student_number) = lower(?)')
		.bind(row.creator_student_number)
		.first<{ studentNumber: string; nickname: string | null; name: string }>();
	const resolvedAttendees = result.attendeeStudentNumbers.map(
		(number) =>
			attendees.results.find((item) => item.studentNumber.toLowerCase() === number.toLowerCase()) ?? {
				studentNumber: number,
				nickname: null,
				name: number,
			},
	);
	return {
		...result,
		attendees: resolvedAttendees,
		creator: creator ?? { studentNumber: row.creator_student_number, nickname: null, name: row.creator_student_number },
		availableOfficers: availableOfficers.results,
		markdown: buildMeetingMarkdown(row, resolvedAttendees),
		canEdit: row.creator_student_number.toLowerCase() === actor.toLowerCase(),
	};
};

export async function getExecutiveMeetings(db: D1Database, url: URL): Promise<Response> {
	const actor = readActor(url);
	const auth = await authorize(db, actor);
	if (auth.response) return auth.response;
	const meetingId = url.searchParams.get('id');
	if (meetingId) {
		const row = await readMeeting(db, meetingId);
		if (!row) return fail('議事録が見つかりません', 404);
		const since = url.searchParams.get('since');
		if (since && since === row.updated_at) return reply({ unchanged: true, updatedAt: row.updated_at });
		return reply(await detail(db, row, auth.member!.student_number));
	}
	const query = (url.searchParams.get('q') ?? '').trim().slice(0, 200).toLocaleLowerCase();
	const rows = await db
		.prepare('SELECT * FROM executive_meetings ORDER BY meeting_date DESC, start_time DESC, created_at DESC')
		.all<MeetingRow>();
	const decoded = rows.results.map(decode);
	const filtered = query
		? decoded.filter((meeting) =>
				[
					meeting.title,
					meeting.meetingDate,
					meeting.startTime,
					meeting.locationType,
					meeting.locationDetail,
					...meeting.content.agendas.flatMap((agenda) => [agenda.title, agenda.body]),
					meeting.content.other,
				]
					.join('\n')
					.toLocaleLowerCase()
					.includes(query),
			)
		: decoded;
	return reply(filtered);
}

const validateForDiscord = async (
	db: D1Database,
	row: MeetingRow,
	content = parseJson<MeetingContent>(row.content_json, { agendas: [], other: '' }),
) => {
	if (!row.meeting_date || !isDate(row.meeting_date) || !row.start_time || !isTime(row.start_time))
		return '開催日・開始時刻を入力してください';
	if (!row.location_type || !locations.includes(row.location_type) || (row.location_type === 'OTHER' && !row.location_detail.trim()))
		return '開催場所を入力してください';
	const attendees = parseJson<string[]>(row.attendee_student_numbers_json, []);
	if (!attendees.length || !attendees.some((studentNumber) => studentNumber.toLowerCase() === row.creator_student_number.toLowerCase()))
		return '出席者を選択してください';
	const validAttendees = await db
		.prepare(
			`SELECT COUNT(*) AS count FROM members WHERE is_active = 1 AND permission IN ('HEAD','SUB_HEAD','ACCOUNTANT') AND lower(student_number) IN (${attendees.map(() => '?').join(',') || "''"})`,
		)
		.bind(...attendees.map((value) => value.toLowerCase()))
		.first<{ count: number }>();
	if ((validAttendees?.count ?? 0) !== new Set(attendees.map((value) => value.toLowerCase())).size)
		return '出席者に現在の幹部役員以外が含まれています';
	if (!content.agendas.length || content.agendas.some((agenda) => !agenda.title.trim()))
		return '議題を1件以上作成し、議題名を入力してください';
	return null;
};

const asTime = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`).toISOString();
const locationLabel = (row: MeetingRow) =>
	(({ MEETING_ROOM: '会議室', DISCORD: 'Discord', CLUB_ROOM: '部室', OTHER: row.location_detail }) as Record<string, string>)[
		row.location_type ?? ''
	] ?? '';

const escapeMarkdown = (value: string) => value.replace(/([\\`*_{}\[\]()#+\-.!|>~])/g, '\\$1');

const richTextInlineMarkdown = (nodes: RichTextNode[] = []) =>
	nodes
		.map((node) => {
			if (node.type === 'hardBreak') return '\n';
			if (node.type !== 'text') return '';
			const text = escapeMarkdown(node.text ?? '');
			return node.marks?.some((mark) => mark.type === 'bold') ? `**${text}**` : text;
		})
		.join('');

const richTextListMarkdown = (node: RichTextNode, depth = 0): string =>
	(node.content ?? [])
		.map((item, index) => {
			const indent = '  '.repeat(depth);
			const ordered = node.type === 'orderedList';
			const number = (node.attrs?.start ?? 1) + index;
			const marker = ordered ? `${number}. ` : '- ';
			const blocks = item.content ?? [];
			const firstParagraph = blocks[0];
			const lines = [`${indent}${marker}${richTextInlineMarkdown(firstParagraph?.content)}`];
			for (const block of blocks.slice(1)) {
				if (block.type === 'bulletList' || block.type === 'orderedList') {
					lines.push(richTextListMarkdown(block, depth + 1));
				} else if (block.type === 'paragraph') {
					lines.push(`${'  '.repeat(depth + 1)}${richTextInlineMarkdown(block.content)}`);
				}
			}
			return lines.join('\n');
		})
		.join('\n');

export const agendaBodyToMarkdown = (body: string) => {
	if (!body.startsWith(richTextPrefix)) return body;
	try {
		const document = JSON.parse(body.slice(richTextPrefix.length)) as RichTextNode;
		if (!validateRichTextNode(document, 0, { nodes: 0, characters: 0 }) || document.type !== 'doc') return body;
		return (document.content ?? [])
			.map((node) => (node.type === 'paragraph' ? richTextInlineMarkdown(node.content) : richTextListMarkdown(node)))
			.join('\n\n');
	} catch {
		return body;
	}
};

export const buildMeetingMarkdown = (
	row: MeetingRow,
	attendees: Array<{ nickname: string | null; name: string; studentNumber: string }>,
) => {
	const data = decode(row);
	const date = row.meeting_date
		? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday: 'short' }).format(
				new Date(`${row.meeting_date}T12:00:00+09:00`),
			)
		: '';
	const attendeeNames = attendees.map((attendee) => attendee.nickname || attendee.name).join('、');
	const creator = attendees.find((attendee) => attendee.studentNumber.toLowerCase() === row.creator_student_number.toLowerCase());
	return [
		`## 第${row.meeting_number}回 幹部役員会議`,
		'',
		`開催日時：${date} ${row.start_time ?? ''} JST`,
		`場所：${locationLabel(row)}`,
		`出席者：${attendeeNames}`,
		`記録者：${creator?.nickname || creator?.name || row.creator_student_number}`,
		'',
		...data.content.agendas.flatMap((agenda) => [`### ${agenda.title}`, '', agendaBodyToMarkdown(agenda.body), '']),
		...(data.content.other ? ['### その他', '', agendaBodyToMarkdown(data.content.other), ''] : []),
	]
		.join('\n')
		.trim();
};

export async function postExecutiveMeetings(db: D1Database, request: Request): Promise<Response> {
	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return fail('入力が不正です');
	}
	const actor = String(body.actor ?? '').trim();
	const auth = await authorize(db, actor);
	if (auth.response) return auth.response;
	const action = body.action;
	if (action === 'create') {
		const seriesId = await ensureSeries(db, auth.member!.student_number);
		const meetingId = id();
		const timestamp = now();
		const content: MeetingContent = { agendas: [{ id: id(), title: '', body: '' }], other: '' };
		await db
			.prepare(
				'INSERT INTO executive_meetings (id, series_id, meeting_number, meeting_date, attendee_student_numbers_json, content_json, creator_student_number, created_at, updated_by, updated_at) SELECT ?, ?, COALESCE(MAX(meeting_number), 0) + 1, ?, ?, ?, ?, ?, ?, ? FROM executive_meetings WHERE series_id = ?',
			)
			.bind(
				meetingId,
				seriesId,
				jstDate(),
				JSON.stringify([auth.member!.student_number]),
				JSON.stringify(content),
				auth.member!.student_number,
				timestamp,
				auth.member!.student_number,
				timestamp,
				seriesId,
			)
			.run();
		const row = await readMeeting(db, meetingId);
		return reply(await detail(db, row!, auth.member!.student_number));
	}
	if (action === 'reset-numbering') {
		const head = await getHead(db);
		if (!head) return fail('部長が登録されていません');
		const seriesId = id();
		const timestamp = now();
		await db.batch([
			db
				.prepare(
					"INSERT INTO meeting_number_series (id, department_head_student_number, reset_reason, created_by, created_at) VALUES (?, ?, 'MANUAL', ?, ?)",
				)
				.bind(seriesId, head.student_number, auth.member!.student_number, timestamp),
			db
				.prepare(
					'INSERT INTO meeting_numbering_state (id, current_series_id, observed_head_student_number, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET current_series_id = excluded.current_series_id, observed_head_student_number = excluded.observed_head_student_number, updated_at = excluded.updated_at',
				)
				.bind(seriesId, head.student_number, timestamp),
		]);
		return reply({ seriesId });
	}
	const meetingId = String(body.id ?? '');
	if (!/^[\w-]{1,80}$/.test(meetingId)) return fail('議事録IDが不正です');
	const row = await readMeeting(db, meetingId);
	if (!row) return fail('議事録が見つかりません', 404);
	if (row.creator_student_number.toLowerCase() !== auth.member!.student_number.toLowerCase()) return fail('作成者のみ操作できます', 403);
	if (action === 'save') {
		const content = normalizeContent(body.content);
		const attendees = body.attendeeStudentNumbers;
		if (
			!content ||
			!Array.isArray(attendees) ||
			attendees.length > 50 ||
			attendees.some((value) => typeof value !== 'string') ||
			new Set(attendees.map((value) => String(value).toLowerCase())).size !== attendees.length
		)
			return fail('入力内容が不正です');
		const date = body.meetingDate === null || body.meetingDate === '' ? null : String(body.meetingDate);
		const start = body.startTime === null || body.startTime === '' ? null : String(body.startTime);
		const locationType = body.locationType === null || body.locationType === '' ? null : String(body.locationType);
		const locationDetail = typeof body.locationDetail === 'string' ? body.locationDetail : '';
		if (
			(date && !isDate(date)) ||
			(start && !isTime(start)) ||
			(locationType && !locations.includes(locationType)) ||
			locationDetail.length > 500
		)
			return fail('会議情報が不正です');
		if (attendees.length) {
			const valid = await db
				.prepare(
					`SELECT COUNT(*) AS count FROM members WHERE is_active = 1 AND permission IN ('HEAD','SUB_HEAD','ACCOUNTANT') AND lower(student_number) IN (${attendees.map(() => '?').join(',')})`,
				)
				.bind(...attendees.map((v) => String(v).toLowerCase()))
				.first<{ count: number }>();
			if ((valid?.count ?? 0) !== attendees.length) return fail('出席者に現在の幹部役員以外が含まれています');
		}
		const savedAttendees = [...new Set([auth.member!.student_number, ...attendees.map(String)])];
		await db
			.prepare(
				'UPDATE executive_meetings SET meeting_date = ?, start_time = ?, end_time = NULL, location_type = ?, location_detail = ?, attendee_student_numbers_json = ?, content_json = ?, updated_by = ?, updated_at = ? WHERE id = ?',
			)
			.bind(
				date,
				start,
				locationType,
				locationDetail,
				JSON.stringify(savedAttendees),
				JSON.stringify(content),
				auth.member!.student_number,
				now(),
				meetingId,
			)
			.run();
		return reply(await detail(db, (await readMeeting(db, meetingId))!, auth.member!.student_number));
	}
	if (action === 'delete') {
		await db.prepare('DELETE FROM executive_meetings WHERE id = ?').bind(meetingId).run();
		return reply({ id: meetingId });
	}
	if (action === 'claim-discord') {
		const validationError = await validateForDiscord(db, row);
		if (validationError) return fail(validationError);
		const part = row.discord_embed_state !== 'SENT' ? 'embed' : row.discord_body_state !== 'SENT' ? 'body' : null;
		if (!part) return fail('Discordへの送信は完了しています', 409);
		const state = part === 'embed' ? row.discord_embed_state : row.discord_body_state;
		const startedAt = part === 'embed' ? row.discord_embed_started_at : row.discord_body_started_at;
		const leaseExpired = !startedAt || Date.parse(startedAt) < Date.now() - 5 * 60 * 1000;
		if (state === 'SENDING' && !leaseExpired) return fail('Discord送信処理中です', 409);
		const current = await db
			.prepare(
				`UPDATE executive_meetings SET discord_${part}_state = 'SENDING', discord_${part}_started_at = ?, discord_${part}_attempt_count = discord_${part}_attempt_count + 1, discord_${part}_last_error = NULL WHERE id = ? AND discord_${part}_state <> 'SENT' AND (discord_${part}_state <> 'SENDING' OR discord_${part}_started_at IS NULL OR discord_${part}_started_at < ?)`,
			)
			.bind(now(), meetingId, new Date(Date.now() - 5 * 60 * 1000).toISOString())
			.run();
		if (!current.meta.changes) return fail('Discord送信状態が更新されました。再読み込みしてください', 409);
		const updated = await readMeeting(db, meetingId);
		const attendeeRows = await detail(db, updated!, actor);
		return reply({ part, meeting: attendeeRows, markdown: buildMeetingMarkdown(updated!, attendeeRows.attendees) });
	}
	if (action === 'discord-result') {
		const part = body.part === 'embed' || body.part === 'body' ? body.part : null;
		if (!part || typeof body.success !== 'boolean') return fail('送信結果が不正です');
		const stateColumn = part === 'embed' ? 'discord_embed_state' : 'discord_body_state';
		const sentColumn = part === 'embed' ? 'discord_embed_sent_at' : 'discord_body_sent_at';
		const startedColumn = part === 'embed' ? 'discord_embed_started_at' : 'discord_body_started_at';
		const errorColumn = part === 'embed' ? 'discord_embed_last_error' : 'discord_body_last_error';
		const timestamp = now();
		await db
			.prepare(
				`UPDATE executive_meetings SET ${stateColumn} = ?, ${startedColumn} = NULL, ${sentColumn} = ?, ${errorColumn} = ? WHERE id = ? AND ${stateColumn} = 'SENDING'`,
			)
			.bind(
				body.success ? 'SENT' : 'FAILED',
				body.success ? timestamp : null,
				body.success ? null : String(body.error ?? '送信に失敗しました').slice(0, 1000),
				meetingId,
			)
			.run();
		if (body.success) {
			const current = await db
				.prepare('SELECT discord_embed_state, discord_body_state FROM executive_meetings WHERE id = ?')
				.bind(meetingId)
				.first<{ discord_embed_state: string; discord_body_state: string }>();
			if (current?.discord_embed_state === 'SENT' && current.discord_body_state === 'SENT') {
				await db
					.prepare('UPDATE executive_meetings SET discord_sent_at = COALESCE(discord_sent_at, ?) WHERE id = ?')
					.bind(timestamp, meetingId)
					.run();
			}
		}
		return reply({ id: meetingId, part, success: body.success });
	}
	return fail('操作が不正です');
}
