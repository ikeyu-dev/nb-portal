// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendDiscordWebhook } from "./discord";

describe("sendDiscordWebhook", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
        vi.stubEnv(
            "DISCORD_ATTENDANCE_WEBHOOK_URL",
            "https://discord.example.test/attendance"
        );
        vi.stubEnv(
            "DISCORD_MEETING_WEBHOOK_URL",
            "https://discord.example.test/meeting"
        );
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("出欠用WebhookへEmbedと本文を送る", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
        const embeds = [{ title: "当日の出欠状況" }];

        const result = await sendDiscordWebhook({
            embeds,
            content: "<@&member>",
        });

        expect(result).toEqual({ success: true });
        expect(fetch).toHaveBeenCalledWith(
            "https://discord.example.test/attendance",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ embeds, content: "<@&member>" }),
            }
        );
    });

    it("meeting指定時は部会用Webhookを使い、空の本文は送らない", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
        const embeds = [{ title: "次回部会" }];

        await sendDiscordWebhook({ target: "meeting", embeds, content: "" });

        expect(fetch).toHaveBeenCalledWith(
            "https://discord.example.test/meeting",
            expect.objectContaining({ body: JSON.stringify({ embeds }) })
        );
    });

    it("Webhook URLが未設定なら送信しない", async () => {
        vi.stubEnv("DISCORD_MEETING_WEBHOOK_URL", "");

        const result = await sendDiscordWebhook({
            target: "meeting",
            embeds: [{}],
        });

        expect(result).toEqual({
            success: false,
            error: "DISCORD_MEETING_WEBHOOK_URL is not configured",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("Discordのエラー本文を500文字まで返す", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response("x".repeat(600), { status: 429 })
        );

        const result = await sendDiscordWebhook({ embeds: [{}] });

        expect(result).toEqual({
            success: false,
            error: "Discord webhook failed: 429",
            detail: "x".repeat(500),
        });
    });
});
