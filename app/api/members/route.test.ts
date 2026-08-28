// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    revalidateTag: vi.fn(),
    getBackendApiHeaders: vi.fn(() => ({
        "x-nb-portal-api-key": "test-api-key",
    })),
    getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
}));

vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
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
    new NextRequest("https://portal.example.test/api/members", {
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

describe("/api/members", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            user: { email: "a123456@example.com" },
            permission: "HEAD",
        });
        vi.stubGlobal("fetch", vi.fn());
    });

    it("異なるOriginからの書き込みを認証前に拒否する", async () => {
        const response = await POST(
            request(
                "POST",
                { values: [] },
                { origin: "https://attacker.example.test" }
            )
        );

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "CSRF validation failed" });
        expect(mocks.auth).not.toHaveBeenCalled();
    });

    it("未認証ユーザーへ401を返す", async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await POST(request("POST", { values: [] }));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: "Unauthorized",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("valuesが配列でない場合は400を返す", async () => {
        const response = await POST(
            request("POST", { values: "not-an-array" })
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
            success: false,
            error: "バリデーションエラー",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("名簿行をmembersへ登録してキャッシュを無効化する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: { rowNumber: 8 } })
        );
        const values = ["a123456", "放研 太郎", true, null];

        const response = await POST(request("POST", { values }));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            data: { rowNumber: 8 },
        });
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=members",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
                body: JSON.stringify({ values }),
            }
        );
        expect(mocks.revalidateTag).toHaveBeenCalledWith("members", "max");
    });

    it("更新時は行番号を数値へ変換してmembers/updateへ転送する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true }));

        const response = await PUT(
            request("PUT", {
                rowNumber: "5",
                values: ["a123456", "更新後"],
            })
        );

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=members%2Fupdate",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    rowNumber: 5,
                    values: ["a123456", "更新後"],
                }),
            })
        );
        expect(mocks.revalidateTag).toHaveBeenCalledWith("members", "max");
    });

    it("ヘッダー行の更新を拒否する", async () => {
        const response = await PUT(
            request("PUT", { rowNumber: 1, values: ["header"] })
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "バリデーションエラー",
            details: ["rowNumber: ヘッダー行は更新できません"],
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("削除行をmembers/deleteへ転送する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true }));

        const response = await DELETE(request("DELETE", { rowNumber: "7" }));

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=members%2Fdelete",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ rowNumber: 7 }),
            })
        );
        expect(mocks.revalidateTag).toHaveBeenCalledWith("members", "max");
    });

    it("上流が処理を拒否した場合はキャッシュを無効化しない", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false, error: "Rejected" }, 409)
        );

        const response = await POST(request("POST", { values: [] }));

        expect(await response.json()).toEqual({
            success: false,
            error: "Rejected",
        });
        expect(mocks.revalidateTag).not.toHaveBeenCalled();
    });

    it("上流との通信失敗を500へ変換する", async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error("backend unavailable"));
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const response = await DELETE(request("DELETE", { rowNumber: 5 }));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            success: false,
            error: "backend unavailable",
        });
        consoleError.mockRestore();
    });
});
