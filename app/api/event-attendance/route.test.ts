// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    revalidateTag: vi.fn(),
    getBackendApiHeaders: vi.fn(() => ({
        "x-nb-portal-api-key": "test-api-key",
    })),
    getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
}));

vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiHeaders: mocks.getBackendApiHeaders,
    getBackendApiUrl: mocks.getBackendApiUrl,
}));

import { GET, POST, PUT } from "./route";

const writeRequest = (
    method: "POST" | "PUT",
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
) =>
    new NextRequest("https://portal.example.test/api/event-attendance", {
        method,
        headers: {
            host: "portal.example.test",
            origin: "https://portal.example.test",
            "content-type": "application/json",
            ...headers,
        },
        body: JSON.stringify(body),
    });

const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

describe("GET /api/event-attendance", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            user: { email: "A12345678@example.com" },
        });
        vi.stubGlobal("fetch", vi.fn());
    });

    it("未認証ユーザーへ401を返す", async () => {
        mocks.auth.mockResolvedValue(null);
        const request = new NextRequest(
            "https://portal.example.test/api/event-attendance?eventId=EVENT-001"
        );

        const response = await GET(request);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: "Unauthorized",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("eventIdがない場合は400を返す", async () => {
        const response = await GET(
            new NextRequest("https://portal.example.test/api/event-attendance")
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "eventId is required",
        });
    });

    it("eventIdを付けて上流へ転送し、キャッシュを無効化する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                success: true,
                data: { eventId: "EVENT 001", studentNumbers: ["a123456"] },
            })
        );

        const response = await GET(
            new NextRequest(
                "https://portal.example.test/api/event-attendance?eventId=EVENT%20001"
            )
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
        expect(await response.json()).toEqual({
            success: true,
            data: { eventId: "EVENT 001", studentNumbers: ["a123456"] },
        });
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=event-attendance&eventId=EVENT+001",
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
                cache: "no-store",
            }
        );
    });

    it("上流のエラーステータスと本文を保持する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false, error: "Not found" }, 404)
        );

        const response = await GET(
            new NextRequest(
                "https://portal.example.test/api/event-attendance?eventId=UNKNOWN"
            )
        );

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            success: false,
            error: "Not found",
        });
    });
});

describe("POST/PUT /api/event-attendance", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            user: { email: "A12345678@example.com" },
        });
        vi.stubGlobal("fetch", vi.fn());
    });

    it("異なるOriginからの書き込みを認証前に拒否する", async () => {
        const response = await POST(
            writeRequest(
                "POST",
                { eventId: "EVENT-001", studentNumbers: [] },
                { origin: "https://attacker.example.test" }
            )
        );

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "CSRF validation failed" });
        expect(mocks.auth).not.toHaveBeenCalled();
    });

    it("未認証ユーザーへ401を返す", async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await POST(
            writeRequest("POST", {
                eventId: "EVENT-001",
                studentNumbers: [],
            })
        );

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: "Unauthorized",
        });
    });

    it("不正な出席者一覧へバリデーション応答を返す", async () => {
        const response = await POST(
            writeRequest("POST", {
                eventId: "EVENT-001",
                studentNumbers: ["invalid@example.com"],
            })
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "バリデーションエラー",
            details: [
                "studentNumbers.0: 学籍番号の形式を確認してください",
            ],
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
        ["POST", POST],
        ["PUT", PUT],
    ] as const)("%sは確認者を付けて出席者一覧を保存する", async (method, handler) => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: { updated: 2 } }, 201)
        );

        const response = await handler(
            writeRequest(method, {
                eventId: "EVENT-001",
                studentNumbers: ["a123456", "b234567"],
            })
        );

        expect(response.status).toBe(201);
        expect(await response.json()).toEqual({
            success: true,
            data: { updated: 2 },
        });
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=event-attendance",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
                body: JSON.stringify({
                    eventId: "EVENT-001",
                    studentNumbers: ["a123456", "b234567"],
                    checkedBy: "a123456",
                }),
            }
        );
        expect(mocks.revalidateTag).toHaveBeenCalledWith(
            "event-attendance",
            "max"
        );
    });

    it("上流が保存を拒否した場合はキャッシュを無効化しない", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false, error: "Conflict" }, 409)
        );

        const response = await POST(
            writeRequest("POST", {
                eventId: "EVENT-001",
                studentNumbers: [],
            })
        );

        expect(response.status).toBe(409);
        expect(mocks.revalidateTag).not.toHaveBeenCalled();
    });
});
