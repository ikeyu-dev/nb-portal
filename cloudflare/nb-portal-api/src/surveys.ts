type QuestionType = 'short' | 'long' | 'single' | 'multiple' | 'date' | 'number';
type Option = { id: string; label: string };
type Question = { id: string; sectionId: string; label: string; type: QuestionType; required: boolean; options: Option[] };
type SurveySection = { id: string; title: string; description: string };
type Answers = Record<string, string | string[]>;
type SurveyRow = {
	id: string;
	title: string;
	description: string;
	creator_id: string;
	deadline_at: string | null;
	results_public: number;
	questions_json: string;
	sections_json: string;
	status: 'draft' | 'published' | 'closed';
	created_at: string;
	updated_at: string;
};
type ResponseRow = {
	student_id: string;
	draft_answers_json: string;
	submitted_answers_json: string | null;
	status: 'draft' | 'submitted';
	updated_at: string;
	submitted_at: string | null;
	current_section_id: string | null;
	respondent_name?: string | null;
	respondent_nickname?: string | null;
	name?: string | null;
	nickname?: string | null;
};

const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (message: string, status = 400) => reply({ success: false, error: message }, status);
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[\w-]{1,80}$/.test(value);
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const parsed = <T>(value: string | null, fallback: T): T => {
	try {
		return value ? (JSON.parse(value) as T) : fallback;
	} catch {
		return fallback;
	}
};
const isOpen = (survey: SurveyRow) => survey.status === 'published' && !!survey.deadline_at && Date.parse(survey.deadline_at) > Date.now();
const isCalendarDate = (value: string) => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const [, yearText, monthText, dayText] = match;
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	const date = new Date(0);
	date.setUTCHours(0, 0, 0, 0);
	date.setUTCFullYear(year, month - 1, day);
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const normalizeSurvey = (survey: SurveyRow) => {
	const sections = parsed<SurveySection[]>(survey.sections_json, [{ id: 'section-1', title: 'セクション1', description: '' }]);
	const firstSectionId = sections[0]?.id ?? 'section-1';
	const questions = parsed<Array<Omit<Question, 'sectionId'> & { sectionId?: string }>>(survey.questions_json, []).map((question) => ({
		...question,
		sectionId: question.sectionId && sections.some((section) => section.id === question.sectionId) ? question.sectionId : firstSectionId,
	}));
	return { sections, questions };
};

const validateSections = (value: unknown): value is SurveySection[] => {
	if (!Array.isArray(value) || value.length < 1 || value.length > 50) return false;
	const ids = new Set<string>();
	return value.every((section) => {
		if (!section || !identifier(section.id) || ids.has(section.id) || !text(section.title, 200) || !text(section.description, 2000))
			return false;
		ids.add(section.id);
		return true;
	});
};

const validateQuestions = (value: unknown, complete: boolean): value is Question[] => {
	if (!Array.isArray(value) || value.length > 50) return false;
	const ids = new Set<string>();
	for (const q of value) {
		if (!q || !identifier(q.id) || !identifier(q.sectionId) || ids.has(q.id) || !text(q.label, 500) || typeof q.required !== 'boolean')
			return false;
		if (!['short', 'long', 'single', 'multiple', 'date', 'number'].includes(q.type)) return false;
		if (!Array.isArray(q.options) || q.options.length > 100) return false;
		if (complete && ['single', 'multiple'].includes(q.type) && q.options.length < 2) return false;
		const optionIds = new Set<string>();
		for (const option of q.options) {
			if (!option || !identifier(option.id) || optionIds.has(option.id) || !text(option.label, 200) || (complete && !option.label.trim()))
				return false;
			optionIds.add(option.id);
		}
		ids.add(q.id);
	}
	return true;
};

const validateAnswers = (questions: Question[], value: unknown, required: boolean): value is Answers => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const answers = value as Record<string, unknown>;
	if (Object.keys(answers).some((id) => !questions.some((q) => q.id === id))) return false;
	for (const q of questions) {
		const answer = answers[q.id];
		if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
			if (required && q.required) return false;
			continue;
		}
		if (q.type === 'single' && (typeof answer !== 'string' || !q.options.some((o) => o.id === answer))) return false;
		if (
			q.type === 'multiple' &&
			(!Array.isArray(answer) ||
				answer.some((x) => typeof x !== 'string' || !q.options.some((o) => o.id === x)) ||
				new Set(answer).size !== answer.length)
		)
			return false;
		if (['short', 'long'].includes(q.type) && (typeof answer !== 'string' || answer.length > (q.type === 'short' ? 500 : 5000)))
			return false;
		if (q.type === 'date' && (typeof answer !== 'string' || !isCalendarDate(answer))) return false;
		if (
			q.type === 'number' &&
			(!text(answer, 100) || !/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(answer) || !Number.isFinite(Number(answer)))
		)
			return false;
	}
	return true;
};

