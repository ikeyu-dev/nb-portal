import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
	getLineRelayContacts,
	handleLineRelayQueue,
	handleLineWebhook,
	lineRelayRetryPolicy,
	updateLineRelayContacts,
	verifyLineSignature,
	type LineRelayEnv,
	type LineRelayJob,
} from '../src/line-relay';

const HEAD = '126D000';
const NON_OFFICER = '126A000';
const SECRET = 'line-channel-secret-test';
const lineUserId = 'U0123456789abcdef0123456789abcdef';
const testRunId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const makeSignature = async (body: string, secret = SECRET) => {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
	let binary = '';
	for (const byte of digest) binary += String.fromCharCode(byte);
	return btoa(binary);
};

const makeContacts = () => [
	{ organizationKey: 'RFC', presidentName: '部長一', lineDisplayName: '', lineUserId: '' },
	{ organizationKey: 'YUYU', presidentName: '部長二', lineDisplayName: '[友遊部長]部長二', lineUserId },
	{ organizationKey: 'MFSC', presidentName: '部長三', lineDisplayName: '', lineUserId: '' },
	{ organizationKey: 'SOM', presidentName: '部長四', lineDisplayName: '', lineUserId: '' },
	{ organizationKey: 'NB', presidentName: '', lineDisplayName: '', lineUserId: '' },
];

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
	type: 'message',
	webhookEventId: '01JTESTEVENT000000000000000',
	timestamp: 1790000000000,
	source: { type: 'user', userId: lineUserId },
	message: { type: 'text', id: 'message-1', text: '連絡本文' },
	...overrides,
});

const makeQueueMessage = (body: LineRelayJob, attempts = 1) => ({
	body,
	attempts,
	ack: vi.fn(),
	retry: vi.fn(),
});

