import { auth } from "@/src/auth";

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const { pathname } = req.nextUrl;

    // 認証不要のパス
    const publicPaths = ["/", "/login", "/api/auth"];
    const isPublicPath = publicPaths.some(
        (path) => pathname === path || pathname.startsWith(path + "/")
    );

    if (isPublicPath) {
        return;
    }

    // 未認証ならログインページにリダイレクト
    if (!isLoggedIn) {
        const loginUrl = new URL("/login", req.nextUrl.origin);
        return Response.redirect(loginUrl);
    }
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
