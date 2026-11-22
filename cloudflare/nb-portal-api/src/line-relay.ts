const officerPermissions = ['HEAD', 'SUB_HEAD', 'ACCOUNTANT'];
const organizationKeys = ['RFC', 'YUYU', 'MFSC', 'SOM', 'NB'] as const;
const retryDelaySeconds = 600;
const maxRetries = 3;
const defaultDiscordFileLimit = 20 * 1024 * 1024;
const discordEmbedDescriptionLimit = 4096;

type OrganizationKey = (typeof organizationKeys)[number];
type RelayContact = {
	organizationKey: OrganizationKey;
	organizationName: string;
	presidentName: string;
	lineDisplayName: string;
	lineUserId: string | null;
};
export type LineRelayJob = {
	eventId: string;
	organizationKey: OrganizationKey;
	userId: string;
	messageId: string;
	receivedAt: number;
	kind: 'text' | 'audio' | 'pdf' | 'powerpoint' | 'unsupported';
	text?: string;
	fileName?: string;
	fileSize?: number;
	unsupportedType?: string;
};
type LineEvent = {
	type?: string;
	webhookEventId?: string;
	timestamp?: number;
	source?: { type?: string; userId?: string };
	message?: {
		type?: string;
		id?: string;
		text?: string;
		fileName?: string;
		fileSize?: number;
		contentProvider?: { type?: string };
	};
};
export type LineRelayEnv = Env & {
	LINE_RELAY_QUEUE: Queue<LineRelayJob>;
	LINE_CHANNEL_SECRET?: string;
	LINE_CHANNEL_ACCESS_TOKEN?: string;
	DISCORD_LINE_RELAY_WEBHOOK_URL?: string;
	DISCORD_LINE_RELAY_THREAD_ID?: string;
	DISCORD_LINE_RELAY_MAX_FILE_BYTES?: string;
};

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (message: string, status = 400) => json({ success: false, error: message }, status);

const readActor = (url: URL, body?: Record<string, unknown>) => String(body?.actor ?? url.searchParams.get('actor') ?? '').trim();

const hasOfficerPermission = async (db: D1Database, actor: string) => {
	if (!actor) return false;
	const member = await db
		.prepare('SELECT permission FROM members WHERE lower(student_number) = lower(?) AND is_active = 1')
		.bind(actor)
		.first<{ permission: string }>();
	return Boolean(member && officerPermissions.includes(member.permission));
};

export const verifyLineSignature = async (body: string, signature: string, secret: string) => {
	if (!signature || !secret) return false;
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
	let binary = '';
	for (const byte of digest) binary += String.fromCharCode(byte);
	const expected = btoa(binary);
	if (signature.length !== expected.length) return false;
	let difference = 0;
	for (let index = 0; index < signature.length; index += 1) {
		difference |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
	}
	return difference === 0;
};

const classifyMessage = (event: LineEvent, organizationKey: OrganizationKey, userId: string): LineRelayJob | null => {
	if (event.type !== 'message' || !event.webhookEventId || !event.message?.id) return null;
	const message = event.message;
	if (!message.id) return null;
	const messageId = message.id;
	const common = {
		eventId: event.webhookEventId,
		organizationKey,
		userId,
		messageId,
		receivedAt: event.timestamp ?? Date.now(),
	};
	if (message.type === 'text' && typeof message.text === 'string') {
		return { ...common, kind: 'text', text: message.text };
	}
	if (message.type === 'audio') return null;
	if (message.type === 'file') {
		const fileName = String(message.fileName ?? 'ファイル');
		const kind = /\.pdf$/i.test(fileName)
			? 'pdf'
			: /\.pptx?$/i.test(fileName)
				? 'powerpoint'
				: /\.(mp3|m4a|aac|wav|flac|ogg|opus|aiff?)$/i.test(fileName)
					? 'audio'
					: null;
		if (kind) {
			return {
				...common,
				kind,
				fileName,
				...(Number.isFinite(message.fileSize) ? { fileSize: message.fileSize } : {}),
			};
		}
		return { ...common, kind: 'unsupported', fileName, unsupportedType: '対応していないファイル形式' };
	}
	const labels: Record<string, string> = {
		image: '写真',
		video: '動画',
		sticker: 'スタンプ',
		location: '位置情報',
	};
	return {
		...common,
		kind: 'unsupported',
		unsupportedType: labels[message.type ?? ''] ?? '未対応のメッセージ',
	};
};

