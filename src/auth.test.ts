// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next-auth", () => ({ default: () => ({}) }));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiUrl: () => "https://backend.example.test",
    getBackendApiHeaders: () => ({}),
}));
import { resolveMemberProfile } from "./auth";
afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

it.each([
    [200, { success: true, isMember: false }, "not-member"],
    [503, { success: true, isMember: true }, "http-error"],
    [200, { success: false }, "invalid-response"],
    [200, null, "invalid-response"],
])("応答 %s を %s として扱い、部員として許可しない", async (status, body, outcome) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(body, { status })));
    expect(await resolveMemberProfile("a123456", "session")).toMatchObject({ isMember: false, outcome });
});

it("通信失敗と壊れたJSONを区別する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("private detail"))
        .mockResolvedValueOnce(new Response("invalid json")));
    expect(await resolveMemberProfile("a123456")).toHaveProperty("outcome", "network-error");
    expect(await resolveMemberProfile("a123456")).toHaveProperty("outcome", "invalid-response");
});

it("計測を明示的に有効にしたときだけ、実取得単位で匿名のログを出す", async () => {
    vi.stubEnv("AUTH_PROFILE_TIMING_SAMPLE_RATE", "1");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, isMember: true, name: "private name" })));
    await Promise.all([resolveMemberProfile("a123456", "session"), resolveMemberProfile("a123456", "session")]);
    expect(log).toHaveBeenCalledTimes(1);
    const record = JSON.parse(log.mock.calls[0][0]);
    expect(record).toMatchObject({ event: "member_profile_fetch", purpose: "session", outcome: "member", status: 200, totalMs: expect.any(Number) });
    const headers = new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers);
    expect(headers.get("x-nb-profile-trace-id")).toBe(record.traceId);
    expect(JSON.stringify(record)).not.toMatch(/a123456|private name/);
});

it.each(["", "0", "NaN", "2", "-1"])("サンプル率 %s では計測ログとヘッダーを追加しない", async rate => {
    vi.stubEnv("AUTH_PROFILE_TIMING_SAMPLE_RATE", rate);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, isMember: true })));
    await resolveMemberProfile("a123456", "session");
    expect(log).not.toHaveBeenCalled();
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).has("x-nb-profile-trace-id")).toBe(false);
});

it("同じ部員の並行取得を1回にまとめ、完了後は再取得する", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, isMember: true, name: "部員", permission: "NORMAL" })));
    vi.stubGlobal("fetch", fetchMock);
    const results = await Promise.all(Array.from({ length: 8 }, () => resolveMemberProfile("a123456")));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results.every(result => result.isMember)).toBe(true);
    await resolveMemberProfile("a123456");
    expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("別の部員の取得を共有しない", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, isMember: true }))));
    await Promise.all([resolveMemberProfile("a123456"), resolveMemberProfile("b123456")]);
    expect(fetch).toHaveBeenCalledTimes(2);
});

it("セッション再同期と更新操作の権限確認を共有しない", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, isMember: true })));
    await Promise.all([resolveMemberProfile("a123456", "session"), resolveMemberProfile("a123456")]);
    expect(fetch).toHaveBeenCalledTimes(2);
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => new URL(String(url)).searchParams.get("path"));
    expect(urls).toEqual(["session-member-profile", "verify-member"]);
});

it("失敗した取得を保持せず次回に再試行する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await Promise.all([resolveMemberProfile("a123456"), resolveMemberProfile("a123456")]);
    expect(fetch).toHaveBeenCalledTimes(1);
    await resolveMemberProfile("a123456");
    expect(fetch).toHaveBeenCalledTimes(2);
});
