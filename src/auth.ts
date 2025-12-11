import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
            issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLoginPage = nextUrl.pathname === "/login";
            const isOnRootPage = nextUrl.pathname === "/";

            // ログインページとルートページは認証不要
            if (isOnLoginPage || isOnRootPage) {
                return true;
            }

            // それ以外のページは認証必要
            if (isLoggedIn) {
                return true;
            }

            // 未認証の場合はログインページにリダイレクト
            return false;
        },
    },
});
