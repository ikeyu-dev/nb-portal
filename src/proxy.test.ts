// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), cookies: [] as string[] }));
vi.mock("@/src/auth", () => ({
    auth: (handler: (request: NextRequest & { auth: unknown }) => Response) =>
        async (request: NextRequest) => {
            const session = await mocks.authenticate();
            const response = handler(Object.assign(request, { auth: session }));
            response.headers.append("set-cookie", "session=refreshed; HttpOnly");
            for (const cookie of mocks.cookies) response.headers.append("set-cookie", cookie);
            return response;
        },
}));
import { proxy } from "../proxy";

beforeEach(() => {
    mocks.authenticate.mockReset().mockResolvedValue({ user: { name: "member" } });
    mocks.cookies = [];
});

it("更新された分割JWTを後続処理へ渡し、古い余剰チャンクを削除する", async () => {
    mocks.cookies = [
        "__Secure-authjs.session-token.0=new0; Path=/; Secure; HttpOnly",
        "__Secure-authjs.session-token.1=new1; Path=/; Secure; HttpOnly",
        "__Secure-authjs.session-token.2=; Max-Age=0; Path=/",
    ];
    const request = new NextRequest("https://localhost/calendar", { headers: {
        cookie: "theme=dark; __Secure-authjs.session-token.0=old0; __Secure-authjs.session-token.1=old1; __Secure-authjs.session-token.2=old2",
    } });
    const result = await proxy(request, {} as never);
    const forwarded = result?.headers.get("x-middleware-request-cookie") ?? "";
    expect(forwarded).toContain("__Secure-authjs.session-token.0=new0");
    expect(forwarded).toContain("__Secure-authjs.session-token.1=new1");
    expect(forwarded).toContain("theme=dark");
    expect(forwarded).not.toContain("old");
    expect(forwarded).not.toContain("session-token.2");
    expect(result?.headers.get("set-cookie")).toContain("new0");
});

it("未署名のヘッダーではなくAuth.jsが発行したCookieだけを引き継ぐ", async () => {
    const request = new NextRequest("https://localhost/calendar", { headers: {
        cookie: "authjs.session-token=original",
        "x-middleware-request-cookie": "authjs.session-token=forged",
    } });
    mocks.cookies = ["authjs.session-token=verified; Path=/; HttpOnly"];
    const result = await proxy(request, {} as never);
    expect(result?.headers.get("x-middleware-request-cookie")).toBe("authjs.session-token=verified");
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
    expect(result?.headers.has("x-middleware-override-headers")).toBe(false);
});
it("分割JWTから単一Cookieへの変更を反映し、他のヘッダーを保持する", async () => {
    mocks.cookies = [
        "authjs.session-token.0=; Max-Age=0; Path=/",
        "authjs.session-token.1=; Max-Age=0; Path=/",
        "authjs.session-token=new; Path=/; HttpOnly",
    ];
    const request = new NextRequest("http://localhost/api/backend?path=members", { headers: {
        cookie: "authjs.session-token.0=old0; authjs.session-token.1=old1; theme=dark",
        "rsc": "1",
    } });
    const result = await proxy(request, {} as never);
    expect(result?.headers.get("x-middleware-request-cookie")).toBe("theme=dark; authjs.session-token=new");
    expect(result?.headers.get("x-middleware-request-rsc")).toBe("1");
    expect(result?.headers.has("cookie")).toBe(false);
    expect(request.cookies.get("authjs.session-token.0")?.value).toBe("old0");
});

it("期限切れのCookieを後続リクエストから削除する", async () => {
    mocks.cookies = ["authjs.session-token=expired; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/"];
    const request = new NextRequest("http://localhost/calendar", { headers: {
        cookie: "authjs.session-token=old; theme=dark",
    } });
    const result = await proxy(request, {} as never);
    expect(result?.headers.get("x-middleware-request-cookie")).toBe("theme=dark");
});

it("未認証時は遷移先を含めてログインへ戻す", async () => {
    mocks.authenticate.mockResolvedValue(null);
    mocks.cookies = ["authjs.session-token=; Max-Age=0; Path=/"];
    const result = await proxy(new NextRequest("http://localhost/calendar?month=9"), {} as never);
    expect(result).toBeInstanceOf(NextResponse);
    const target = new URL(result?.headers.get("location") ?? "");
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("callbackUrl")).toBe("/calendar?month=9");
    expect(result?.headers.has("x-middleware-override-headers")).toBe(false);
    expect(result?.headers.get("set-cookie")).toContain("Max-Age=0");
});
