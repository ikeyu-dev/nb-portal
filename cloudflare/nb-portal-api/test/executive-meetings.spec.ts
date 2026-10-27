import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { getExecutiveMeetings, postExecutiveMeetings } from '../src/executive-meetings';

const HEAD = '126D000';
const SUB_HEAD = '126E000';
const ACCOUNTANT = '126M000';
const MEMBER = '126A000';

const post = (actor: string, data: Record<string, unknown>) =>
	postExecutiveMeetings(
		env.DB,
		new Request('https://example.com/executive-meetings', {
			method: 'POST',
			body: JSON.stringify({ ...data, actor }),
		}),
	);

const get = (actor: string, search = '') =>
	getExecutiveMeetings(env.DB, new URL(`https://example.com/executive-meetings?actor=${actor}${search}`));

const responseData = async (response: Response) =>
	response.json() as Promise<{ success: boolean; data: Record<string, unknown>; error?: string }>;

const completeMeeting = (id: string) => ({
	action: 'save',
	id,
	meetingDate: '2026-10-27',
	startTime: '18:00',
	locationType: 'DISCORD',
	locationDetail: '',
	attendeeStudentNumbers: [HEAD, SUB_HEAD],
	content: {
		agendas: [{ id: 'agenda-1', title: '議題', body: '議事録本文' }],
		other: 'その他の内容',
	},
});

