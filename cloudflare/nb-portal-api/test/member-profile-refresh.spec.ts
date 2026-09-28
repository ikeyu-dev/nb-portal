import { env, runInDurableObject } from "cloudflare:test";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import worker from "../src/index";

const key = "test-key";
const authorizedEnv = { ...env, D1_BACKEND_API_KEY: key };
afterEach(() => vi.restoreAllMocks());
const call = (path: string, identifier: string, authenticated = true) => worker.fetch(
	new Request(`https://example.com/?path=${path}&identifier=${identifier}`, {
		headers: authenticated ? { "x-nb-portal-api-key": key } : {},
	}), authorizedEnv,
);

beforeAll(async () => {
	await env.DB.prepare(`CREATE TABLE members (
		student_number TEXT PRIMARY KEY, name TEXT, nickname TEXT, permission TEXT, is_active INTEGER
	)`).run();
	await env.DB.exec("INSERT INTO members VALUES ('test001', 'Before', null, 'NORMAL', 1), ('test002', 'Other', null, 'HEAD', 1)");
});

it("shares one D1 lookup between callers", async () => {
	const logs = vi.spyOn(console, "info");
	const responses = await Promise.all(Array.from({ length: 8 }, () => call("session-member-profile", "test001")));
	const results = await Promise.all(responses.map(response => response.json<{ isMember: boolean; fetchedAt: number }>()));
	expect(responses.every(response => response.status === 200)).toBe(true);
	expect(results.every(result => result.isMember)).toBe(true);
	expect(new Set(results.map(result => result.fetchedAt)).size).toBe(1);
	const lookups = logs.mock.calls.map(([message]) => JSON.parse(String(message)));
	expect(lookups.filter(log => log.source === "d1")).toHaveLength(1);
	expect(new Set(lookups.map(log => log.lookupId)).size).toBe(1);
	const stub = env.MEMBER_PROFILE_REFRESH.getByName("test001");
	const again = await stub.getProfile("test001");
	expect(again.source).toBe("cache");
	expect(again.fetchedAt).toBe(results[0].fetchedAt);
});

it("rejects identifiers routed to another member's object", async () => {
	const stub = env.MEMBER_PROFILE_REFRESH.getByName("test001");
	await runInDurableObject(stub, async instance => {
		await expect(instance.getProfile("test002")).rejects.toThrow("routing mismatch");
	});
});

it("isolates members and bypasses the cache for authorization", async () => {
	await call("session-member-profile", "test001");
	await env.DB.exec("UPDATE members SET permission = 'HEAD' WHERE student_number = 'test001'");
	expect(await (await call("verify-member", "test001")).json()).toMatchObject({ permission: "HEAD" });
	expect(await (await call("session-member-profile", "test002")).json()).toMatchObject({ name: "Other" });
});

it("refreshes after five seconds", async () => {
	const stub = env.MEMBER_PROFILE_REFRESH.getByName("test001");
	const first = await stub.getProfile("test001");
	await runInDurableObject(stub, async (instance) => {
		const clock = vi.spyOn(Date, "now").mockReturnValue(first.fetchedAt + 5001);
		try {
			const next = await instance.getProfile("test001");
			expect(next.source).toBe("d1");
			expect(next.lookupId).not.toBe(first.lookupId);
		} finally { clock.mockRestore(); }
	});
});

it("does not cache missing members or errors", async () => {
	const stub = env.MEMBER_PROFILE_REFRESH.getByName("missing");
	expect((await stub.getProfile("missing")).profile.isMember).toBe(false);
	expect((await stub.getProfile("missing")).source).toBe("d1");
	await env.DB.exec("DROP TABLE members");
	await runInDurableObject(stub, async instance => {
		await expect(instance.getProfile("missing")).rejects.toThrow();
	});
	await env.DB.exec("CREATE TABLE members (student_number TEXT, name TEXT, nickname TEXT, permission TEXT, is_active INTEGER)");
	expect((await stub.getProfile("missing")).source).toBe("d1");
});

it("rejects requests without the API key", async () => {
	expect((await call("session-member-profile", "test001", false)).status).toBe(401);
});

it("records correlated timings without counting a cached lookup as a new D1 read", async () => {
	const logs = vi.spyOn(console, "info").mockImplementation(() => {});
	const traceId = crypto.randomUUID();
	for (let i = 0; i < 2; i++) {
		const response = await worker.fetch(new Request("https://example.com/?path=session-member-profile&identifier=test001", {
			headers: { "x-nb-portal-api-key": key, "x-nb-profile-trace-id": traceId },
		}), authorizedEnv);
		expect(response.status).toBe(200);
	}
	const records = logs.mock.calls.map(([message]) => JSON.parse(String(message)));
	expect(records[0]).toMatchObject({ traceId, source: "d1", rpcMs: expect.any(Number), lookupD1Ms: expect.any(Number), cacheAgeMs: expect.any(Number) });
	expect(records[1]).toMatchObject({ traceId, source: "cache", d1Ms: 0 });
	expect(records[0].d1Ms).toBe(records[0].lookupD1Ms);
	expect(records.every(record => record.rpcMs >= 0 && record.cacheAgeMs >= 0)).toBe(true);
	expect(JSON.stringify(records)).not.toMatch(/test001|Before|NORMAL/);
});

it("does not log arbitrary trace header contents", async () => {
	const logs = vi.spyOn(console, "info").mockImplementation(() => {});
	await worker.fetch(new Request("https://example.com/?path=session-member-profile&identifier=test001", {
		headers: { "x-nb-portal-api-key": key, "x-nb-profile-trace-id": "private detail" },
	}), authorizedEnv);
	expect(JSON.parse(String(logs.mock.calls[0][0]))).not.toHaveProperty("traceId");
});

it("returns a sanitized retryable error when the profile RPC fails", async () => {
	const logs = vi.spyOn(console, "info").mockImplementation(() => {});
	const failedEnv = { ...authorizedEnv, MEMBER_PROFILE_REFRESH: {
		getByName: () => ({ getProfile: async () => { throw new Error("private detail"); } }),
	} } as unknown as Env;
	const response = await worker.fetch(new Request("https://example.com/?path=session-member-profile&identifier=missing", {
		headers: { "x-nb-portal-api-key": key },
	}), failedEnv);
	expect(response.status).toBe(503);
	expect(await response.text()).not.toMatch(/SELECT|members|missing/);
	expect(JSON.parse(String(logs.mock.calls[0][0]))).toMatchObject({ outcome: "rpc-error", rpcMs: expect.any(Number) });
	expect(JSON.stringify(logs.mock.calls)).not.toMatch(/SELECT|missing|private detail/);
});
