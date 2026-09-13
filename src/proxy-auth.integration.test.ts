// @vitest-environment node
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";

const context = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({ headers: async () => context.headers }));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiUrl: () => "https://backend.example.test",
    getBackendApiHeaders: () => ({}),
}));

const secret = "integration-test-secret-not-for-production";
let proxy: typeof import("../proxy").proxy;
let auth: typeof import("./auth").auth;

beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", secret);
    vi.stubEnv("AUTH_TRUST_HOST", "true");
    ({ proxy } = await import("../proxy"));
    ({ auth } = await import("./auth"));
});
afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});
afterAll(() => vi.unstubAllEnvs());

it.each([
    { imageSize: 0, cacheAge: 0 },
    { imageSize: 6000, cacheAge: 4000 },
])("更新JWTを引き継ぎ、元の取得時刻から60秒後に再同期する（$imageSize / $cacheAge）", async ({ imageSize, cacheAge }) => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const fetchMock = vi.fn(async () => Response.json({
        success: true, isMember: true, name: "更新後", permission: "NORMAL", fetchedAt: now - cacheAge,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const name = "__Secure-authjs.session-token";
    const token = await encode({ secret, salt: name, token: {
        sub: "test-member", studentId: "a123456", memberName: "更新前",
        displayName: "更新前", permission: "NORMAL",
        memberProfileSyncedAt: now - 61_000,
        profileImage: "x".repeat(imageSize),
    } });
    const request = new NextRequest("https://localhost/calendar");
    if (imageSize) {
        for (let offset = 0, index = 0; offset < token.length; offset += 3900, index++) {
            request.cookies.set(`${name}.${index}`, token.slice(offset, offset + 3900));
        }
    } else {
        request.cookies.set(name, token);
    }
    const response = await proxy(request, {} as never);
    expect(response?.headers.get("x-middleware-next")).toBe("1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("path=session-member-profile"), expect.anything());
    const cookie = response?.headers.get("x-middleware-request-cookie");
    expect(cookie).toBeTruthy();
    // Next.jsがリクエストヘッダーの上書きを適用した後のauth()を再現する。
    context.headers = new Headers({ cookie: cookie!, "x-forwarded-proto": "https", host: "localhost" });
    const session = await auth();
    expect(session?.memberName).toBe("更新後");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    clock.mockReturnValue(now + 60_000 - cacheAge);
    await auth();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    clock.mockReturnValue(now + 60_001 - cacheAge);
    await auth();
    expect(fetchMock).toHaveBeenCalledTimes(2);
});
