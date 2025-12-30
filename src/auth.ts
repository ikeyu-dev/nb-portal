import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;

// Microsoft Graph APIからプロファイル画像を取得（小さいサイズ）
const fetchProfileImage = async (
    accessToken: string
): Promise<string | null> => {
    try {
        // 96x96の小さい画像を取得（URL長制限対策）
        const response = await fetch(
            "https://graph.microsoft.com/v1.0/me/photos/96x96/$value",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const contentType =
            response.headers.get("content-type") || "image/jpeg";
        return `data:${contentType};base64,${base64}`;
    } catch {
        return null;
    }
};

// メールアドレスから学籍番号（最初の7文字）を抽出
const extractStudentId = (email: string | null | undefined): string | null => {
    if (!email) return null;
    // メールアドレスの@より前の部分を取得し、最初の7文字を返す
    const localPart = email.split("@")[0];
    return localPart.substring(0, 7).toLowerCase();
};

// 部員確認API呼び出し
const verifyMember = async (identifier: string): Promise<boolean> => {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL;
        if (!apiUrl) return false;

        const res = await fetch(
            `${apiUrl}?path=verify-member&identifier=${encodeURIComponent(identifier)}`
        );
        const data = await res.json();
        return data.success && data.isMember === true;
    } catch {
        return false;
    }
};

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
            issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
        }),
    ],
    session: {
        maxAge: 180 * 24 * 60 * 60, // 半年（180日）
    },
    pages: {
        signIn: "/login",
        error: "/unauthorized",
    },
    callbacks: {
        async signIn({ user }) {
            // メールアドレスから学籍番号を抽出
            const studentId = extractStudentId(user.email);
            if (!studentId) {
                return false;
            }

            // 部員確認
            const isMember = await verifyMember(studentId);
            if (!isMember) {
                return "/unauthorized";
            }

            return true;
        },
        async jwt({ token, user, account }) {
            // 初回ログイン時にstudentIdをトークンに追加
            if (user?.email) {
                token.studentId = extractStudentId(user.email);
            }
            // 初回ログイン時にプロファイル画像を取得（一度だけ）
            if (account?.access_token && !token.profileImageFetched) {
                const image = await fetchProfileImage(account.access_token);
                if (image) {
                    token.profileImage = image;
                }
                token.profileImageFetched = true;
            }
            return token;
        },
        async session({ session, token }) {
            // セッションにstudentIdを追加
            if (token.studentId) {
                session.studentId = token.studentId as string;
            }
            // プロファイル画像を一度だけセッションに追加（クライアントで保存後は不要）
            if (token.profileImage) {
                session.profileImage = token.profileImage as string;
            }
            return session;
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLoginPage = nextUrl.pathname === "/login";
            const isOnRootPage = nextUrl.pathname === "/";
            const isOnUnauthorizedPage = nextUrl.pathname === "/unauthorized";

            // ログインページ、ルートページ、未認可ページは認証不要
            if (isOnLoginPage || isOnRootPage || isOnUnauthorizedPage) {
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
