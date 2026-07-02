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
const BACKEND_API_KEY = "test-backend-api-key";
const authorizedEnv = {
	...env,
	D1_BACKEND_API_KEY: BACKEND_API_KEY,
};
const authorizedHeaders = (headers?: HeadersInit) => ({
	...headers,
	"x-nb-portal-api-key": BACKEND_API_KEY,
});

describe("Hello World worker", () => {
	beforeAll(async () => {
		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS schedules (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				date TEXT NOT NULL,
				end_date TEXT,
				start_time TEXT,
				end_time TEXT,
				location TEXT,
				description TEXT,
				color TEXT NOT NULL DEFAULT 'primary',
				attendance_mode TEXT NOT NULL DEFAULT 'ABSENCE',
				attendance_deadline TEXT,
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
		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS cron_executions (
				id TEXT PRIMARY KEY,
				cron TEXT NOT NULL,
				scheduled_time TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'running',
				started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
				completed_at TEXT,
				error TEXT,
				updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`
		).run();
		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS event_attendance (
				event_id TEXT NOT NULL,
				student_number TEXT NOT NULL,
				checked_by TEXT,
				checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (event_id, student_number)
			)`
		).run();
		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS members (
				student_number TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				nickname TEXT,
				is_joined_line INTEGER NOT NULL DEFAULT 0,
				line_name TEXT,
				is_joined_discord INTEGER NOT NULL DEFAULT 0,
				is_signed INTEGER NOT NULL DEFAULT 0,
				permission TEXT NOT NULL DEFAULT 'NORMAL',
				is_active INTEGER NOT NULL DEFAULT 1,
				created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

	it("rejects non-health requests without backend API key", async () => {
		const response = await worker.fetch(
			new IncomingRequest("http://example.com/members"),
			authorizedEnv,
			createExecutionContext()
		);
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({
			success: false,
			error: "Unauthorized",
		});
	});

	it("creates a schedule when next meeting is updated", async () => {
		const request = new IncomingRequest("http://example.com/next-meeting", {
			method: "POST",
			headers: authorizedHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				date: "2099-01-23",
				time: "18:00",
				mode: "DISCORD",
				updatedBy: "test",
			}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, authorizedEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);

		const responseBody = (await response.json()) as {
			success?: boolean;
			data?: { eventId?: string };
		};
		expect(responseBody.success).toBe(true);
		expect(responseBody.data?.eventId).toBeTruthy();

		const schedulesResponse = await worker.fetch(
			new IncomingRequest("http://example.com/schedules", {
				headers: authorizedHeaders(),
			}),
			authorizedEnv,
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
			ATTENDANCE_DEADLINE: "2099-01-21",
		});
	});

	it("stores and returns schedule end date", async () => {
		const request = new IncomingRequest("http://example.com/schedules", {
			method: "POST",
			headers: authorizedHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				year: "2099",
				month: "2",
				date: "10",
				endYear: "2099",
				endMonth: "2",
				endDate: "12",
				title: "合宿",
				where: "校外",
				detail: "終日イベント",
				color: "green",
				attendanceMode: "ABSENCE",
				attendanceDeadline: "2099-02-08",
				createdBy: "test",
			}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, authorizedEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);

		const responseBody = (await response.json()) as {
			success?: boolean;
			data?: {
				eventId?: string;
				endYear?: string;
				endMonth?: string;
				endDate?: string;
			};
		};
		expect(responseBody.success).toBe(true);
		expect(responseBody.data).toMatchObject({
			endYear: "2099",
			endMonth: "2",
			endDate: "12",
		});

		const schedulesResponse = await worker.fetch(
			new IncomingRequest("http://example.com/schedules", {
				headers: authorizedHeaders(),
			}),
			authorizedEnv,
			createExecutionContext()
		);
		const schedulesBody = (await schedulesResponse.json()) as {
			success?: boolean;
			data?: Array<Record<string, unknown>>;
		};
		const schedule = schedulesBody.data?.find(
			(item) => item.EVENT_ID === responseBody.data?.eventId
		);

		expect(schedule).toMatchObject({
			TITLE: "合宿",
			COLOR: "green",
			END_YYYY: "2099",
			END_MM: "2",
			END_DD: "12",
			ATTENDANCE_DEADLINE: "2099-02-08",
			IS_PAST: false,
		});
	});

	it("replaces and returns event attendance", async () => {
		await env.DB.prepare(
			`INSERT INTO members (
				student_number, name, nickname, permission, is_active
			)
			VALUES ('25d0001', '山田 太郎', 'やまだ', 'NORMAL', 1)
			ON CONFLICT(student_number) DO UPDATE SET
				name = excluded.name,
				nickname = excluded.nickname,
				permission = excluded.permission,
				is_active = excluded.is_active`
		).run();
		await env.DB.prepare(
			`INSERT INTO members (
				student_number, name, nickname, permission, is_active
			)
			VALUES ('25d9999', '卒業 花子', 'OB', 'OBOG', 1)
			ON CONFLICT(student_number) DO UPDATE SET
				name = excluded.name,
				nickname = excluded.nickname,
				permission = excluded.permission,
				is_active = excluded.is_active`
		).run();

		const updateRequest = new IncomingRequest(
			"http://example.com/event-attendance",
			{
				method: "POST",
				headers: authorizedHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					eventId: "event-attendance-test",
					studentNumbers: ["25D0001", "25d0001", "25d9999"],
					checkedBy: "25D9999",
				}),
			}
		);
		const ctx = createExecutionContext();
		const updateResponse = await worker.fetch(updateRequest, authorizedEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(updateResponse.status).toBe(200);
		expect(await updateResponse.json()).toMatchObject({
			success: true,
			count: 1,
			data: {
				eventId: "event-attendance-test",
				studentNumbers: ["25d0001"],
				checkedBy: "25d9999",
			},
		});

		const response = await worker.fetch(
			new IncomingRequest(
				"http://example.com/event-attendance?eventId=event-attendance-test",
				{ headers: authorizedHeaders() }
			),
			authorizedEnv,
			createExecutionContext()
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			success?: boolean;
			data?: Array<Record<string, unknown>>;
		};
		expect(body.success).toBe(true);
		expect(body.data).toEqual([
			expect.objectContaining({
				eventId: "event-attendance-test",
				studentNumber: "25d0001",
				name: "山田 太郎",
				displayName: "やまだ",
				permission: "NORMAL",
				checkedBy: "25d9999",
			}),
		]);
	});

	it("skips scheduled Discord sends when there is no event today", async () => {
		const ctx = createExecutionContext();
		await worker.scheduled(
			{
				cron: "50 23 * * *",
				scheduledTime: Date.now(),
				noRetry: () => {},
			} as ScheduledController,
			env,
			ctx
		);
		await waitOnExecutionContext(ctx);
	});

	it("skips meeting reminder when next meeting settings have no schedule row", async () => {
		const today = new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(new Date());
		await env.DB.prepare(
			`INSERT INTO next_meeting_settings (id, event_id, date, time, mode, updated_by, updated_at)
			VALUES (1, 'missing-event', ?, '18:00', 'DISCORD', 'test', CURRENT_TIMESTAMP)
			ON CONFLICT(id) DO UPDATE SET
				event_id = excluded.event_id,
				date = excluded.date,
				time = excluded.time,
				mode = excluded.mode,
				updated_by = excluded.updated_by,
				updated_at = CURRENT_TIMESTAMP`
		)
			.bind(today)
			.run();

		const ctx = createExecutionContext();
		await worker.scheduled(
			{
				cron: "0 9 * * *",
				scheduledTime: Date.now(),
				noRetry: () => {},
			} as ScheduledController,
			env,
			ctx
		);
		await waitOnExecutionContext(ctx);
	});
});
