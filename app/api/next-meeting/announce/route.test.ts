// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    process.env.DISCORD_MEETING_ROLE_MENTION = "<@&meeting-role>";
    return {
        auth: vi.fn(),
        resolveMemberProfile: vi.fn(),
        sendDiscordWebhook: vi.fn(),
        getBackendApiHeaders: vi.fn(() => ({
            "x-nb-portal-api-key": "test-api-key",
        })),
        getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
    };
});

vi.mock("@/src/auth", () => ({
    auth: mocks.auth,
    resolveMemberProfile: mocks.resolveMemberProfile,
}));
vi.mock("@/src/shared/lib/discord", () => ({
    sendDiscordWebhook: mocks.sendDiscordWebhook,
}));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiHeaders: mocks.getBackendApiHeaders,
    getBackendApiUrl: mocks.getBackendApiUrl,
}));

import { POST } from "./route";

const request = (headers: Record<string, string> = {}) =>
    new NextRequest("https://portal.example.test/api/next-meeting/announce", {
        method: "POST",
        headers: {
            host: "portal.example.test",
            origin: "https://portal.example.test",
            ...headers,
        },
    });

const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

describe("POST /api/next-meeting/announce", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            user: { email: "a123456@example.com" },
            studentId: "a123456",
            permission: "HEAD",
        });
        mocks.resolveMemberProfile.mockResolvedValue({ permission: "HEAD" });
        mocks.sendDiscordWebhook.mockResolvedValue({ success: true });
        vi.stubGlobal("fetch", vi.fn());
    });

    it("異なるOriginからの送信を認証前に拒否する", async () => {
        const response = await POST(
            request({ origin: "https://attacker.example.test" })
        );

        expect(response.status).toBe(403);
        expect(mocks.auth).not.toHaveBeenCalled();
    });

    it("未認証ユーザーへ401を返す", async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await POST(request());

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: "Unauthorized",
        });
    });

    it("部長・副部長以外を拒否する", async () => {
        mocks.auth.mockResolvedValue({
            user: { email: "a123456@example.com" },
            permission: "NORMAL",
        });

        const response = await POST(request());

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({
            success: false,
            error: "Forbidden",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("次回部会が未設定なら400を返す", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: null })
        );

        const response = await POST(request());

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "次回部会が設定されていません",
        });
        expect(mocks.sendDiscordWebhook).not.toHaveBeenCalled();
    });

    it("次回部会を取得して役職メンション付きEmbedを送信する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                success: true,
                data: {
                    date: "2026-09-01",
                    time: "18:05",
                    mode: "DISCORD",
                    updatedAt: "2026-08-28T12:34:56+09:00",
                    updatedBy: "a123456",
                    updatedByName: "部長 太郎",
                },
            })
        );

        const response = await POST(request());

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            message: "Next meeting announcement sent",
        });
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=next-meeting",
            {
                method: "GET",
                cache: "no-store",
                headers: { "x-nb-portal-api-key": "test-api-key" },
            }
        );
        expect(mocks.sendDiscordWebhook).toHaveBeenCalledWith({
            target: "meeting",
            content: "<@&meeting-role>",
            embeds: [
                {
                    title: "次回部会のお知らせ",
                    description: "次回部会は Discord で行います。",
                    color: 0x5865f2,
                    fields: [
                        {
                            name: "日時",
                            value: "2026/09/01(火) 18:05",
                            inline: false,
                        },
                    ],
                    footer: { text: "更新 2026/08/28 12:34 / a123456" },
                },
            ],
        });
    });

    it("Discord送信失敗を502へ変換する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                success: true,
                data: {
                    date: "2026-09-01",
                    time: "18:00",
                    mode: "IN_PERSON",
                },
            })
        );
        mocks.sendDiscordWebhook.mockResolvedValue({
            success: false,
            error: "Discord unavailable",
        });

        const response = await POST(request());

        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            success: false,
            error: "Discord unavailable",
        });
    });

    it("次回部会の取得失敗を500へ変換する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false, error: "Backend unavailable" }, 503)
        );
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const response = await POST(request());

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            success: false,
            error: "Backend unavailable",
        });
        consoleError.mockRestore();
    });
});
