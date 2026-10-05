import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

const migrations = await readD1Migrations("./migrations");

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				miniflare: { bindings: { TEST_ASSIGNED_MIGRATIONS: migrations.filter(m => m.name === "0011_assigned_participants.sql") } },
				wrangler: { configPath: "./wrangler.jsonc" },
			},
		},
	},
});
