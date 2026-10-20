import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { getSurveys, postSurveys } from '../src/surveys';

const post = (actor: string, data: Record<string, unknown>) =>
	postSurveys(
		env.DB,
		new Request('https://example.com/surveys', {
			method: 'POST',
			body: JSON.stringify({ ...data, actor }),
		}),
	);
const get = (actor: string, id: string) => getSurveys(env.DB, new URL(`https://example.com/surveys?actor=${actor}&id=${id}`));
const body = async (response: Response) => response.json() as Promise<{ data: Record<string, unknown>; error?: string }>;

describe('general surveys', () => {
	beforeAll(async () => {
		await env.DB.prepare('CREATE TABLE members (student_number TEXT PRIMARY KEY, name TEXT NOT NULL, nickname TEXT)').run();
		await env.DB.prepare(
			"INSERT INTO members (student_number, name, nickname) VALUES ('member1', '部員一', 'あお'), ('member2', '部員二', 'みどり')",
		).run();
		await applyD1Migrations(env.DB, env.TEST_SURVEY_MIGRATIONS);
	});

	it('keeps drafts private and publishes only submitted answers', async () => {
		const created = await body(await post('member1', { action: 'create' }));
		const id = (created.data as { id: string }).id;
		expect((await get('member2', id)).status).toBe(404);
		expect(
			(
				await post('member1', {
					action: 'save',
					id,
					title: '',
					description: '',
					deadlineAt: null,
					resultsPublic: false,
					sections: [{ id: 'section-1', title: 'セクション1', description: '' }],
					questions: [
						{
							id: 'incomplete',
							sectionId: 'section-1',
							label: '',
							type: 'single',
							required: false,
							options: [
								{ id: 'blank1', label: '' },
								{ id: 'blank2', label: '' },
							],
						},
					],
				})
			).status,
		).toBe(200);
		const questions = [
			{
				id: 'q1',
				sectionId: 'section-1',
				label: '希望は？',
				type: 'single',
				required: true,
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' },
				],
			},
		];
		const sections = [{ id: 'section-1', title: 'セクション1', description: '' }];
		const settings = {
			id,
			title: '調査',
			description: '',
			deadlineAt: '2099-01-01T00:00:00.000Z',
			resultsPublic: true,
			sections,
			questions,
		};
		expect((await post('member1', { action: 'save', ...settings })).status).toBe(200);
		const published = await post('member1', { action: 'publish', ...settings });
		expect(published.status).toBe(200);
		expect((await body(published)).data).toEqual({ id, publishedNow: true });
		expect((await body(await post('member1', { action: 'publish', ...settings }))).data).toEqual({
			id,
			publishedNow: false,
		});
		expect((await post('member2', { action: 'draft', id, answers: { q1: 'a' } })).status).toBe(200);
		expect((await body(await get('member1', id))).data.responses).toEqual([]);
		expect((await post('member2', { action: 'submit', id, answers: {} })).status).toBe(400);
		expect((await post('member2', { action: 'submit', id, answers: { q1: 'a' } })).status).toBe(200);
		expect((await body(await get('member1', id))).data.responses).toMatchObject([
			{ name: '部員二', nickname: 'みどり', answers: { q1: 'a' } },
		]);
		await post('member2', { action: 'draft', id, answers: { q1: 'b' } });
		expect((await body(await get('member1', id))).data.responses).toMatchObject([{ answers: { q1: 'a' } }]);
		expect((await post('member2', { action: 'submit', id, answers: { q1: 'b' } })).status).toBe(200);
		expect((await body(await get('member1', id))).data.responses).toMatchObject([{ answers: { q1: 'b' } }]);
		expect((await post('member2', { action: 'save', ...settings })).status).toBe(403);
		expect((await post('member1', { action: 'save', ...settings, questions: [] })).status).toBe(400);
		expect(
			(
				await post('member1', {
					action: 'save',
					...settings,
					questions: [
						{
							...questions[0],
							options: [
								{ id: 'a', label: 'A' },
								{ id: 'c', label: 'C' },
							],
						},
					],
				})
			).status,
		).toBe(409);
		expect((await post('member1', { action: 'close', id })).status).toBe(200);
		expect((await post('member2', { action: 'draft', id, answers: { q1: 'a' } })).status).toBe(409);
	});

	it('shows private results only to the creator', async () => {
		const id = ((await body(await post('member1', { action: 'create' }))).data as { id: string }).id;
		const settings = {
			id,
			title: '非公開',
			description: '',
			deadlineAt: '2099-01-01T00:00:00.000Z',
			resultsPublic: false,
			sections: [{ id: 'section-1', title: 'セクション1', description: '' }],
			questions: [{ id: 'q2', sectionId: 'section-1', label: '意見', type: 'short', required: false, options: [] }],
		};
		await post('member1', { action: 'publish', ...settings });
		await post('member2', { action: 'submit', id, answers: { q2: '意見' } });
		expect((await body(await get('member2', id))).data.responses).toBeUndefined();
		expect((await body(await get('member1', id))).data.responses).toHaveLength(1);
	});

	it('validates every question type and locks answered question text', async () => {
		const id = ((await body(await post('member1', { action: 'create' }))).data as { id: string }).id;
		const questions = [
			{ id: 'short', sectionId: 'section-1', label: '短文', type: 'short', required: true, options: [] },
			{ id: 'long', sectionId: 'section-1', label: '長文', type: 'long', required: false, options: [] },
			{
				id: 'single',
				sectionId: 'section-1',
				label: '単一',
				type: 'single',
				required: true,
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' },
				],
			},
			{
				id: 'multiple',
				sectionId: 'section-1',
				label: '複数',
				type: 'multiple',
				required: true,
				options: [
					{ id: 'c', label: 'C' },
					{ id: 'd', label: 'D' },
				],
			},
			{ id: 'date', sectionId: 'section-1', label: '日付', type: 'date', required: true, options: [] },
			{ id: 'number', sectionId: 'section-1', label: '数値', type: 'number', required: true, options: [] },
		];
		const settings = {
			id,
			title: '質問形式',
			description: '',
			deadlineAt: '2099-01-01T00:00:00.000Z',
			resultsPublic: false,
			sections: [{ id: 'section-1', title: 'セクション1', description: '' }],
			questions,
		};
		expect((await post('member1', { action: 'publish', ...settings })).status).toBe(200);
		const answers = { short: 'はい', long: '説明', single: 'a', multiple: ['c', 'd'], date: '2098-12-30', number: '-12.5' };
		expect((await post('member2', { action: 'submit', id, answers: { ...answers, single: 'unknown' } })).status).toBe(400);
		expect((await post('member2', { action: 'submit', id, answers: { ...answers, multiple: ['c', 'c'] } })).status).toBe(400);
		expect((await post('member2', { action: 'submit', id, answers: { ...answers, date: '2098-02-30' } })).status).toBe(400);
		expect((await post('member2', { action: 'submit', id, answers: { ...answers, number: '0x10' } })).status).toBe(400);
		expect((await post('member2', { action: 'submit', id, answers })).status).toBe(200);
		expect(
			(await post('member1', { action: 'save', ...settings, questions: [{ ...questions[0], label: '変更' }, ...questions.slice(1)] }))
				.status,
		).toBe(409);
		expect(
			(
				await post('member1', {
					action: 'save',
					...settings,
					questions: [...questions, { id: 'extra', sectionId: 'section-1', label: '追加', type: 'short', required: false, options: [] }],
				})
			).status,
		).toBe(200);
	});
});
