// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    sendDiscordWebhook: vi.fn(),
}));

vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("@/src/shared/lib/discord", () => ({
    sendDiscordWebhook: mocks.sendDiscordWebhook,
}));

import { POST } from "./route";

const request = (headers: Record<string, string> = {}) =>
    new NextRequest("https://portal.example.test/api/discord-test", {
        method: "POST",
        headers: {
            host: "portal.example.test",
            origin: "https://portal.example.test",
            ...headers,
        },
    });

describe("POST /api/discord-test", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-28T03:34:56Z"));
        mocks.auth.mockResolvedValue({ user: { email: "a123456@example.com" } });
        mocks.sendDiscordWebhook.mockResolvedValue({ success: true });
    });

    afterEach(() => {
        vi.useRealTimers();
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

    it("固定形式のテストEmbedを送信する", async () => {
        const response = await POST(request());
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
            success: true,
            sentAt: "2026/8/28 12:34:56",
        });
        expect(mocks.sendDiscordWebhook).toHaveBeenCalledWith({
            embeds: [
                {
                    title: "Discord送信テスト",
                    color: 0x0ea5e9,
                    fields: [
                        { name: "送信元", value: "Next.js API", inline: true },
                        {
                            name: "送信日時",
                            value: "2026/8/28 12:34:56",
                            inline: true,
                        },
                    ],
                    footer: { text: "/api/discord-test" },
                },
            ],
        });
    });

    it("Discord送信失敗を502で返す", async () => {
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
});
