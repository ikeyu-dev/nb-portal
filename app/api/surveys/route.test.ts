// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    sendDiscordWebhook: vi.fn(),
    getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
    getBackendApiHeaders: vi.fn(() => ({ "x-nb-portal-api-key": "test-key" })),
}));

vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("@/src/shared/lib/discord", () => ({
    sendDiscordWebhook: mocks.sendDiscordWebhook,
}));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiUrl: mocks.getBackendApiUrl,
    getBackendApiHeaders: mocks.getBackendApiHeaders,
}));

import { GET, POST } from "./route";

describe("/api/surveys", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            studentId: "member1",
            memberName: "部員一",
            nickname: "あお",
        });
        mocks.sendDiscordWebhook.mockResolvedValue({ success: true });
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

    it("回答送信時は氏名とあだ名をセッションからWorkerへ渡す", async () => {
        const request = new NextRequest(
            "https://portal.example.test/api/surveys",
            {
                method: "POST",
                headers: {
                    host: "portal.example.test",
                    origin: "https://portal.example.test",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    action: "submit",
                    id: "survey-1",
                    answers: { q1: "a" },
                    respondentName: "偽装氏名",
                    respondentNickname: "偽装あだ名",
                }),
            }
        );

        await POST(request);

        const [, init] = vi.mocked(fetch).mock.calls[0];
        expect(JSON.parse(String(init?.body))).toEqual({
            action: "submit",
            id: "survey-1",
            answers: { q1: "a" },
            respondentName: "部員一",
            respondentNickname: "あお",
            actor: "member1",
        });
    });

    it("アンケートを初回公開したときだけDiscordへ内容とリンクを送る", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            Response.json({
                success: true,
                data: { id: "survey-1", publishedNow: true },
            })
        );
        const response = await POST(
            new NextRequest("https://portal.example.test/api/surveys", {
                method: "POST",
                headers: {
                    host: "portal.example.test",
                    origin: "https://portal.example.test",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    action: "publish",
                    id: "survey-1",
                    title: "練習日程アンケート",
                    deadlineAt: "2026-10-20T14:30:00.000Z",
                }),
            })
        );

        expect(response.status).toBe(200);
        expect(mocks.sendDiscordWebhook).toHaveBeenCalledWith({
            target: "survey",
            embeds: [
                {
                    author: { name: "新規アンケートが作成されました" },
                    title: "練習日程アンケート",
                    description: undefined,
                    color: 0x0ea5e9,
                    fields: [
                        {
                            name: "回答期限",
                            value: "2026/10/20 23:30",
                            inline: true,
                        },
                        {
                            name: "アンケートのリンク",
                            value: "https://portal.example.test/surveys/survey-1",
                            inline: false,
                        },
                    ],
                },
            ],
        });
    });

    it("公開済みアンケートの更新ではDiscordへ再通知しない", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            Response.json({
                success: true,
                data: { id: "survey-1", publishedNow: false },
            })
        );
        await POST(
            new NextRequest("https://portal.example.test/api/surveys", {
                method: "POST",
                headers: {
                    host: "portal.example.test",
                    origin: "https://portal.example.test",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    action: "publish",
                    id: "survey-1",
                    title: "更新後タイトル",
                    deadlineAt: "2026-10-20T14:30:00.000Z",
                }),
            })
        );

        expect(mocks.sendDiscordWebhook).not.toHaveBeenCalled();
    });
});
