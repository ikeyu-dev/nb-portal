import "next-auth";

declare module "next-auth" {
    interface Session {
        studentId?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        studentId?: string;
    }
}
