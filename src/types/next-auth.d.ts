import "next-auth";
import type { MemberPermission } from "@/src/shared/types/api";

declare module "next-auth" {
    interface Session {
        studentId?: string;
        memberName?: string;
        nickname?: string;
        displayName?: string;
        permission?: MemberPermission;
        profileImage?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        studentId?: string;
        memberName?: string;
        nickname?: string;
        displayName?: string;
        permission?: MemberPermission;
        profileImage?: string;
        profileImageFetched?: boolean;
        memberProfileSyncedAt?: number;
    }
}
