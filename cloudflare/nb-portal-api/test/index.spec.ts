import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { beforeAll, describe, it, expect } from "vitest";
import worker from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Hello World worker", () => {
	beforeAll(async () => {
		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS schedules (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				date TEXT NOT NULL,
				start_time TEXT,
				end_time TEXT,
				location TEXT,
				description TEXT,
				attendance_mode TEXT NOT NULL DEFAULT 'ABSENCE',
				created_by TEXT,
				updated_by TEXT,
				created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
				is_past INTEGER NOT NULL DEFAULT 0
			)`
		).run();
		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS next_meeting_settings (
				id INTEGER PRIMARY KEY CHECK (id = 1),
				event_id TEXT,
				date TEXT NOT NULL,
				time TEXT NOT NULL,
				mode TEXT NOT NULL,
				updated_by TEXT,
				updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`
		).run();
	});

	it("responds with health status (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/health");
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			success: true,
			data: {
				status: "ok",
			},
		});
	});

	it("responds with health status (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/health");
		expect(response.status).toBe(200);
	});

	it("creates a schedule when next meeting is updated", async () => {
		const request = new IncomingRequest("http://example.com/next-meeting", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				date: "2099-01-23",
				time: "18:00",
				mode: "DISCORD",
				updatedBy: "test",
			}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);

		const responseBody = (await response.json()) as {
			success?: boolean;
			data?: { eventId?: string };
		};
		expect(responseBody.success).toBe(true);
		expect(responseBody.data?.eventId).toBeTruthy();

		const schedulesResponse = await worker.fetch(
			new IncomingRequest("http://example.com/schedules"),
			env,
			createExecutionContext()
		);
		const schedulesBody = (await schedulesResponse.json()) as {
			success?: boolean;
			data?: Array<Record<string, unknown>>;
		};
		const meetingSchedule = schedulesBody.data?.find(
			(schedule) => schedule.EVENT_ID === responseBody.data?.eventId
		);

		expect(meetingSchedule).toMatchObject({
			TITLE: "部会",
			YYYY: "2099",
			MM: "1",
			DD: "23",
			TIME_HH: "18",
			TIME_MM: "0",
			WHERE: "Discord",
		});
	});
});
