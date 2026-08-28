// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    getBackendApiHeaders: vi.fn(() => ({
        "x-nb-portal-api-key": "test-api-key",
    })),
    getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
}));

vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiHeaders: mocks.getBackendApiHeaders,
    getBackendApiUrl: mocks.getBackendApiUrl,
}));

import { DELETE, POST } from "./route";

const request = (
    method: "POST" | "DELETE",
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
) =>
    new NextRequest("https://portal.example.test/api/push-subscribe", {
        method,
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

describe("/api/push-subscribe", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            user: { email: "A12345678@example.com" },
            studentId: "a123456",
        });
        vi.stubGlobal("fetch", vi.fn());
    });

    it("異なるOriginからの登録を認証前に拒否する", async () => {
        const response = await POST(
            request(
                "POST",
                { subscription: {} },
                { origin: "https://attacker.example.test" }
            )
        );

        expect(response.status).toBe(403);
        expect(mocks.auth).not.toHaveBeenCalled();
    });

    it("メールアドレスのないセッションを拒否する", async () => {
        mocks.auth.mockResolvedValue({ user: {} });

        const response = await POST(request("POST", { subscription: {} }));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
    });

    it("購読情報がない場合は400を返す", async () => {
        const response = await POST(request("POST", {}));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: "Missing required fields",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("学籍番号を付けて購読情報を保存する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true }));
        const subscription = {
            endpoint: "https://push.example.test/subscription",
            keys: { p256dh: "p256dh", auth: "auth" },
        };

        const response = await POST(request("POST", { subscription }));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true });
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=push-subscribe",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
                body: JSON.stringify({ subscription, studentId: "a123456" }),
            }
        );
    });

    it("Backendが購読保存を拒否した場合は500を返す", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false, error: "Invalid subscription" }, 400)
        );

        const response = await POST(
            request("POST", { subscription: { endpoint: "invalid" } })
        );

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Invalid subscription" });
    });

    it("endpointがない削除を拒否する", async () => {
        const response = await DELETE(request("DELETE", {}));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Missing endpoint" });
    });

    it("endpointを指定して購読を削除する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true }));

        const response = await DELETE(
            request("DELETE", {
                endpoint: "https://push.example.test/subscription",
            })
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true });
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=push-unsubscribe",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    endpoint: "https://push.example.test/subscription",
                }),
            })
        );
    });
});
