import { auth } from "@/src/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    const session = await auth();
    const isLoggedIn = !!session;
    const { pathname } = request.nextUrl;

    // 認証不要のパス
    const publicPaths = ["/", "/login", "/api/auth"];
    const isPublicPath = publicPaths.some(
        (path) => pathname === path || pathname.startsWith(path + "/")
    );

    if (isPublicPath) {
        return NextResponse.next();
    }

    // 未認証ならログインページにリダイレクト
    if (!isLoggedIn) {
        const loginUrl = new URL("/login", request.nextUrl.origin);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
