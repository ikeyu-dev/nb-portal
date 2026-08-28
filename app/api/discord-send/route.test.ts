// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    process.env.PUSH_API_SECRET = "test-secret";
    return { sendDiscordWebhook: vi.fn() };
});

vi.mock("@/src/shared/lib/discord", () => ({
    sendDiscordWebhook: mocks.sendDiscordWebhook,
}));

import { POST } from "./route";

const request = (body: unknown, secret = "test-secret") =>
    new NextRequest("https://portal.example.test/api/discord-send", {
        method: "POST",
        headers: {
            authorization: `Bearer ${secret}`,
            "content-type": "application/json",
        },
        body: JSON.stringify(body),
    });

describe("POST /api/discord-send", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.sendDiscordWebhook.mockResolvedValue({ success: true });
    });

    it("シークレットが一致しない場合は401を返す", async () => {
        const response = await POST(request({ embeds: [{}] }, "wrong-secret"));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: "Unauthorized",
        });
        expect(mocks.sendDiscordWebhook).not.toHaveBeenCalled();
    });

    it("Embedがない場合は400を返す", async () => {
        const response = await POST(request({ content: "message" }));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "Invalid Discord payload",
        });
    });

    it("既定では出欠用WebhookへEmbedと本文を送る", async () => {
        const embeds = [{ title: "当日の出欠状況", color: 0x00aa66 }];

        const response = await POST(
            request({ target: "unknown", embeds, content: "<@&member>" })
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true });
        expect(mocks.sendDiscordWebhook).toHaveBeenCalledWith({
            target: "attendance",
            embeds,
            content: "<@&member>",
        });
    });

    it("meeting指定時は部会用Webhookを選ぶ", async () => {
        const embeds = [{ title: "次回部会" }];

        await POST(request({ target: "meeting", embeds }));

        expect(mocks.sendDiscordWebhook).toHaveBeenCalledWith({
            target: "meeting",
            embeds,
            content: "",
        });
    });

    it("Discord送信失敗を502で返す", async () => {
        mocks.sendDiscordWebhook.mockResolvedValue({
            success: false,
            error: "Discord unavailable",
        });

        const response = await POST(request({ embeds: [{}] }));

        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            success: false,
            error: "Discord unavailable",
        });
    });
});
