// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiUrl: () => "https://backend.example.test",
    getBackendApiHeaders: () => ({ "x-nb-portal-api-key": "test" }),
}));
import { getInitialData } from "./initial-data";

beforeEach(() => {
    mocks.auth.mockResolvedValue({ user: { email: "member@example.test" } });
    vi.stubGlobal("fetch", vi.fn());
});

it("未認証の取得ではバックエンドへ接続しない", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(getInitialData("items")).rejects.toThrow("Unauthorized");
    expect(fetch).not.toHaveBeenCalled();
});

it("最新の一覧をAPIキーと検索条件付きで取得する", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] })));
    await expect(getInitialData("notifications", { limit: "50" })).resolves.toEqual([]);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("https://backend.example.test/?path=notifications&limit=50");
    expect(options).toEqual({ cache: "no-store", headers: { "x-nb-portal-api-key": "test" } });
});

it("HTTP失敗時はクライアントのフォールバックを許可する", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("unavailable", { status: 503 }));
    await expect(getInitialData("members")).resolves.toBeNull();
});
