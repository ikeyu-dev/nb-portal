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

import { GET } from "./route";

const request = (query = "") =>
    new NextRequest(`https://portal.example.test/api/backend${query}`);

const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

describe("GET /api/backend", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({ user: { email: "a123456@example.com" } });
        vi.stubGlobal("fetch", vi.fn());
    });

    it("未認証ユーザーへ401を返す", async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await GET(request("?path=schedules"));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("pathがない場合は400を返す", async () => {
        const response = await GET(request());

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: "path parameter is required",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("許可されていないpathを拒否する", async () => {
        const response = await GET(request("?path=admin"));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Invalid path" });
        expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
        ["?path=schedules&date=2026%2F08%2F28", "date: 日付はYYYY-MM-DD形式で指定してください"],
        ["?path=notifications&limit=0", "limit: Too small: expected number to be >=1"],
        ["?path=notifications&limit=101", "limit: Too big: expected number to be <=100"],
    ])("不正なクエリを拒否する: %s", async (query, detail) => {
        const response = await GET(request(query));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: "バリデーションエラー",
            details: [detail],
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("許可されたパスとクエリを認証情報付きで上流へ転送する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                success: true,
                data: [{ EVENT_ID: "EVENT-001" }],
            })
        );

        const response = await GET(
            request("?path=schedules&date=2026-08-28&limit=25&eventId=EVENT-001")
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
        expect(await response.json()).toEqual({
            success: true,
            data: [{ EVENT_ID: "EVENT-001" }],
        });
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=schedules&date=2026-08-28&limit=25&eventId=EVENT-001",
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
                cache: "no-store",
            }
        );
    });

    it("上流との通信失敗を500へ変換する", async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error("backend unavailable"));
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const response = await GET(request("?path=members"));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Internal server error" });
        consoleError.mockRestore();
    });

    it("上流がJSON以外を返した場合は500へ変換する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response("Service unavailable", { status: 503 })
        );
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const response = await GET(request("?path=health"));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Internal server error" });
        consoleError.mockRestore();
    });
});
