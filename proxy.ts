import { auth } from "@/src/auth";
import { NextRequest, NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";

const authenticatedProxy = auth((request, _event: NextFetchEvent) => {
    void _event;
    if (!request.auth) {
        const loginUrl = new URL("/login", request.nextUrl.origin);
        loginUrl.searchParams.set(
            "callbackUrl",
            `${request.nextUrl.pathname}${request.nextUrl.search}`,
        );
        return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
});

export async function proxy(request: NextRequest, event: NextFetchEvent) {
    const { pathname } = request.nextUrl;

    // 認証不要のパス
    // /api/push-sendはAPIシークレットで保護されているため、セッション認証は不要だが
    // 明示的に公開パスとして扱わず、API側でシークレット認証を行う
    const publicPaths = ["/", "/login", "/api/auth"];

    // APIシークレットで保護されたパス（セッション認証をスキップ）
    const apiSecretProtectedPaths = ["/api/push-send", "/api/discord-send"];

    const isPublicPath = publicPaths.some(
        (path) => pathname === path || pathname.startsWith(path + "/")
    );

    const isApiSecretProtectedPath = apiSecretProtectedPaths.some(
        (path) => pathname === path || pathname.startsWith(path + "/")
    );

    if (isPublicPath) {
        return NextResponse.next();
    }

    // APIシークレットで保護されたパスはセッション認証をスキップ
    // API側でシークレット認証を行う
    if (isApiSecretProtectedPath) {
        return NextResponse.next();
    }

    const response = await authenticatedProxy(request, event);
    if (!response || response.headers.get("x-middleware-next") !== "1") {
        return response;
    }

    // Auth.jsのレスポンスCookieを、同じリクエスト内のauth()にも引き継ぐ。
    const sessionCookies = new NextResponse(null, { headers: response.headers })
        .cookies.getAll()
        .filter(({ name }) => /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/.test(name));
    if (sessionCookies.length === 0) return response;

    const headers = new Headers(request.headers);
    for (const name of [...headers.keys()]) {
        if (name.startsWith("x-middleware-")) headers.delete(name);
    }
    const forwarded = new NextRequest(request.url, { headers });
    for (const cookie of sessionCookies) {
        const expired = cookie.expires !== undefined && new Date(cookie.expires).getTime() <= Date.now();
        if (!cookie.value || cookie.maxAge === 0 || expired) {
            forwarded.cookies.delete(cookie.name);
        } else {
            forwarded.cookies.set(cookie.name, cookie.value);
        }
    }
    const override = NextResponse.next({ request: { headers: forwarded.headers } });
    override.headers.forEach((value, name) => {
        if (name === "x-middleware-override-headers" || name.startsWith("x-middleware-request-")) {
            response.headers.set(name, value);
        }
    });
    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|icons|manifest\\.json|sw\\.js|workbox-.*\\.js|.*\\.png$|.*\\.ico$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$|.*\\.json$).*)",
    ],
};
