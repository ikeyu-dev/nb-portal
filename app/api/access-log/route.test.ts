// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    getBackendApiHeaders: vi.fn(() => ({
        "x-nb-portal-api-key": "test-api-key",
    })),
    getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
}));

vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiHeaders: mocks.getBackendApiHeaders,
    getBackendApiUrl: mocks.getBackendApiUrl,
}));

import { POST } from "./route";

const request = (clientTimestamp: string) =>
    new NextRequest("https://portal.example.test/api/access-log", {
        method: "POST",
        headers: {
            host: "portal.example.test",
            origin: "https://portal.example.test",
            "content-type": "application/json",
            "user-agent": "vitest-browser",
            "x-forwarded-for": "192.0.2.10, 198.51.100.20",
        },
        body: JSON.stringify({
            logs: [{ path: "/calendar", clientTimestamp }],
        }),
    });

const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

describe("POST /api/access-log", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            user: { name: "認証ユーザー" },
            studentId: "26D0001",
            displayName: "テスト部員",
            permission: "NORMAL",
        });
        vi.stubGlobal("fetch", vi.fn());
    });

    it.each([
        "2026-08-28T12:34:56+09:00",
        "2026-08-28T03:34:56.000Z",
    ])("ISO日時 %s を受理してWorkerへ転送する", async (clientTimestamp) => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, count: 1 })
        );

        const response = await POST(request(clientTimestamp));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, count: 1 });
        expect(fetch).toHaveBeenCalledOnce();

        const [url, options] = vi.mocked(fetch).mock.calls[0];
        expect(url).toBe(
            "https://backend.example.test/api?path=access-logs"
        );
        expect(options).toMatchObject({
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-nb-portal-api-key": "test-api-key",
            },
        });
        const body = JSON.parse(String(options?.body)) as {
            logs: Array<Record<string, unknown>>;
        };
        expect(body.logs).toEqual([
            {
                timestamp: expect.stringMatching(
                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/
                ),
                clientTimestamp,
                studentId: "26D0001",
                displayName: "テスト部員",
                permission: "NORMAL",
                path: "/calendar",
                method: "GET",
                userAgent: "vitest-browser",
                ipHash: expect.stringMatching(/^[a-f0-9]{64}$/),
            },
        ]);
    });

    it("不正な日時を400で拒否する", async () => {
        const response = await POST(request("2026/08/28 12:34:56"));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "Invalid access log payload",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("WorkerのHTTPエラーステータスを呼び出し元へ返す", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse(
                { success: false, error: "Database unavailable" },
                500
            )
        );

        const response = await POST(
            request("2026-08-28T12:34:56+09:00")
        );

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            success: false,
            error: "Database unavailable",
        });
    });
});
