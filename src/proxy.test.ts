// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ authenticate: vi.fn() }));
vi.mock("@/src/auth", () => ({
    auth: (handler: (request: NextRequest & { auth: unknown }) => Response) =>
        async (request: NextRequest) => {
            const session = await mocks.authenticate();
            const response = handler(Object.assign(request, { auth: session }));
            response.headers.append("set-cookie", "session=refreshed; HttpOnly");
            return response;
        },
}));
import { proxy } from "../proxy";

beforeEach(() => {
    mocks.authenticate.mockReset().mockResolvedValue({ user: { name: "member" } });
});

it.each(["/", "/login", "/api/auth/session", "/api/push-send", "/api/discord-send"])(
    "%sではセッション取得を実行しない", async (path) => {
        const result = await proxy(new NextRequest(`http://localhost${path}`), {} as never);
        expect(result?.status).toBe(200);
        expect(mocks.authenticate).not.toHaveBeenCalled();
    }
);
it("認証済みレスポンスに更新Cookieを引き継ぐ", async () => {
    const result = await proxy(new NextRequest("http://localhost/calendar"), {} as never);
    expect(result?.headers.get("set-cookie")).toContain("session=refreshed");
});
it("未認証時は遷移先を含めてログインへ戻す", async () => {
    mocks.authenticate.mockResolvedValue(null);
    const result = await proxy(new NextRequest("http://localhost/calendar?month=9"), {} as never);
    expect(result).toBeInstanceOf(NextResponse);
    const target = new URL(result?.headers.get("location") ?? "");
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("callbackUrl")).toBe("/calendar?month=9");
});
