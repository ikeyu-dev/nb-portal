// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
    getBackendApiHeaders: vi.fn(() => ({ "x-nb-portal-api-key": "test-key" })),
}));

vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiUrl: mocks.getBackendApiUrl,
    getBackendApiHeaders: mocks.getBackendApiHeaders,
}));

import { GET, POST } from "./route";

describe("/api/surveys", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({ studentId: "member1" });
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockResolvedValue(Response.json({ success: true, data: [] }))
        );
    });

    afterEach(() => vi.unstubAllEnvs());

    it("未認証ならWorkerにアクセスしない", async () => {
        mocks.auth.mockResolvedValue(null);
        const response = await GET(
            new NextRequest("https://portal.example.test/api/surveys")
        );
        expect(response.status).toBe(401);
        expect(fetch).not.toHaveBeenCalled();
    });

    it("GETではログイン中の部員IDをWorkerへ渡す", async () => {
        await GET(
            new NextRequest(
                "https://portal.example.test/api/surveys?id=survey-1&actor=other"
            )
        );
        const [url] = vi.mocked(fetch).mock.calls[0];
        expect(new URL(String(url)).searchParams.get("actor")).toBe("member1");
        expect(new URL(String(url)).searchParams.get("id")).toBe("survey-1");
    });

    it("開発環境ではアンケートだけローカルWorkerへ接続できる", async () => {
        vi.stubEnv("NODE_ENV", "development");
        vi.stubEnv("SURVEY_BACKEND_URL", "http://127.0.0.1:8787");
        vi.stubEnv("SURVEY_BACKEND_API_KEY", "local-test-key");

        await GET(new NextRequest("https://portal.example.test/api/surveys"));

        const [url, init] = vi.mocked(fetch).mock.calls[0];
        expect(String(url)).toContain("http://127.0.0.1:8787/");
        expect(init?.headers).toMatchObject({
            "x-nb-portal-api-key": "local-test-key",
        });
    });

    it("POSTでは偽装された部員IDをセッションのIDで上書きする", async () => {
        const request = new NextRequest(
            "https://portal.example.test/api/surveys",
            {
                method: "POST",
                headers: {
                    host: "portal.example.test",
                    origin: "https://portal.example.test",
                    "content-type": "application/json",
                },
                body: JSON.stringify({ action: "create", actor: "other" }),
            }
        );
        await POST(request);
        const [, init] = vi.mocked(fetch).mock.calls[0];
        expect(JSON.parse(String(init?.body))).toEqual({
            action: "create",
            actor: "member1",
        });
    });
});
