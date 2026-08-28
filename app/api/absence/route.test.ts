// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    revalidateTag: vi.fn(),
    sendDiscordWebhook: vi.fn(),
    getBackendApiHeaders: vi.fn(() => ({
        "x-nb-portal-api-key": "test-api-key",
    })),
    getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
}));

vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/src/shared/lib/discord", () => ({
    sendDiscordWebhook: mocks.sendDiscordWebhook,
}));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiHeaders: mocks.getBackendApiHeaders,
    getBackendApiUrl: mocks.getBackendApiUrl,
}));

import { DELETE, POST, PUT } from "./route";

const session = {
    user: { name: "セッション名", email: "a123456@example.com" },
    studentId: "a123456",
    displayName: "放研 太郎",
};

const request = (
    method: "POST" | "PUT" | "DELETE",
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
) =>
    new NextRequest("https://portal.example.test/api/absence", {
        method,
        headers: {
            host: "portal.example.test",
            origin: "https://portal.example.test",
            "content-type": "application/json",
            ...headers,
        },
        body: JSON.stringify(body),
    });

const scheduleResponse = (deadline = "2099-01-01") =>
    new Response(
        JSON.stringify({
            success: true,
            data: [
                {
                    EVENT_ID: "EVENT-001",
                    YYYY: 2099,
                    MM: 1,
                    DD: 2,
                    ATTENDANCE_DEADLINE: deadline,
                },
            ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
    );

const backendResponse = (data: Record<string, unknown>) =>
    new Response(JSON.stringify(data), {
        status: 200,
        headers: { "content-type": "application/json" },
    });

describe("/api/absence", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue(session);
        mocks.sendDiscordWebhook.mockResolvedValue({ success: true });
        vi.stubGlobal("fetch", vi.fn());
    });

    it("異なるOriginからの書き込みを認証前に拒否する", async () => {
        const response = await POST(
            request("POST", {}, { origin: "https://attacker.example.test" })
        );

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "CSRF validation failed" });
        expect(mocks.auth).not.toHaveBeenCalled();
    });

    it("JSON以外の書き込みを拒否する", async () => {
        const response = await POST(
            request("POST", {}, { "content-type": "text/plain" })
        );

        expect(response.status).toBe(415);
        expect(await response.json()).toEqual({ error: "Invalid Content-Type" });
        expect(mocks.auth).not.toHaveBeenCalled();
    });

    it("未認証ユーザーへ401を返す", async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await POST(request("POST", {}));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: "Unauthorized",
        });
    });

    it("不正な入力へ現在のバリデーション応答を返す", async () => {
        const response = await POST(
            request("POST", { eventId: "EVENT-001", type: "欠席" })
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "バリデーションエラー",
            details: ["reason: 理由は必須です"],
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("送信者情報をセッション値に置き換えて登録しDiscord結果を返す", async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(scheduleResponse())
            .mockResolvedValueOnce(
                backendResponse({
                    success: true,
                    data: { timestamp: "2026-08-28T12:34:56+09:00" },
                })
            );

        const response = await POST(
            request("POST", {
                eventId: "EVENT-001",
                studentNumber: "spoofed",
                name: "",
                type: "欠席",
                reason: "体調不良",
                eventTitle: "夏季活動",
                eventDateLabel: "2026/08/28",
                eventTimeLabel: "10:00",
            })
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            data: {
                timestamp: "2026-08-28T12:34:56+09:00",
                discordNotified: true,
            },
        });
        expect(fetch).toHaveBeenNthCalledWith(
            1,
            "https://backend.example.test/api?path=schedules",
            {
                method: "GET",
                cache: "no-store",
                headers: { "x-nb-portal-api-key": "test-api-key" },
            }
        );
        expect(fetch).toHaveBeenNthCalledWith(
            2,
            "https://backend.example.test/api?path=absences",
            expect.objectContaining({
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
                body: JSON.stringify({
                    eventId: "EVENT-001",
                    studentNumber: "a123456",
                    name: "放研 太郎",
                    type: "欠席",
                    reason: "体調不良",
                    eventTitle: "夏季活動",
                    eventDateLabel: "2026/08/28",
                    eventTimeLabel: "10:00",
                }),
            })
        );
        expect(mocks.revalidateTag).toHaveBeenCalledWith("absences", "max");
        expect(mocks.sendDiscordWebhook).toHaveBeenCalledWith({
            embeds: [
                {
                    title: "放研 太郎：欠席連絡",
                    description:
                        "**夏季活動**\n2026/08/28 10:00\n\n種別：欠席\n理由：体調不良",
                    color: 0xff0000,
                    footer: { text: "2026/08/28 12:34" },
                },
            ],
        });
    });

    it("出欠連絡期限を過ぎた予定は登録しない", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(scheduleResponse("2020-01-01"));

        const response = await POST(
            request("POST", {
                eventId: "EVENT-001",
                type: "出席",
            })
        );

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({
            success: false,
            error: "この予定の出欠連絡期限を過ぎています",
        });
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(mocks.sendDiscordWebhook).not.toHaveBeenCalled();
    });

    it("更新はabsences/updateへ転送する", async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(scheduleResponse())
            .mockResolvedValueOnce(backendResponse({ success: true, data: {} }));

        const response = await PUT(
            request("PUT", {
                eventId: "EVENT-001",
                type: "遅刻",
                reason: "授業",
            })
        );

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenNthCalledWith(
            2,
            "https://backend.example.test/api?path=absences%2Fupdate",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("削除はセッションの学籍番号を付けてabsences/deleteへ転送する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            backendResponse({ success: true, data: { deleted: true } })
        );

        const response = await DELETE(
            request("DELETE", {
                eventId: "EVENT-001",
                studentNumber: "spoofed",
            })
        );

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=absences%2Fdelete",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    eventId: "EVENT-001",
                    studentNumber: "a123456",
                }),
            })
        );
        expect(mocks.sendDiscordWebhook).not.toHaveBeenCalled();
    });
});
