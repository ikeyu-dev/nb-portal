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

import { DELETE, GET, POST } from "./route";

const request = (
    method: "POST" | "DELETE",
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
) =>
    new NextRequest("https://portal.example.test/api/tasks", {
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

describe("/api/tasks", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            user: { email: "A12345678@example.com" },
            studentId: "a123456",
            displayName: "放研 太郎",
        });
        vi.stubGlobal("fetch", vi.fn());
    });

    it("GETは未認証ユーザーへ401を返す", async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await GET();

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: "Unauthorized",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("GETはタスク一覧をno-storeで取得する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: [{ id: "TASK-001" }] })
        );

        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            data: [{ id: "TASK-001" }],
        });
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=tasks",
            {
                method: "GET",
                cache: "no-store",
                headers: { "x-nb-portal-api-key": "test-api-key" },
            }
        );
    });

    it("GETは上流のエラーステータスを保持する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false, error: "Unavailable" }, 503)
        );

        const response = await GET();

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            success: false,
            error: "Unavailable",
        });
    });

    it("異なるOriginからの作成を認証前に拒否する", async () => {
        const response = await POST(
            request(
                "POST",
                { title: "資料作成" },
                { origin: "https://attacker.example.test" }
            )
        );

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "CSRF validation failed" });
        expect(mocks.auth).not.toHaveBeenCalled();
    });

    it("空のタイトルを拒否する", async () => {
        const response = await POST(request("POST", { title: "" }));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "バリデーションエラー",
            details: ["title: タイトルは必須です"],
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("既定値と操作ユーザーを付けてタスクを作成する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: { id: "TASK-001" } }, 201)
        );

        const response = await POST(
            request("POST", {
                title: "資料作成",
                dueDate: "",
            })
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            data: { id: "TASK-001" },
        });
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=tasks",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
                body: JSON.stringify({
                    title: "資料作成",
                    description: "",
                    status: "TODO",
                    dueDate: undefined,
                    assigneeStudentNumbers: [],
                    createdBy: "a123456",
                    updatedBy: "a123456",
                }),
            }
        );
        expect(mocks.revalidateTag).toHaveBeenCalledWith("tasks", "max");
    });

    it("studentIdがなければメールアドレスから操作ユーザーを補う", async () => {
        mocks.auth.mockResolvedValue({
            user: { email: "B23456789@example.com" },
            displayName: "表示名",
        });
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true }));

        await POST(request("POST", { title: "確認" }));

        const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
        expect(JSON.parse(String(options.body))).toMatchObject({
            createdBy: "b234567",
            updatedBy: "b234567",
        });
    });

    it("上流が作成を拒否した場合はステータスを保持してキャッシュを無効化しない", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false, error: "Rejected" }, 422)
        );

        const response = await POST(request("POST", { title: "資料作成" }));

        expect(response.status).toBe(422);
        expect(mocks.revalidateTag).not.toHaveBeenCalled();
    });

    it("タスクIDがない削除を拒否する", async () => {
        const response = await DELETE(request("DELETE", {}));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: "バリデーションエラー",
            details: ["id: Invalid input: expected string, received undefined"],
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("タスクIDをtasks/deleteへ転送してキャッシュを無効化する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true }));

        const response = await DELETE(
            request("DELETE", { id: "TASK-001", ignored: "value" })
        );

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=tasks%2Fdelete",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
                body: JSON.stringify({ id: "TASK-001" }),
            }
        );
        expect(mocks.revalidateTag).toHaveBeenCalledWith("tasks", "max");
    });
});