const readSurvey = (db: D1Database, id: string) => db.prepare('SELECT * FROM surveys WHERE id = ?').bind(id).first<SurveyRow>();

export async function getSurveys(db: D1Database, url: URL): Promise<Response> {
	const actor = url.searchParams.get('actor');
	if (!identifier(actor)) return fail('ログインが必要です', 401);
	const id = url.searchParams.get('id');
	if (!id) {
		const rows = await db
			.prepare(
				"SELECT id, title, description, creator_id, deadline_at, results_public, status, created_at, updated_at FROM surveys WHERE status <> 'draft' OR creator_id = ? ORDER BY created_at DESC",
			)
			.bind(actor)
			.all();
		return reply({ success: true, data: rows.results });
	}
	if (!identifier(id)) return fail('アンケートIDが不正です');
	const survey = await readSurvey(db, id);
	if (!survey || (survey.status === 'draft' && survey.creator_id !== actor)) return fail('アンケートが見つかりません', 404);
	const mine = await db
		.prepare(
			'SELECT draft_answers_json, submitted_answers_json, status, updated_at, submitted_at, current_section_id FROM survey_responses WHERE survey_id = ? AND student_id = ?',
		)
		.bind(id, actor)
		.first<ResponseRow>();
	const canSeeResults = survey.creator_id === actor || (survey.status !== 'draft' && survey.results_public === 1);
	const { sections, questions } = normalizeSurvey(survey);
	const lockedQuestions = new Set<string>();
	const lockedOptions = new Set<string>();
	if (survey.creator_id === actor) {
		const all = await db
			.prepare('SELECT draft_answers_json, submitted_answers_json FROM survey_responses WHERE survey_id = ?')
			.bind(id)
			.all<ResponseRow>();
		for (const row of all.results) {
			for (const answers of [parsed<Answers>(row.draft_answers_json, {}), parsed<Answers>(row.submitted_answers_json, {})]) {
				for (const [questionId, answer] of Object.entries(answers)) {
					if (answer === '' || (Array.isArray(answer) && !answer.length)) continue;
					lockedQuestions.add(questionId);
					for (const optionId of Array.isArray(answer) ? answer : [answer]) lockedOptions.add(`${questionId}:${optionId}`);
				}
			}
		}
	}
	let responses: Array<Record<string, unknown>> | undefined;
	if (canSeeResults) {
		const rows = await db
			.prepare(
				"SELECT r.student_id, r.submitted_answers_json, r.submitted_at, r.respondent_name, r.respondent_nickname, m.name, m.nickname FROM survey_responses r LEFT JOIN members m ON lower(m.student_number) = lower(r.student_id) WHERE r.survey_id = ? AND r.status = 'submitted' ORDER BY r.submitted_at",
			)
			.bind(id)
			.all<ResponseRow>();
		responses = rows.results.map((r) => ({
			studentId: r.student_id,
			nickname: r.respondent_nickname || r.nickname || null,
			name: r.respondent_name || r.name || r.student_id,
			answers: parsed(r.submitted_answers_json, {}),
			submittedAt: r.submitted_at,
		}));
	}
	return reply({
		success: true,
		data: {
			id: survey.id,
			title: survey.title,
			description: survey.description,
			creatorId: survey.creator_id,
			deadlineAt: survey.deadline_at,
			resultsPublic: !!survey.results_public,
			status: survey.status,
			open: isOpen(survey),
			canEdit: survey.creator_id === actor,
			questions,
			sections,
			lockedQuestions: [...lockedQuestions],
			lockedOptions: [...lockedOptions],
			mine: mine
				? {
						draft: parsed(mine.draft_answers_json, {}),
						submitted: parsed(mine.submitted_answers_json, null),
						updatedAt: mine.updated_at,
						currentSectionId: sections.some((section) => section.id === mine.current_section_id)
							? mine.current_section_id
							: (sections[0]?.id ?? null),
					}
				: null,
			responses,
		},
	});
}

