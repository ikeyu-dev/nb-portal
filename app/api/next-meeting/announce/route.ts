import { NextResponse } from "next/server";
import { auth, resolveMemberProfile } from "@/src/auth";

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

export async function POST() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    const resolvedPermission =
        session.permission ||
        (session.studentId
            ? (await resolveMemberProfile(session.studentId)).permission
            : null);

    if (resolvedPermission !== "HEAD" && resolvedPermission !== "SUB_HEAD") {
        return NextResponse.json(
            { success: false, error: "Forbidden" },
            { status: 403 }
        );
    }

    if (!GAS_API_URL) {
        return NextResponse.json(
            { success: false, error: "GAS API URL is not configured" },
            { status: 500 }
        );
    }

    try {
        const url = new URL(GAS_API_URL);
        url.searchParams.append("path", "next-meeting/announce");

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.ok ? 200 : 500 });
    } catch (error) {
        console.error("Next meeting announce API route error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
