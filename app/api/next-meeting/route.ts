import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, resolveMemberProfile } from "@/src/auth";
import { CACHE_TAGS } from "@/src/shared/lib/cache-policy";
import {
    formatValidationErrors,
    nextMeetingUpdateSchema,
} from "@/src/shared/lib/validation";

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

const extractStudentId = (email: string | null | undefined): string => {
    if (!email) return "";
    const localPart = email.split("@")[0];
    return localPart.substring(0, 7).toLowerCase();
};

export async function POST(request: NextRequest) {
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
        const body = await request.json();
        const validation = nextMeetingUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "バリデーションエラー",
                    details: formatValidationErrors(validation.error),
                },
                { status: 400 }
            );
        }

        const updatedBy =
            session.studentId ||
            extractStudentId(session.user.email) ||
            session.displayName ||
            session.memberName ||
            "unknown";
        const url = new URL(GAS_API_URL);
        url.searchParams.append("path", "next-meeting");

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...validation.data,
                updatedBy,
            }),
        });

        const data = await response.json();
        if (data?.success === true) {
            if (data.data && typeof data.data === "object") {
                data.data.updatedByName =
                    session.displayName || session.memberName || null;
            }
            revalidateTag(CACHE_TAGS.nextMeeting, "max");
            revalidateTag(CACHE_TAGS.schedules, "max");
            revalidateTag(CACHE_TAGS.notifications, "max");
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Next meeting API route error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
