// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/src/shared/lib/server-env", () => ({ getBackendApiUrl: () => "https://backend.example.test", getBackendApiHeaders: () => ({ "x-nb-portal-api-key": "key" }) }));
import { GET, PUT } from "./route";
const request = (body: unknown, origin = "https://portal.test") => new NextRequest("https://portal.test/api/schedule-participants", {
    method: "PUT", headers: { "content-type": "application/json", origin, host: "portal.test" }, body: JSON.stringify(body),
});
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: {}, studentId: "owner01" }); vi.stubGlobal("fetch", vi.fn()); });
it("未認証と不正Originを拒否する", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET(new NextRequest("https://portal.test/api/schedule-participants?eventId=e"))).status).toBe(401);
    expect((await PUT(request({}, "https://evil.test"))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
});
it("本人をサーバーで決定し、Workerの権限エラーを保持する", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ success: false, error: "作成者のみ変更できます" }, { status: 403 }));
    const response = await PUT(request({ eventId: "e", studentNumbers: [], expectedRevision: 0 }));
    expect(response.status).toBe(403);
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({ actor: "owner01" });
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
});
it("操作主体の偽装フィールドや不正な配列を拒否する", async () => {
    for (const extra of [{ actor: "someone" }, { studentNumbers: "bad" }, { expectedRevision: -1 }]) {
        expect((await PUT(request({ eventId: "e", studentNumbers: [], expectedRevision: 0, ...extra }))).status).toBe(400);
    }
    expect(fetch).not.toHaveBeenCalled();
});
it("一覧は全利用者に返し、所有者だけcanManageをtrueにする", async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json({ success: true, data: { eventId: "e", createdBy: "other", participants: [], revision: 0 } }));
    const response = await GET(new NextRequest("https://portal.test/api/schedule-participants?eventId=e"));
    expect(await response.json()).toMatchObject({ data: { canManage: false, participants: [] } });
    expect(response.headers.get("cache-control")).toContain("no-store");
});
