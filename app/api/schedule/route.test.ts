// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    revalidateTag: vi.fn(),
    sendPushNotification: vi.fn(),
    getBackendApiHeaders: vi.fn(() => ({
        "x-nb-portal-api-key": "test-api-key",
    })),
    getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
}));

vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/src/shared/lib/push-notification-server", () => ({
    sendPushNotification: mocks.sendPushNotification,
}));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiHeaders: mocks.getBackendApiHeaders,
    getBackendApiUrl: mocks.getBackendApiUrl,
}));

import { DELETE, POST, PUT } from "./route";

const request = (
    method: "POST" | "PUT" | "DELETE",
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
) =>
    new NextRequest("https://portal.example.test/api/schedule", {
        method,
        headers: {
            host: "portal.example.test",
            origin: "https://portal.example.test",
            "content-type": "application/json",
            ...headers,
        },
        body: JSON.stringify(body),
    });

const jsonResponse = (data: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

describe("/api/schedule", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            user: { email: "A12345678@example.com" },
        });
        mocks.sendPushNotification.mockResolvedValue(undefined);
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

    it("未認証ユーザーへ401を返す", async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await POST(request("POST", {}));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: "Unauthorized",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("作成者の学籍番号を付けて予定を作成し通知する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                success: true,
                data: {
                    eventId: "EVENT-001",
                    title: "部会",
                    year: 2026,
                    month: 9,
                    date: 1,
                    timeHH: 18,
                    timeMM: 5,
                    where: "講義棟",
                },
            })
        );

        const response = await POST(
            request("POST", {
                title: "部会",
                year: 2026,
                month: 9,
                date: 1,
            })
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ success: true });
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=schedules",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
                body: JSON.stringify({
                    title: "部会",
                    year: 2026,
                    month: 9,
                    date: 1,
                    createdBy: "a123456",
                }),
            }
        );
        expect(mocks.revalidateTag.mock.calls).toEqual([
            ["schedules", "max"],
            ["next-meeting", "max"],
            ["notifications", "max"],
        ]);
        expect(mocks.sendPushNotification).toHaveBeenCalledWith(
            "https://portal.example.test",
            {
                title: "部会「部会」が追加されました",
                body: "2026/9/1 18:05 講義棟",
                url: "/calendar",
                tag: "nb-portal-schedule-created-EVENT-001",
            }
        );
    });

    it("更新者の学籍番号を付けてschedules/updateへ転送する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                success: true,
                data: {
                    eventId: "EVENT-001",
                    title: "収録",
                    year: 2026,
                    month: 9,
                    date: 2,
                },
            })
        );

        const response = await PUT(
            request("PUT", { eventId: "EVENT-001", title: "収録" })
        );

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=schedules%2Fupdate",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    eventId: "EVENT-001",
                    title: "収録",
                    updatedBy: "a123456",
                }),
            })
        );
        expect(mocks.sendPushNotification).toHaveBeenCalledWith(
            "https://portal.example.test",
            expect.objectContaining({
                title: "予定「収録」が更新されました",
                tag: "nb-portal-schedule-updated-EVENT-001",
            })
        );
    });

    it("削除前の予定を取得してから削除し、その内容で通知する", async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(
                jsonResponse({
                    success: true,
                    data: [
                        {
                            EVENT_ID: "EVENT-001",
                            TITLE: "部会",
                            YYYY: 2026,
                            MM: 9,
                            DD: 3,
                            TIME_HH: 19,
                            TIME_MM: 0,
                            WHERE: "部室",
                        },
                    ],
                })
            )
            .mockResolvedValueOnce(jsonResponse({ success: true }));

        const response = await DELETE(
            request("DELETE", { eventId: "EVENT-001", title: "古い表示名" })
        );

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenNthCalledWith(
            1,
            "https://backend.example.test/api?path=schedules",
            {
                headers: { "x-nb-portal-api-key": "test-api-key" },
                cache: "no-store",
            }
        );
        expect(fetch).toHaveBeenNthCalledWith(
            2,
            "https://backend.example.test/api?path=schedules%2Fdelete",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    eventId: "EVENT-001",
                    title: "古い表示名",
                }),
            })
        );
        expect(mocks.sendPushNotification).toHaveBeenCalledWith(
            "https://portal.example.test",
            {
                title: "部会「部会」が削除されました",
                body: "2026/9/3 19:00 部室",
                url: "/calendar",
                tag: "nb-portal-schedule-deleted-EVENT-001",
            }
        );
    });

    it("Backend APIの通信失敗を500へ変換する", async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error("backend unavailable"));
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const response = await POST(request("POST", { title: "部会" }));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            success: false,
            error: "backend unavailable",
        });
        expect(mocks.revalidateTag).not.toHaveBeenCalled();
        expect(mocks.sendPushNotification).not.toHaveBeenCalled();
        consoleError.mockRestore();
    });
});
