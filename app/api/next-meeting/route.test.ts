// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    resolveMemberProfile: vi.fn(),
    revalidateTag: vi.fn(),
    sendPushNotification: vi.fn(),
    getBackendApiHeaders: vi.fn(() => ({
        "x-nb-portal-api-key": "test-api-key",
    })),
    getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
}));

vi.mock("@/src/auth", () => ({
    auth: mocks.auth,
    resolveMemberProfile: mocks.resolveMemberProfile,
}));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/src/shared/lib/push-notification-server", () => ({
    sendPushNotification: mocks.sendPushNotification,
}));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiHeaders: mocks.getBackendApiHeaders,
    getBackendApiUrl: mocks.getBackendApiUrl,
}));

import { POST } from "./route";

const request = (
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
) =>
    new NextRequest("https://portal.example.test/api/next-meeting", {
        method: "POST",
        headers: {
            host: "portal.example.test",
            origin: "https://portal.example.test",
            "content-type": "application/json",
            ...headers,
        },
        body: JSON.stringify(body),
    });

const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

describe("POST /api/next-meeting", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            user: { email: "A12345678@example.com" },
            studentId: "a123456",
            displayName: "部長 太郎",
            permission: "HEAD",
        });
        mocks.resolveMemberProfile.mockResolvedValue({ permission: "HEAD" });
        mocks.sendPushNotification.mockResolvedValue({ success: true, sent: 2 });
        vi.stubGlobal("fetch", vi.fn());
    });

    it("異なるOriginからの書き込みを認証前に拒否する", async () => {
        const response = await POST(
            request(
                { date: "2026-09-01", time: "18:00", mode: "IN_PERSON" },
                { origin: "https://attacker.example.test" }
            )
        );

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "CSRF validation failed" });
        expect(mocks.auth).not.toHaveBeenCalled();
    });

    it("未認証ユーザーへ401を返す", async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await POST(request({}));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: "Unauthorized",
        });
    });

    it("部長・副部長以外を拒否する", async () => {
        mocks.auth.mockResolvedValue({
            user: { email: "a123456@example.com" },
            studentId: "a123456",
            permission: "ACCOUNTANT",
        });

        const response = await POST(request({}));

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({
            success: false,
            error: "Forbidden",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("セッションに権限がなければ最新の部員情報で補う", async () => {
        mocks.auth.mockResolvedValue({
            user: { email: "b234567@example.com" },
            studentId: "b234567",
        });
        mocks.resolveMemberProfile.mockResolvedValue({ permission: "SUB_HEAD" });
        vi.mocked(fetch)
            .mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
            .mockResolvedValueOnce(jsonResponse({ success: true, data: {} }));

        const response = await POST(
            request({ date: "2026-09-01", time: "18:00", mode: "IN_PERSON" })
        );

        expect(response.status).toBe(200);
        expect(mocks.resolveMemberProfile).toHaveBeenCalledWith("b234567");
    });

    it("不正な日付・時刻・開催形式を拒否する", async () => {
        const response = await POST(
            request({ date: "2026/09/01", time: "18時", mode: "ONLINE" })
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "バリデーションエラー",
            details: [
                "date: 日付はYYYY-MM-DD形式で指定してください",
                "time: 時刻はHH:MM形式で指定してください",
                "mode: 開催形式はIN_PERSONまたはDISCORDです",
            ],
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("次回部会を登録し、表示名・キャッシュ更新・Push通知を反映する", async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
            .mockResolvedValueOnce(
                jsonResponse({
                    success: true,
                    data: {
                        date: "2026-09-01",
                        time: "18:05",
                        mode: "DISCORD",
                        updatedBy: "a123456",
                    },
                })
            );

        const response = await POST(
            request({ date: "2026-09-01", time: "18:05", mode: "DISCORD" })
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            data: {
                date: "2026-09-01",
                time: "18:05",
                mode: "DISCORD",
                updatedBy: "a123456",
                updatedByName: "部長 太郎",
            },
        });
        expect(fetch).toHaveBeenNthCalledWith(
            1,
            "https://backend.example.test/api?path=next-meeting",
            {
                headers: { "x-nb-portal-api-key": "test-api-key" },
                cache: "no-store",
            }
        );
        expect(fetch).toHaveBeenNthCalledWith(
            2,
            "https://backend.example.test/api?path=next-meeting",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
                body: JSON.stringify({
                    date: "2026-09-01",
                    time: "18:05",
                    mode: "DISCORD",
                    updatedBy: "a123456",
                }),
            }
        );
        expect(mocks.revalidateTag.mock.calls).toEqual([
            ["next-meeting", "max"],
            ["schedules", "max"],
            ["notifications", "max"],
        ]);
        expect(mocks.sendPushNotification).toHaveBeenCalledWith(
            "https://portal.example.test",
            {
                title: "次回部会が登録されました",
                body: "2026/09/01 18:05 Discord",
                url: "/home",
                tag: "nb-portal-next-meeting-登録",
            }
        );
    });

    it("既存設定がある場合は更新通知にする", async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(
                jsonResponse({ success: true, data: { date: "2026-08-25" } })
            )
            .mockResolvedValueOnce(jsonResponse({ success: true, data: {} }));

        await POST(
            request({ date: "2026-09-08", time: "18:00", mode: "IN_PERSON" })
        );

        expect(mocks.sendPushNotification).toHaveBeenCalledWith(
            "https://portal.example.test",
            expect.objectContaining({
                title: "次回部会が更新されました",
                body: "2026/09/08 18:00 対面",
                tag: "nb-portal-next-meeting-更新",
            })
        );
    });

    it("上流が更新を拒否した場合はキャッシュ更新・通知を行わない", async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
            .mockResolvedValueOnce(
                jsonResponse({ success: false, error: "Rejected" }, 409)
            );

        const response = await POST(
            request({ date: "2026-09-01", time: "18:00", mode: "IN_PERSON" })
        );

        expect(await response.json()).toEqual({
            success: false,
            error: "Rejected",
        });
        expect(mocks.revalidateTag).not.toHaveBeenCalled();
        expect(mocks.sendPushNotification).not.toHaveBeenCalled();
    });
});