describe('LINE to Discord relay', () => {
	beforeAll(async () => {
		await env.DB.prepare(
			'CREATE TABLE members (student_number TEXT PRIMARY KEY, permission TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1)',
		).run();
		await env.DB.batch([
			env.DB.prepare('INSERT INTO members (student_number, permission) VALUES (?, ?)').bind(HEAD, 'HEAD'),
			env.DB.prepare('INSERT INTO members (student_number, permission) VALUES (?, ?)').bind(NON_OFFICER, 'NORMAL'),
		]);
		await applyD1Migrations(env.DB, env.TEST_LINE_RELAY_MIGRATIONS);
		await env.DB.prepare(
			"UPDATE line_relay_contacts SET president_name = '部長二', line_display_name = '[友遊部長]部長二', line_user_id = ? WHERE organization_key = 'YUYU'",
		)
			.bind(lineUserId)
			.run();
	});

	it('validates LINE HMAC signatures against the exact request body', async () => {
		const body = '{"events":[]}';
		const signature = await makeSignature(body);
		expect(await verifyLineSignature(body, signature, SECRET)).toBe(true);
		expect(await verifyLineSignature(`${body} `, signature, SECRET)).toBe(false);
		expect(await verifyLineSignature(body, signature, '')).toBe(false);
	});

	it('allows only active officers to read and update the four contact records', async () => {
		const denied = await getLineRelayContacts(env.DB, new URL(`https://example.com/?actor=${NON_OFFICER}`));
		expect(denied.status).toBe(403);

		const saved = await updateLineRelayContacts(
			env.DB,
			new Request('https://example.com/line-relay-contacts', {
				method: 'POST',
				body: JSON.stringify({ actor: HEAD, contacts: makeContacts() }),
			}),
		);
		expect(saved.status).toBe(200);
		const savedResult = (await saved.json()) as { data: Array<{ organizationKey: string; lineUserId: string | null }> };
		expect(savedResult.data.some((row) => row.organizationKey === 'RFC')).toBe(true);
		expect(savedResult.data.some((row) => row.organizationKey === 'YUYU' && row.lineUserId === lineUserId)).toBe(true);

		const duplicate = makeContacts();
		duplicate[2]!.lineUserId = lineUserId;
		const invalid = await updateLineRelayContacts(
			env.DB,
			new Request('https://example.com/line-relay-contacts', {
				method: 'POST',
				body: JSON.stringify({ actor: HEAD, contacts: duplicate }),
			}),
		);
		expect(invalid.status).toBe(400);
	});

	it('rejects invalid signatures and queues only mapped one-to-one user events', async () => {
		const queue = { send: vi.fn(async () => undefined) };
		const signedEnv = { ...env, LINE_CHANNEL_SECRET: SECRET, LINE_RELAY_QUEUE: queue as unknown as Queue } as LineRelayEnv;
		const payload = JSON.stringify({
			events: [
				makeEvent(),
				...Array.from({ length: 6 }, (_, index) =>
					makeEvent({
						webhookEventId: `unknown-${index}`,
						timestamp: Date.now() - (6 - index) * 1000,
						source: { type: 'user', userId: 'Uffffffffffffffffffffffffffffffff' },
						message: { type: 'text', id: `candidate-${index}`, text: `候補の連絡 ${index}` },
					}),
				),
				makeEvent({ webhookEventId: 'group', source: { type: 'group', userId: lineUserId } }),
			],
		});
		const invalid = await handleLineWebhook(new Request('https://example.com/line/webhook', { method: 'POST', body: payload }), signedEnv);
		expect(invalid.status).toBe(401);
		expect(queue.send).not.toHaveBeenCalled();

		const response = await handleLineWebhook(
			new Request('https://example.com/line/webhook', {
				method: 'POST',
				headers: { 'x-line-signature': await makeSignature(payload) },
				body: payload,
			}),
			signedEnv,
		);
		expect(response.status).toBe(200);
		expect(queue.send).toHaveBeenCalledTimes(1);
		expect(queue.send).toHaveBeenCalledWith(expect.objectContaining({ organizationKey: 'YUYU', kind: 'text', text: '連絡本文' }));
		const settings = await getLineRelayContacts(env.DB, new URL(`https://example.com/?actor=${HEAD}`));
		expect(await settings.json()).toMatchObject({
			data: expect.arrayContaining([expect.objectContaining({ organizationKey: 'NB', organizationName: 'NB' })]),
			candidates: [
				{
					userId: 'Uffffffffffffffffffffffffffffffff',
					lastSeenAt: expect.any(String),
					messages: [5, 4, 3, 2].map((index) => expect.objectContaining({ text: `候補の連絡 ${index}` })),
				},
			],
		});
		const deleteCandidate = (actor: string) =>
			updateLineRelayContacts(
				env.DB,
				new Request('https://example.com/line-relay-contacts', {
					method: 'POST',
					body: JSON.stringify({ actor, deleteCandidateUserId: 'Uffffffffffffffffffffffffffffffff' }),
				}),
			);
		expect((await deleteCandidate(NON_OFFICER)).status).toBe(403);
		expect((await deleteCandidate(HEAD)).status).toBe(200);
		const afterDelete = await getLineRelayContacts(env.DB, new URL(`https://example.com/?actor=${HEAD}`));
		expect(await afterDelete.json()).toMatchObject({ candidates: [] });
		const messages = await env.DB.prepare('SELECT count(*) AS count FROM line_relay_candidate_messages').first();
		expect(messages?.count).toBe(0);
	});

	it.each([
		['MP3', 'audio'],
		['m4a', 'audio'],
		['ppt', 'powerpoint'],
		['PPTX', 'powerpoint'],
	])('queues attached %s files but skips LINE voice messages', async (extension, kind) => {
		const queue = { send: vi.fn(async () => undefined) };
		const signedEnv = { ...env, LINE_CHANNEL_SECRET: SECRET, LINE_RELAY_QUEUE: queue as unknown as Queue } as LineRelayEnv;
		const fileName = `サンプル.${extension}`;
		const payload = JSON.stringify({
			events: [
				makeEvent({ message: { type: 'file', id: 'audio-1', fileName, fileSize: 1234 } }),
				makeEvent({ webhookEventId: 'voice-event', message: { type: 'audio', id: 'voice-1', contentProvider: { type: 'line' } } }),
			],
		});
		const response = await handleLineWebhook(
			new Request('https://example.com/line/webhook', {
				method: 'POST',
				headers: { 'x-line-signature': await makeSignature(payload) },
				body: payload,
			}),
			signedEnv,
		);
		expect(response.status).toBe(200);
		expect(queue.send).toHaveBeenCalledTimes(1);
		expect(queue.send).toHaveBeenCalledWith(expect.objectContaining({ kind, fileName, fileSize: 1234, messageId: 'audio-1' }));
	});

	it('reports unsupported media without requesting LINE file content', async () => {
		const queue = { send: vi.fn(async () => undefined) };
		const signedEnv = { ...env, LINE_CHANNEL_SECRET: SECRET, LINE_RELAY_QUEUE: queue as unknown as Queue } as LineRelayEnv;
		const payload = JSON.stringify({ events: [makeEvent({ message: { type: 'image', id: 'image-1' } })] });
		await handleLineWebhook(
			new Request('https://example.com/line/webhook', {
				method: 'POST',
				headers: { 'x-line-signature': await makeSignature(payload) },
				body: payload,
			}),
			signedEnv,
		);
		expect(queue.send).toHaveBeenCalledWith(expect.objectContaining({ kind: 'unsupported', unsupportedType: '写真' }));
		expect(lineRelayRetryPolicy).toEqual({ maxRetries: 3, retryDelaySeconds: 600 });
	});

	it('sends file metadata as an embed alongside the original attachment', async () => {
		const fileName = '資料.pdf';
		const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
			if (String(input).startsWith('https://api-data.line.me/')) {
				return new Response('test PDF', { headers: { 'Content-Type': 'application/pdf' } });
			}
			const form = init?.body as FormData;
			const payload = JSON.parse(String(form.get('payload_json')));
			expect(payload.content).toBeUndefined();
			expect(payload.embeds).toMatchObject([
				{
					title: '[友遊部長]部長二',
					fields: [{ name: 'ファイル名', value: fileName }],
					footer: { text: expect.stringMatching(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/) },
				},
			]);
			const attachment = form.get('files[0]') as File;
			expect(attachment.name).toBe(fileName);
			expect(await attachment.text()).toBe('test PDF');
			return new Response(null, { status: 204 });
		});
		vi.stubGlobal('fetch', fetchMock);
		const message = makeQueueMessage({
			eventId: `pdf-${testRunId}`,
			organizationKey: 'YUYU',
			userId: lineUserId,
			messageId: 'pdf-message',
			receivedAt: 1790000000000,
			kind: 'pdf',
			fileName,
		});
		await handleLineRelayQueue(
			{ messages: [message] } as unknown as MessageBatch<LineRelayJob>,
			{
				...env,
				LINE_CHANNEL_ACCESS_TOKEN: 'test-token',
				DISCORD_LINE_RELAY_WEBHOOK_URL: 'https://discord.com/api/webhooks/123456/secret',
				DISCORD_LINE_RELAY_THREAD_ID: '987654321',
			} as LineRelayEnv,
		);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(message.ack).toHaveBeenCalledOnce();
		expect(message.retry).not.toHaveBeenCalled();
	});

	it('splits long LINE text into Discord-sized messages and retries network errors', async () => {
		const job: LineRelayJob = {
			eventId: `long-text-${testRunId}`,
			organizationKey: 'YUYU',
			userId: lineUserId,
			messageId: 'long-text-message',
			receivedAt: 1790000000000,
			kind: 'text',
			text: 'あ'.repeat(4500),
		};
		const relayEnv = {
			...env,
			DISCORD_LINE_RELAY_WEBHOOK_URL: 'https://discord.com/api/webhooks/123456/secret',
			DISCORD_LINE_RELAY_THREAD_ID: '987654321',
		} as LineRelayEnv;
		const sentEmbeds: { title: string; description: string; footer: { text: string } }[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_input, init) => {
				const payload = JSON.parse(String(init?.body));
				expect(payload.content).toBeUndefined();
				expect(payload.allowed_mentions).toEqual({ parse: [] });
				sentEmbeds.push(...payload.embeds);
				return new Response(null, { status: 204 });
			}),
		);
		const longTextMessage = makeQueueMessage(job);
		await handleLineRelayQueue({ messages: [longTextMessage] } as unknown as MessageBatch<LineRelayJob>, relayEnv);
		expect(longTextMessage.ack).toHaveBeenCalledOnce();
		expect(sentEmbeds).toHaveLength(2);
		expect(sentEmbeds.every((embed) => embed.description.length <= 4096)).toBe(true);
		expect(sentEmbeds.map((embed) => embed.description).join('')).toBe(job.text);
		expect(sentEmbeds[0]?.title).toBe('[友遊部長]部長二');
		expect(sentEmbeds[0]?.footer.text).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2} \| 1\/2$/);

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('network down');
			}),
		);
		const failedMessage = makeQueueMessage({ ...job, eventId: `network-failure-${testRunId}`, text: '短文' });
		await handleLineRelayQueue({ messages: [failedMessage] } as unknown as MessageBatch<LineRelayJob>, relayEnv);
		expect(failedMessage.retry).toHaveBeenCalledWith({ delaySeconds: 600 });
		vi.unstubAllGlobals();
	});

	it('deduplicates completed events and retries temporary Discord failures after ten minutes', async () => {
		const job: LineRelayJob = {
			eventId: `queue-test-${testRunId}`,
			organizationKey: 'YUYU',
			userId: lineUserId,
			messageId: `message-queue-${testRunId}`,
			receivedAt: 1790000000000,
			kind: 'text',
			text: 'テスト本文',
		};
		const relayEnv = {
			...env,
			DISCORD_LINE_RELAY_WEBHOOK_URL: 'https://discord.com/api/webhooks/123456/secret',
			DISCORD_LINE_RELAY_THREAD_ID: '987654321',
		} as LineRelayEnv;
		const request = vi.fn(async () => new Response('temporary failure', { status: 503 }));
		vi.stubGlobal('fetch', request);
		const first = makeQueueMessage(job, 1);
		await handleLineRelayQueue({ messages: [first] } as unknown as MessageBatch<LineRelayJob>, relayEnv);
		expect(first.retry).toHaveBeenCalledWith({ delaySeconds: 600 });
		expect(first.ack).not.toHaveBeenCalled();
		await expect(
			env.DB.prepare('SELECT status FROM line_relay_events WHERE webhook_event_id = ?').bind(job.eventId).first(),
		).resolves.toMatchObject({ status: 'QUEUED' });

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(null, { status: 204 })),
		);
		const second = makeQueueMessage(job, 2);
		await handleLineRelayQueue({ messages: [second] } as unknown as MessageBatch<LineRelayJob>, relayEnv);
		expect(second.ack).toHaveBeenCalledOnce();
		await expect(
			env.DB.prepare('SELECT status FROM line_relay_events WHERE webhook_event_id = ?').bind(job.eventId).first(),
		).resolves.toMatchObject({ status: 'SENT' });

		const duplicate = makeQueueMessage(job, 1);
		await handleLineRelayQueue({ messages: [duplicate] } as unknown as MessageBatch<LineRelayJob>, relayEnv);
		expect(duplicate.ack).toHaveBeenCalledOnce();
		expect(request).toHaveBeenCalledOnce();
		vi.unstubAllGlobals();
	});
});