const loadContacts = async (db: D1Database) => {
	const result = await db
		.prepare(
			`SELECT organization_key, organization_name, president_name, line_display_name, line_user_id
			FROM line_relay_contacts ORDER BY CASE organization_key
				WHEN 'RFC' THEN 1 WHEN 'YUYU' THEN 2 WHEN 'MFSC' THEN 3 WHEN 'SOM' THEN 4 ELSE 5 END`,
		)
		.all<{
			organization_key: OrganizationKey;
			organization_name: string;
			president_name: string;
			line_display_name: string;
			line_user_id: string | null;
		}>();
	return (result.results ?? []).map(
		(row) =>
			({
				organizationKey: row.organization_key,
				organizationName: row.organization_name,
				presidentName: row.president_name,
				lineDisplayName: row.line_display_name,
				lineUserId: row.line_user_id,
			}) satisfies RelayContact,
	);
};

export const getLineRelayContacts = async (db: D1Database, url: URL) => {
	if (!(await hasOfficerPermission(db, readActor(url)))) return fail('幹部役員のみ利用できます', 403);
	const candidates = await db
		.prepare(
			`SELECT line_user_id AS userId, last_seen_at AS lastSeenAt,
			(SELECT json_group_array(json_object('id', message_id, 'text', body, 'receivedAt', received_at))
				FROM (
					SELECT message_id, body, received_at FROM line_relay_candidate_messages
					WHERE line_user_id = candidate.line_user_id AND received_at >= ?
					ORDER BY received_at DESC, message_id DESC LIMIT 4
				)
			) AS messages FROM line_relay_candidates AS candidate
			WHERE last_seen_at >= ? AND NOT EXISTS (
				SELECT 1 FROM line_relay_contacts WHERE line_user_id = candidate.line_user_id
			) ORDER BY last_seen_at DESC, line_user_id LIMIT 100`,
		)
		.bind(candidateCutoff(), candidateCutoff())
		.all<{ userId: string; lastSeenAt: string; messages: string }>();
	return json({
		success: true,
		data: await loadContacts(db),
		candidates: candidates.results.map((candidate) => ({ ...candidate, messages: JSON.parse(candidate.messages) })),
	});
};

const candidateCutoff = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

const rememberCandidate = (db: D1Database, userId: string, event: LineEvent) => {
	const now = new Date().toISOString();
	const message = event.message;
	const eventDate = new Date(event.timestamp ?? NaN);
	const statements = [
		db.prepare('DELETE FROM line_relay_candidates WHERE last_seen_at < ?').bind(candidateCutoff()),
		db
			.prepare(
				`INSERT INTO line_relay_candidates (line_user_id, last_seen_at) VALUES (?, ?)
				ON CONFLICT(line_user_id) DO UPDATE SET last_seen_at = MAX(last_seen_at, excluded.last_seen_at)`,
			)
			.bind(userId, now),
	];
	if (message?.type === 'text' && message.id && typeof message.text === 'string') {
		statements.push(
			db
				.prepare(
					`INSERT INTO line_relay_candidate_messages (message_id, line_user_id, received_at, body)
				VALUES (?, ?, ?, ?) ON CONFLICT(message_id) DO NOTHING`,
				)
				.bind(message.id, userId, Number.isNaN(eventDate.getTime()) ? now : eventDate.toISOString(), message.text),
			db
				.prepare(
					`DELETE FROM line_relay_candidate_messages WHERE line_user_id = ? AND message_id NOT IN (
				SELECT message_id FROM line_relay_candidate_messages WHERE line_user_id = ?
				ORDER BY received_at DESC, message_id DESC LIMIT 4
			)`,
				)
				.bind(userId, userId),
		);
	}
	return db.batch(statements);
};

