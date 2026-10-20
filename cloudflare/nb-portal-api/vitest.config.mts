import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

const migrations = await readD1Migrations('./migrations');

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				miniflare: {
					bindings: {
						TEST_ASSIGNED_MIGRATIONS: migrations.filter((m) => m.name === '0011_assigned_participants.sql'),
						TEST_SURVEY_MIGRATIONS: migrations.filter((m) =>
							['0012_general_surveys.sql', '0013_survey_sections.sql', '0014_survey_response_profile.sql'].includes(m.name),
						),
					},
				},
				wrangler: { configPath: './wrangler.jsonc' },
			},
		},
	},
});
