// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendPushNotification } from "./push-notification-server";

describe("sendPushNotification", () => {
    beforeEach(() => {
        vi.stubEnv("PUSH_API_SECRET", "test-secret");
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("同一オリジンのPush APIへシークレット付きで送信する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({ success: true, sent: 2 }), {
                status: 200,
                headers: { "content-type": "application/json" },
            })
        );
        const payload = {
            title: "予定更新",
            body: "部会の日程が変わりました",
            url: "/calendar",
            tag: "schedule-update",
        };

        const result = await sendPushNotification(
            "https://portal.example.test",
            payload
        );

        expect(result).toEqual({ success: true, sent: 2 });
        expect(fetch).toHaveBeenCalledWith(
            new URL("https://portal.example.test/api/push-send"),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer test-secret",
                },
                body: JSON.stringify(payload),
            }
        );
    });

    it("シークレットが未設定なら送信せずnullを返す", async () => {
        vi.stubEnv("PUSH_API_SECRET", "");
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await sendPushNotification("https://portal.example.test", {
            title: "通知",
        });

        expect(result).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalled();
    });

    it("Push APIのエラー応答も呼び出し元へ返す", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "content-type": "application/json" },
            })
        );
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await sendPushNotification("https://portal.example.test", {
            title: "通知",
        });

        expect(result).toEqual({ error: "Unauthorized" });
        expect(consoleError).toHaveBeenCalledWith("Push notification failed:", {
            error: "Unauthorized",
        });
    });

    it("通信例外時はnullを返す", async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await sendPushNotification("https://portal.example.test", {
            title: "通知",
        });

        expect(result).toBeNull();
        expect(consoleError).toHaveBeenCalled();
    });
});
