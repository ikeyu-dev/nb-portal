import { auth } from "@/src/auth";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

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

    return authenticatedProxy(request, event);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|icons|manifest\\.json|sw\\.js|workbox-.*\\.js|.*\\.png$|.*\\.ico$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$|.*\\.json$).*)",
    ],
};