export const updateLineRelayContacts = async (db: D1Database, request: Request) => {
	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return fail('入力内容を読み取れません');
	}
	const actor = readActor(new URL(request.url), body);
	if (!(await hasOfficerPermission(db, actor))) return fail('幹部役員のみ利用できます', 403);
	if ('deleteCandidateUserId' in body) {
		const userId = body.deleteCandidateUserId;
		if (typeof userId !== 'string' || !/^U[0-9a-f]{32}$/i.test(userId)) return fail('LINEユーザーIDの形式が正しくありません');
		await db.prepare('DELETE FROM line_relay_candidates WHERE line_user_id = ?').bind(userId).run();
		return json({ success: true });
	}
	if (!Array.isArray(body.contacts) || body.contacts.length !== organizationKeys.length) return fail('部長一覧の形式が不正です');

	const submitted = new Map<OrganizationKey, Omit<RelayContact, 'organizationName'>>();
	for (const value of body.contacts) {
		if (!value || typeof value !== 'object') return fail('部長情報が不正です');
		const row = value as Record<string, unknown>;
		const key = String(row.organizationKey ?? '') as OrganizationKey;
		const presidentName = String(row.presidentName ?? '').trim();
		const lineDisplayName = String(row.lineDisplayName ?? '').trim();
		const rawUserId = String(row.lineUserId ?? '').trim();
		const lineUserId = rawUserId || null;
		if (
			!organizationKeys.includes(key) ||
			submitted.has(key) ||
			presidentName.length > 100 ||
			lineDisplayName.length > 100 ||
			(lineUserId !== null && !/^U[0-9a-f]{32}$/i.test(lineUserId))
		)
			return fail('部長名またはLINEユーザーIDを確認してください');
		submitted.set(key, { organizationKey: key, presidentName, lineDisplayName, lineUserId });
	}
	if (organizationKeys.some((key) => !submitted.has(key))) return fail('部長一覧に不足があります');
	const ids = [...submitted.values()].map((item) => item.lineUserId).filter((value): value is string => Boolean(value));
	if (new Set(ids).size !== ids.length) return fail('LINEユーザーIDが重複しています');

	const statements = organizationKeys.map((key) => {
		const contact = submitted.get(key)!;
		return db
			.prepare(
				`UPDATE line_relay_contacts SET president_name = ?, line_display_name = ?, line_user_id = ?,
					updated_by = ?, updated_at = ? WHERE organization_key = ?`,
			)
			.bind(contact.presidentName, contact.lineDisplayName, contact.lineUserId, actor, new Date().toISOString(), key);
	});
	try {
		await db.batch([
			...statements,
			db.prepare('DELETE FROM line_relay_candidates WHERE line_user_id IN (SELECT line_user_id FROM line_relay_contacts)'),
		]);
	} catch {
		return fail('部長情報を保存できませんでした', 409);
	}
	return json({ success: true, data: await loadContacts(db) });
};

const lineUserIdForEvent = async (db: D1Database, userId: string) =>
	db
		.prepare('SELECT organization_key FROM line_relay_contacts WHERE line_user_id = ?')
		.bind(userId)
		.first<{ organization_key: OrganizationKey }>();

