import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import {
    normalizeMemberPermission,
    type MemberPermission,
} from "@/src/shared/types/api";
import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";

const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;
const MEMBER_PROFILE_REFRESH_MS = 60 * 1000;

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

const getDisplayName = (
    nickname: string | null,
    memberName: string | null
): string | null => {
    const normalizedNickname = nickname?.trim();
    if (normalizedNickname && normalizedNickname !== "---") {
        return normalizedNickname;
    }

    const normalizedMemberName = memberName?.trim();
    return normalizedMemberName || null;
};

/** 部員確認API呼び出し（あだ名も同時に取得） */
export const resolveMemberProfile = async (
    identifier: string
): Promise<{
    isMember: boolean;
    name: string | null;
    nickname: string | null;
    displayName: string | null;
    permission: MemberPermission | null;
}> => {
    try {
        const apiUrl = getBackendApiUrl();
        if (!apiUrl) {
            return {
                isMember: false,
                name: null,
                nickname: null,
                displayName: null,
                permission: null,
            };
        }

        const res = await fetch(
            `${apiUrl}?path=verify-member&identifier=${encodeURIComponent(identifier)}`,
            { cache: "no-store", headers: getBackendApiHeaders() }
        );
        const data = (await res.json()) as {
            success?: boolean;
            isMember?: boolean;
            name?: string;
            nickname?: string;
            permission?: string;
        };
        const name = data.name || null;
        const nickname = data.nickname || null;
        const permission = normalizeMemberPermission(data.permission);
        return {
            isMember: data.success === true && data.isMember === true,
            name,
            nickname,
            displayName: getDisplayName(nickname, name),
            permission,
        };
    } catch {
        return {
            isMember: false,
            name: null,
            nickname: null,
            displayName: null,
            permission: null,
        };
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

            // 部員確認（あだ名も同時に取得）
            const result = await resolveMemberProfile(studentId);
            if (!result.isMember) {
                return "/unauthorized";
            }

            // jwtコールバックに引き渡すため一時的に格納
            (user as Record<string, unknown>).memberName = result.name;
            (user as Record<string, unknown>).nickname = result.nickname;
            (user as Record<string, unknown>).displayName = result.displayName;
            (user as Record<string, unknown>).permission = result.permission;
            return true;
        },
        async jwt({ token, user, account }) {
            // 初回ログイン時にstudentIdとあだ名をトークンに追加
            if (user?.email) {
                token.studentId = extractStudentId(user.email);
                token.memberName =
                    ((user as Record<string, unknown>).memberName as string) ||
                    null;
                token.nickname =
                    ((user as Record<string, unknown>).nickname as string) ||
                    null;
                token.displayName =
                    ((user as Record<string, unknown>).displayName as string) ||
                    null;
                token.permission =
                    ((user as Record<string, unknown>).permission as
                        | MemberPermission
                        | null) || undefined;
                token.memberProfileSyncedAt = Date.now();
            }

            // D1側で更新された権限・表示名もログイン中のセッションへ反映する。
            const lastSyncedAt =
                typeof token.memberProfileSyncedAt === "number"
                    ? token.memberProfileSyncedAt
                    : 0;
            const shouldRefreshMemberProfile =
                token.studentId &&
                (!token.permission ||
                    !token.memberName ||
                    !token.displayName ||
                    Date.now() - lastSyncedAt > MEMBER_PROFILE_REFRESH_MS);
            if (shouldRefreshMemberProfile) {
                const result = await resolveMemberProfile(token.studentId as string);
                if (result.isMember) {
                    token.memberName = result.name;
                    token.nickname = result.nickname;
                    token.displayName = result.displayName;
                    token.permission = result.permission || undefined;
                    token.memberProfileSyncedAt = Date.now();
                }
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
            if (token.studentId) {
                session.studentId = token.studentId as string;
            }
            if (token.memberName) {
                session.memberName = token.memberName as string;
            }
            if (token.nickname) {
                session.nickname = token.nickname as string;
            }
            if (token.displayName) {
                session.displayName = token.displayName as string;
            }
            if (token.permission) {
                session.permission = token.permission as MemberPermission;
            }
            if (token.profileImage) {
                session.profileImage = token.profileImage as string;
            }
            if (session.user) {
                session.user.name =
                    (token.displayName as string) ||
                    (token.memberName as string) ||
                    session.user.name ||
                    (token.studentId as string) ||
                    null;
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
