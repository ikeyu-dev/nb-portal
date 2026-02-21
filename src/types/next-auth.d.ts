import "next-auth";

declare module "next-auth" {
    interface Session {
        studentId?: string;
        memberName?: string;
        profileImage?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        studentId?: string;
        memberName?: string;
        profileImage?: string;
        profileImageFetched?: boolean;
    }
}