export async function postSurveys(db: D1Database, request: Request): Promise<Response> {
	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return fail('JSONが不正です');
	}
	const actor = body.actor;
	if (!identifier(actor)) return fail('ログインが必要です', 401);
	const action = body.action;
	if (action === 'create') {
		const id = crypto.randomUUID();
		await db.prepare('INSERT INTO surveys (id, creator_id) VALUES (?, ?)').bind(id, actor).run();
		return reply({ success: true, data: { id } });
	}
	const id = body.id;
	if (!identifier(id)) return fail('アンケートIDが不正です');
	const survey = await readSurvey(db, id);
	if (!survey) return fail('アンケートが見つかりません', 404);
	if (action === 'save' || action === 'publish' || action === 'close') {
		if (survey.creator_id !== actor) return fail('作成者のみ操作できます', 403);
		if (action === 'close') {
			if (survey.status !== 'published') return fail('受付中ではありません', 409);
			await db.prepare("UPDATE surveys SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
			return reply({ success: true });
		}
		if (survey.status === 'closed') return fail('締切済みのアンケートは編集できません', 409);
		const { title, description, deadlineAt, resultsPublic, questions, sections } = body;
		const complete = action === 'publish' || survey.status === 'published';
		if (
			!text(title, 200) ||
			!text(description, 4096) ||
			typeof resultsPublic !== 'boolean' ||
			!validateSections(sections) ||
			!validateQuestions(questions, complete)
		)
			return fail('アンケートの内容が不正です');
		if (questions.some((question) => !sections.some((section) => section.id === question.sectionId)))
			return fail('質問のセクションが不正です');
		if (deadlineAt !== null && (typeof deadlineAt !== 'string' || Number.isNaN(Date.parse(deadlineAt)))) return fail('締切日時が不正です');
		if (
			complete &&
			(!title.trim() ||
				!deadlineAt ||
				Date.parse(deadlineAt) <= Date.now() ||
				questions.length === 0 ||
				sections.some((section) => !section.title.trim()) ||
				sections.some((section) => !questions.some((question) => question.sectionId === section.id)) ||
				questions.some((q) => !q.label.trim()))
		)
			return fail('タイトル・質問・締切日時が必要です');
		const oldQuestions = parsed<Question[]>(survey.questions_json, []);
		const rows = await db
			.prepare('SELECT draft_answers_json, submitted_answers_json FROM survey_responses WHERE survey_id = ?')
			.bind(id)
			.all<ResponseRow>();
		for (const old of oldQuestions) {
			const current = questions.find((q) => q.id === old.id);
			for (const row of rows.results) {
				for (const answers of [parsed<Answers>(row.draft_answers_json, {}), parsed<Answers>(row.submitted_answers_json, {})]) {
					const answer = answers[old.id];
					if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) continue;
					if (!current || current.label !== old.label || current.type !== old.type)
						return fail('回答済みの質問は変更・削除できません', 409);
					const selected = Array.isArray(answer) ? answer : [answer];
					if (['single', 'multiple'].includes(old.type) && selected.some((value) => !current.options.some((o) => o.id === value)))
						return fail('回答済みの選択肢は削除できません', 409);
				}
			}
		}
		await db
			.prepare(
				'UPDATE surveys SET title = ?, description = ?, deadline_at = ?, results_public = ?, questions_json = ?, sections_json = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
			)
			.bind(
				title,
				description,
				deadlineAt,
				resultsPublic ? 1 : 0,
				JSON.stringify(questions),
				JSON.stringify(sections),
				action === 'publish' ? 'published' : survey.status,
				id,
			)
			.run();
		return action === 'publish'
			? reply({ success: true, data: { id, publishedNow: survey.status === 'draft' } })
			: reply({ success: true });
	}
	if (action === 'draft' || action === 'submit') {
		if (!isOpen(survey)) return fail('回答の受付は終了しました', 409);
		const { sections, questions } = normalizeSurvey(survey);
		if (!validateAnswers(questions, body.answers, action === 'submit')) return fail('回答内容が不正です');
		const currentSectionId =
			identifier(body.currentSectionId) && sections.some((section) => section.id === body.currentSectionId)
				? body.currentSectionId
				: (sections[0]?.id ?? null);
		const answers = JSON.stringify(body.answers);
		if (action === 'draft') {
			await db
				.prepare(
					'INSERT INTO survey_responses (survey_id, student_id, draft_answers_json, current_section_id) VALUES (?, ?, ?, ?) ON CONFLICT(survey_id, student_id) DO UPDATE SET draft_answers_json = excluded.draft_answers_json, current_section_id = excluded.current_section_id, updated_at = CURRENT_TIMESTAMP',
				)
				.bind(id, actor, answers, currentSectionId)
				.run();
		} else {
			const respondentName = typeof body.respondentName === 'string' ? body.respondentName : null;
			const respondentNickname = typeof body.respondentNickname === 'string' ? body.respondentNickname : null;
			await db
				.prepare(
					"INSERT INTO survey_responses (survey_id, student_id, draft_answers_json, submitted_answers_json, status, submitted_at, current_section_id, respondent_name, respondent_nickname) VALUES (?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP, ?, ?, ?) ON CONFLICT(survey_id, student_id) DO UPDATE SET draft_answers_json = excluded.draft_answers_json, submitted_answers_json = excluded.submitted_answers_json, status = 'submitted', submitted_at = CURRENT_TIMESTAMP, current_section_id = excluded.current_section_id, respondent_name = excluded.respondent_name, respondent_nickname = excluded.respondent_nickname, updated_at = CURRENT_TIMESTAMP",
				)
				.bind(id, actor, answers, answers, currentSectionId, respondentName, respondentNickname)
				.run();
		}
		return reply({ success: true });
	}
	return fail('操作が不正です');
}
