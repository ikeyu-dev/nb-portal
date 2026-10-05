declare module "cloudflare:test" {
	interface ProvidedEnv extends Env {
		TEST_ASSIGNED_MIGRATIONS: import("cloudflare:test").D1Migration[];
	}
}