describe('executive meetings', () => {
	beforeAll(async () => {
		await env.DB.prepare(
			'CREATE TABLE members (student_number TEXT PRIMARY KEY, name TEXT NOT NULL, nickname TEXT, permission TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1)',
		).run();
		await env.DB.batch([
			env.DB.prepare('INSERT INTO members (student_number, name, nickname, permission) VALUES (?, ?, ?, ?)').bind(
				HEAD,
				'部長テスト',
				'部長あだ名',
				'HEAD',
			),
			env.DB.prepare('INSERT INTO members (student_number, name, nickname, permission) VALUES (?, ?, ?, ?)').bind(
				SUB_HEAD,
				'副部長テスト',
				'副部長あだ名',
				'SUB_HEAD',
			),
			env.DB.prepare('INSERT INTO members (student_number, name, nickname, permission) VALUES (?, ?, ?, ?)').bind(
				ACCOUNTANT,
				'会計テスト',
				'会計あだ名',
				'ACCOUNTANT',
			),
			env.DB.prepare('INSERT INTO members (student_number, name, nickname, permission) VALUES (?, ?, ?, ?)').bind(
				MEMBER,
				'部員テスト',
				'部員あだ名',
				'NORMAL',
			),
		]);
		await applyD1Migrations(env.DB, env.TEST_EXECUTIVE_MEETINGS_MIGRATIONS);
	});

	it('creates a live record with a number, today default, one blank agenda, and the creator as attendee', async () => {
		const response = await post(HEAD, { action: 'create' });
		expect(response.status).toBe(200);
		const created = await responseData(response);
		expect(created.data).toMatchObject({
			meetingNumber: 1,
			meetingDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
			attendeeStudentNumbers: [HEAD],
			content: { agendas: [{ title: '', body: '' }], other: '' },
			createdBy: HEAD,
			updatedBy: HEAD,
		});
		expect(created.data).not.toHaveProperty('status');
	});

	it('limits access to the three officer roles and editing to the creator', async () => {
		expect((await get(MEMBER)).status).toBe(403);
		expect((await post(MEMBER, { action: 'create' })).status).toBe(403);
		const created = await responseData(await post(HEAD, { action: 'create' }));
		const id = created.data.id as string;
		expect((await post(SUB_HEAD, completeMeeting(id))).status).toBe(403);
		expect((await get(SUB_HEAD, `&id=${id}`)).status).toBe(200);
	});

	it('saves live content, exposes the latest update, and searches agenda and other text', async () => {
		const created = await responseData(await post(HEAD, { action: 'create' }));
		const id = created.data.id as string;
		expect((await post(HEAD, completeMeeting(id))).status).toBe(200);
		const stored = await env.DB.prepare('SELECT end_time FROM executive_meetings WHERE id = ?')
			.bind(id)
			.first<{ end_time: string | null }>();
		expect(stored?.end_time).toBeNull();
		const detail = await responseData(await get(SUB_HEAD, `&id=${id}`));
		expect(detail.data).toMatchObject({
			content: { agendas: [{ title: '議題', body: '議事録本文' }], other: 'その他の内容' },
			attendees: [
				{ studentNumber: HEAD, nickname: '部長あだ名' },
				{ studentNumber: SUB_HEAD, nickname: '副部長あだ名' },
			],
			canEdit: false,
		});
		expect(detail.data.markdown).toContain('## 第1回 幹部役員会議');
		const unchanged = await responseData(await get(SUB_HEAD, `&id=${id}&since=${encodeURIComponent(String(detail.data.updatedAt))}`));
		expect(unchanged.data).toMatchObject({ unchanged: true });
		expect((await get(SUB_HEAD, `&q=${encodeURIComponent('議事録本文')}`)).status).toBe(200);
		expect(await (await get(SUB_HEAD, `&q=${encodeURIComponent('存在しない語')}`)).json()).toMatchObject({ data: [] });
		const edited = await post(HEAD, { ...completeMeeting(id), attendeeStudentNumbers: [SUB_HEAD] });
		expect((await responseData(edited)).data.attendeeStudentNumbers).toContain(HEAD);
		expect((await post(HEAD, { ...completeMeeting(id), meetingDate: '2026-02-30' })).status).toBe(400);
	});

	it('validates required fields when Discord sending begins', async () => {
		const created = await responseData(await post(HEAD, { action: 'create' }));
		const id = created.data.id as string;
		expect((await post(HEAD, { action: 'claim-discord', id })).status).toBe(400);
		expect((await post(HEAD, completeMeeting(id))).status).toBe(200);
		const claim = await post(HEAD, { action: 'claim-discord', id });
		expect(claim.status).toBe(200);
		expect(await responseData(claim)).toMatchObject({ data: { part: 'embed' } });
	});

	it('sends the embed before the body and retries only a failed part with current content', async () => {
		const created = await responseData(await post(HEAD, { action: 'create' }));
		const id = created.data.id as string;
		await post(HEAD, completeMeeting(id));
		const embedClaim = await responseData(await post(HEAD, { action: 'claim-discord', id }));
		expect(embedClaim.data.part).toBe('embed');
		expect((await post(HEAD, { action: 'discord-result', id, part: 'embed', success: true })).status).toBe(200);
		const bodyClaim = await responseData(await post(HEAD, { action: 'claim-discord', id }));
		expect(bodyClaim.data.part).toBe('body');
		await post(HEAD, completeMeeting(id));
		expect((await post(HEAD, { action: 'discord-result', id, part: 'body', success: false, error: 'failed' })).status).toBe(200);
		const retry = await responseData(await post(HEAD, { action: 'claim-discord', id }));
		expect(retry.data.part).toBe('body');
		expect(retry.data.meeting).toMatchObject({ content: { agendas: [{ body: '議事録本文' }] } });
		expect((await post(HEAD, { action: 'claim-discord', id })).status).toBe(409);
		await post(HEAD, { action: 'discord-result', id, part: 'body', success: true });
		expect((await responseData(await get(HEAD, `&id=${id}`))).data.discord).toMatchObject({ sentAt: expect.any(String) });
	});

	it('resets the number after a leader change and on a manual reset', async () => {
		const first = await responseData(await post(HEAD, { action: 'create' }));
		const second = await responseData(await post(HEAD, { action: 'create' }));
		expect(second.data.meetingNumber).toBe(2);
		expect((await post(SUB_HEAD, { action: 'reset-numbering' })).status).toBe(200);
		const afterManualReset = await responseData(await post(HEAD, { action: 'create' }));
		expect(afterManualReset.data.meetingNumber).toBe(1);
		await env.DB.prepare("UPDATE members SET permission = 'NORMAL' WHERE student_number = ?").bind(HEAD).run();
		await env.DB.prepare("UPDATE members SET permission = 'HEAD' WHERE student_number = ?").bind(SUB_HEAD).run();
		const afterLeaderChange = await responseData(await post(SUB_HEAD, { action: 'create' }));
		expect(afterLeaderChange.data.meetingNumber).toBe(1);
		await env.DB.prepare("UPDATE members SET permission = 'HEAD' WHERE student_number = ?").bind(HEAD).run();
		await env.DB.prepare("UPDATE members SET permission = 'SUB_HEAD' WHERE student_number = ?").bind(SUB_HEAD).run();
		expect(first.data.meetingNumber).toBe(1);
	});

	it('deletes permanently only for its creator', async () => {
		const created = await responseData(await post(HEAD, { action: 'create' }));
		const id = created.data.id as string;
		expect((await post(SUB_HEAD, { action: 'delete', id })).status).toBe(403);
		expect((await post(HEAD, { action: 'delete', id })).status).toBe(200);
		expect((await get(SUB_HEAD, `&id=${id}`)).status).toBe(404);
	});
});
