// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next-auth", () => ({ default: () => ({}) }));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiUrl: () => "https://backend.example.test",
    getBackendApiHeaders: () => ({}),
}));
import { resolveMemberProfile } from "./auth";
afterEach(() => vi.unstubAllGlobals());

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

it("失敗した取得を保持せず次回に再試行する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await Promise.all([resolveMemberProfile("a123456"), resolveMemberProfile("a123456")]);
    expect(fetch).toHaveBeenCalledTimes(1);
    await resolveMemberProfile("a123456");
    expect(fetch).toHaveBeenCalledTimes(2);
});
