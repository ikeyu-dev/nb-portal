// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    class WebPushError extends Error {
        statusCode: number;

        constructor(message: string, statusCode: number) {
            super(message);
            this.statusCode = statusCode;
        }
    }

    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
    process.env.VAPID_PRIVATE_KEY = "test-private-key";
    process.env.VAPID_SUBJECT = "mailto:test@example.test";
    process.env.PUSH_API_SECRET = "test-secret";

    return {
        WebPushError,
        setVapidDetails: vi.fn(),
        sendNotification: vi.fn(),
        getBackendApiHeaders: vi.fn(() => ({
            "x-nb-portal-api-key": "test-api-key",
        })),
        getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
    };
});

vi.mock("web-push", () => ({
    default: {
        WebPushError: mocks.WebPushError,
        setVapidDetails: mocks.setVapidDetails,
        sendNotification: mocks.sendNotification,
    },
}));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiHeaders: mocks.getBackendApiHeaders,
    getBackendApiUrl: mocks.getBackendApiUrl,
}));

import { POST } from "./route";

const request = (body: Record<string, unknown>, secret = "test-secret") =>
    new NextRequest("https://portal.example.test/api/push-send", {
        method: "POST",
        headers: {
            authorization: `Bearer ${secret}`,
            "content-type": "application/json",
        },
        body: JSON.stringify(body),
    });

const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

const subscription = (studentId: string, endpoint: string) => ({
    studentId,
    endpoint,
    p256dh: `${studentId}-p256dh`,
    auth: `${studentId}-auth`,
});

describe("POST /api/push-send", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.sendNotification.mockResolvedValue({});
        vi.stubGlobal("fetch", vi.fn());
    });

    it("シークレットが一致しない場合は401を返す", async () => {
        const response = await POST(request({ title: "通知" }, "wrong-secret"));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("タイトルがない場合は400を返す", async () => {
        const response = await POST(request({ body: "本文" }));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Title is required" });
    });

    it("購読者一覧を取得できない場合は500を返す", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false, error: "Backend unavailable" }, 503)
        );

        const response = await POST(request({ title: "通知" }));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Failed to fetch subscriptions",
        });
        expect(mocks.sendNotification).not.toHaveBeenCalled();
    });

    it("購読者がいない場合は送信件数0で成功する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: [] })
        );

        const response = await POST(request({ title: "通知" }));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            message: "No subscriptions to send to",
            sent: 0,
        });
    });

    it("全購読者へ既定値を含む同じ通知を送信する", async () => {
        const subscriptions = [
            subscription("a123456", "https://push.example.test/a"),
            subscription("b234567", "https://push.example.test/b"),
        ];
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: subscriptions })
        );

        const response = await POST(
            request({ title: "予定更新", body: "部会の日程が変わりました" })
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            sent: 2,
            failed: 0,
            total: 2,
        });
        const payload = JSON.stringify({
            title: "予定更新",
            body: "部会の日程が変わりました",
            url: "/notifications",
            tag: "nb-portal-notification",
        });
        expect(mocks.sendNotification.mock.calls).toEqual([
            [
                {
                    endpoint: "https://push.example.test/a",
                    keys: { p256dh: "a123456-p256dh", auth: "a123456-auth" },
                },
                payload,
            ],
            [
                {
                    endpoint: "https://push.example.test/b",
                    keys: { p256dh: "b234567-p256dh", auth: "b234567-auth" },
                },
                payload,
            ],
        ]);
    });

    it("個別の送信失敗を集計し、他の購読者への送信を継続する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                success: true,
                data: [
                    subscription("a123456", "https://push.example.test/a"),
                    subscription("b234567", "https://push.example.test/b"),
                ],
            })
        );
        mocks.sendNotification
            .mockRejectedValueOnce(new Error("send failed"))
            .mockResolvedValueOnce({});

        const response = await POST(request({ title: "通知" }));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            sent: 1,
            failed: 1,
            total: 2,
        });
    });

    it("410 Goneとなった購読をBackendから削除する", async () => {
        const expired = subscription(
            "a123456",
            "https://push.example.test/expired"
        );
        vi.mocked(fetch)
            .mockResolvedValueOnce(jsonResponse({ success: true, data: [expired] }))
            .mockResolvedValueOnce(jsonResponse({ success: true }));
        mocks.sendNotification.mockRejectedValueOnce(
            new mocks.WebPushError("expired", 410)
        );

        const response = await POST(request({ title: "通知" }));

        expect(await response.json()).toEqual({
            success: true,
            sent: 0,
            failed: 1,
            total: 1,
        });
        expect(fetch).toHaveBeenNthCalledWith(
            2,
            "https://backend.example.test/api?path=push-unsubscribe",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
                body: JSON.stringify({
                    endpoint: "https://push.example.test/expired",
                }),
            }
        );
    });
});