const queueWebhookEvents = async (request: Request, env: LineRelayEnv) => {
	if (request.method !== 'POST') return fail('Method not allowed', 405);
	if (!env.LINE_CHANNEL_SECRET) return fail('LINE Webhook is not configured', 503);
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > 1024 * 1024) return fail('LINE webhook payload is too large', 413);
	const body = await request.text();
	if (new TextEncoder().encode(body).byteLength > 1024 * 1024) return fail('LINE webhook payload is too large', 413);
	const signature = request.headers.get('x-line-signature') ?? '';
	if (!(await verifyLineSignature(body, signature, env.LINE_CHANNEL_SECRET))) return fail('Invalid LINE signature', 401);
	let events: LineEvent[];
	try {
		const payload = JSON.parse(body) as { events?: unknown };
		if (!Array.isArray(payload.events)) return fail('Invalid LINE webhook payload');
		events = payload.events as LineEvent[];
	} catch {
		return fail('Invalid LINE webhook payload');
	}

	for (const event of events) {
		if (event.source?.type !== 'user' || !event.source.userId) continue;
		const contact = await lineUserIdForEvent(env.DB, event.source.userId);
		if (!contact) {
			if (event.type === 'message' && event.message && /^U[0-9a-f]{32}$/i.test(event.source.userId)) {
				await rememberCandidate(env.DB, event.source.userId, event);
			}
			continue;
		}
		const job = classifyMessage(event, contact.organization_key, event.source.userId);
		if (!job) continue;
		await env.LINE_RELAY_QUEUE.send(job);
	}
	return json({ success: true });
};

const safeFileName = (value: string) => {
	const name = value
		.replace(/[\\/\r\n\0]/g, '_')
		.replace(/[";]/g, '_')
		.trim();
	return name.slice(0, 180) || 'attachment';
};

const receivedDateLabel = (timestamp: number) =>
	new Intl.DateTimeFormat('ja-JP', {
		timeZone: 'Asia/Tokyo',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).format(new Date(timestamp));

const senderLabel = (contact: RelayContact) => contact.lineDisplayName || contact.presidentName || 'LINEユーザー';

const header = (contact: RelayContact, job: LineRelayJob) => `${senderLabel(contact)}\n受信日時: ${receivedDateLabel(job.receivedAt)}`;

const makeDiscordUrl = (env: LineRelayEnv) => {
	if (!env.DISCORD_LINE_RELAY_WEBHOOK_URL || !env.DISCORD_LINE_RELAY_THREAD_ID)
		throw new PermanentRelayError('LINE転送専用Discord送信先が設定されていません');
	let url: URL;
	try {
		url = new URL(env.DISCORD_LINE_RELAY_WEBHOOK_URL);
	} catch {
		throw new PermanentRelayError('LINE転送専用Discord Webhook URLが不正です');
	}
	if (url.hostname !== 'discord.com' || !/^\/api\/webhooks\/\d+\/[^/]+\/?$/.test(url.pathname))
		throw new PermanentRelayError('LINE転送専用Discord Webhook URLが不正です');
	url.searchParams.set('thread_id', env.DISCORD_LINE_RELAY_THREAD_ID);
	url.searchParams.set('wait', 'true');
	return url;
};

export class PermanentRelayError extends Error {}
export class RetryableRelayError extends Error {}

const discordPost = async (url: URL, payload: Record<string, unknown>, file?: { bytes: ArrayBuffer; name: string; type: string }) => {
	let response: Response;
	try {
		if (file) {
			const form = new FormData();
			form.set('payload_json', JSON.stringify(payload));
			form.set('files[0]', new Blob([file.bytes], { type: file.type || 'application/octet-stream' }), file.name);
			response = await fetch(url, { method: 'POST', body: form });
		} else {
			response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
		}
	} catch {
		throw new RetryableRelayError('Discordへの送信に失敗しました');
	}
	if (response.ok) return 'sent' as const;
	const responseText = await response.text().catch(() => '');
	if (file && (response.status === 413 || /file.{0,20}(too large|size limit)|entity too large/i.test(responseText)))
		return 'too-large' as const;
	if (response.status === 429 || response.status >= 500) throw new RetryableRelayError(`Discord returned ${response.status}`);
	throw new PermanentRelayError(`Discord returned ${response.status}`);
};

const lineContent = async (env: LineRelayEnv, messageId: string, maxBytes: number) => {
	if (!env.LINE_CHANNEL_ACCESS_TOKEN) throw new PermanentRelayError('LINE Messaging API token is not configured');
	let response: Response;
	try {
		response = await fetch(`https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`, {
			headers: { Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}` },
		});
	} catch {
		throw new RetryableRelayError('LINEからファイルを取得できませんでした');
	}
	if (response.status === 202 || response.status === 429 || response.status >= 500)
		throw new RetryableRelayError(`LINE content API returned ${response.status}`);
	if (!response.ok) throw new PermanentRelayError(`LINE content API returned ${response.status}`);
	if (Number(response.headers.get('content-length')) > maxBytes) return { tooLarge: true as const };
	if (!response.body) throw new RetryableRelayError('LINEからファイルを取得できませんでした');
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let totalBytes = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			totalBytes += value.byteLength;
			if (totalBytes > maxBytes) {
				await reader.cancel();
				return { tooLarge: true as const };
			}
			chunks.push(value);
		}
	} catch {
		throw new RetryableRelayError('LINEからファイルを取得できませんでした');
	}
	const bytes = new Uint8Array(totalBytes);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return { tooLarge: false as const, bytes: bytes.buffer, type: response.headers.get('content-type') ?? 'application/octet-stream' };
};

const getContact = async (db: D1Database, key: OrganizationKey) =>
	db
		.prepare(
			'SELECT organization_key, organization_name, president_name, line_display_name, line_user_id FROM line_relay_contacts WHERE organization_key = ?',
		)
		.bind(key)
		.first<{
			organization_key: OrganizationKey;
			organization_name: string;
			president_name: string;
			line_display_name: string;
			line_user_id: string | null;
		}>();

const claimRelayJob = async (db: D1Database, job: LineRelayJob, attempts: number) => {
	const now = new Date().toISOString();
	const inserted = await db
		.prepare(
			`INSERT OR IGNORE INTO line_relay_events
				(webhook_event_id, organization_key, status, processing_started_at, attempts, created_at, updated_at)
			VALUES (?, ?, 'PROCESSING', ?, ?, ?, ?)`,
		)
		.bind(job.eventId, job.organizationKey, now, attempts, now, now)
		.run();
	if (inserted.meta.changes) return true;
	const update = await db
		.prepare(
			`UPDATE line_relay_events SET status = 'PROCESSING', processing_started_at = ?, attempts = ?, updated_at = ?
			WHERE webhook_event_id = ? AND status = 'QUEUED'`,
		)
		.bind(now, attempts, now, job.eventId)
		.run();
	return update.meta.changes > 0;
};

const saveRelayState = async (db: D1Database, eventId: string, status: 'QUEUED' | 'SENT' | 'NOTICE' | 'FAILED', errorMessage?: string) => {
	await db
		.prepare('UPDATE line_relay_events SET status = ?, last_error = ?, updated_at = ? WHERE webhook_event_id = ?')
		.bind(status, errorMessage?.slice(0, 500) ?? null, new Date().toISOString(), eventId)
		.run();
};

const tooLargeNotice = (contact: RelayContact, job: LineRelayJob) =>
	`${header(contact, job)}\nファイル名: ${job.fileName || '音声メッセージ'}\nDiscordの添付上限を超えたためファイルを転送できませんでした。公式LINEのトークからダウンロードしてください。`;

const unsupportedNotice = (contact: RelayContact, job: LineRelayJob) =>
	`${header(contact, job)}\n転送対象外のファイルが届きました。\n種類: ${job.unsupportedType || '未対応'}${job.fileName ? `\nファイル名: ${job.fileName}` : ''}`;

const splitDiscordText = (content: string) => {
	const characters = Array.from(content);
	const chunks: string[] = [];
	let chunk = '';
	for (const character of characters) {
		if (chunk.length + character.length > discordEmbedDescriptionLimit) {
			chunks.push(chunk);
			chunk = '';
		}
		chunk += character;
	}
	if (chunk || chunks.length === 0) chunks.push(chunk);
	return chunks;
};

const processRelayJob = async (db: D1Database, env: LineRelayEnv, job: LineRelayJob) => {
	const contactRow = await getContact(db, job.organizationKey);
	if (!contactRow || contactRow.line_user_id !== job.userId) throw new PermanentRelayError('送信者の部長登録が変更されています');
	const contact: RelayContact = {
		organizationKey: contactRow.organization_key,
		organizationName: contactRow.organization_name,
		presidentName: contactRow.president_name,
		lineDisplayName: contactRow.line_display_name,
		lineUserId: contactRow.line_user_id,
	};
	const url = makeDiscordUrl(env);
	if (job.kind === 'unsupported') {
		await discordPost(url, { content: unsupportedNotice(contact, job), allowed_mentions: { parse: [] } });
		return 'NOTICE' as const;
	}
	if (job.kind === 'text') {
		const title = senderLabel(contact);
		const bodyChunks = splitDiscordText(job.text ?? '');
		const count = bodyChunks.length;
		for (const [index, chunk] of bodyChunks.entries()) {
			const partLabel = count > 1 ? ` | ${index + 1}/${count}` : '';
			await discordPost(url, {
				embeds: [
					{
						title,
						description: chunk,
						color: 0x06c755,
						footer: { text: `${receivedDateLabel(job.receivedAt)}${partLabel}` },
					},
				],
				allowed_mentions: { parse: [] },
			});
		}
		return 'SENT' as const;
	}
	const configuredLimit = Number(env.DISCORD_LINE_RELAY_MAX_FILE_BYTES);
	const limit = Number.isSafeInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : defaultDiscordFileLimit;
	if (job.fileSize !== undefined && job.fileSize > limit) {
		await discordPost(url, { content: tooLargeNotice(contact, job), allowed_mentions: { parse: [] } });
		return 'NOTICE' as const;
	}
	const content = await lineContent(env, job.messageId, limit);
	if (content.tooLarge) {
		await discordPost(url, { content: tooLargeNotice(contact, job), allowed_mentions: { parse: [] } });
		return 'NOTICE' as const;
	}
	const fileName = safeFileName(job.fileName || '音声メッセージ.m4a');
	const result = await discordPost(
		url,
		{
			embeds: [
				{
					title: senderLabel(contact),
					color: 0x06c755,
					fields: [{ name: 'ファイル名', value: fileName }],
					footer: { text: receivedDateLabel(job.receivedAt) },
				},
			],
			allowed_mentions: { parse: [] },
		},
		{ bytes: content.bytes, name: fileName, type: content.type },
	);
	if (result === 'too-large') {
		await discordPost(url, { content: tooLargeNotice(contact, job), allowed_mentions: { parse: [] } });
		return 'NOTICE' as const;
	}
	return 'SENT' as const;
};

export const handleLineWebhook = (request: Request, env: LineRelayEnv) => queueWebhookEvents(request, env);

export const handleLineRelayQueue = async (batch: MessageBatch<LineRelayJob>, env: LineRelayEnv) => {
	for (const message of batch.messages) {
		const job = message.body;
		try {
			if (!(await claimRelayJob(env.DB, job, message.attempts))) {
				message.ack();
				continue;
			}
			const status = await processRelayJob(env.DB, env, job);
			await saveRelayState(env.DB, job.eventId, status);
			message.ack();
		} catch (caught) {
			const messageText = caught instanceof Error ? caught.message : '転送処理に失敗しました';
			const retryable = caught instanceof RetryableRelayError;
			if (retryable && message.attempts <= maxRetries) {
				await saveRelayState(env.DB, job.eventId, 'QUEUED', messageText);
				message.retry({ delaySeconds: retryDelaySeconds });
				continue;
			}
			await saveRelayState(env.DB, job.eventId, 'FAILED', messageText);
			message.ack();
		}
	}
};

export const lineRelayRetryPolicy = { maxRetries, retryDelaySeconds };
