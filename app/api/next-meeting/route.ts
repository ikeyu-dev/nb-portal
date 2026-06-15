import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, resolveMemberProfile } from "@/src/auth";
import { CACHE_TAGS } from "@/src/shared/lib/cache-policy";
import {
    formatValidationErrors,
    nextMeetingUpdateSchema,
} from "@/src/shared/lib/validation";
import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";
import { validateWriteRequest } from "@/src/shared/lib/csrf";
import { sendPushNotification } from "@/src/shared/lib/push-notification-server";

const BACKEND_API_URL = getBackendApiUrl();

const extractStudentId = (email: string | null | undefined): string => {
    if (!email) return "";
    const localPart = email.split("@")[0];
    return localPart.substring(0, 7).toLowerCase();
};

const formatNextMeetingPushBody = (date: string, time: string, mode: string) => {
    const place = mode === "DISCORD" ? "Discord" : "対面";
    return `${date.replaceAll("-", "/")} ${time} ${place}`;
};

export async function POST(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

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

    if (!BACKEND_API_URL) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
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
        const url = new URL(BACKEND_API_URL);
        url.searchParams.append("path", "next-meeting");

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getBackendApiHeaders(),
            },
            body: JSON.stringify({
                ...validation.data,
                updatedBy,
            }),
        });

        const data = (await response.json()) as {
            success?: boolean;
            data?: Record<string, unknown>;
            error?: string;
        };
        if (data?.success === true) {
            if (data.data && typeof data.data === "object") {
                data.data.updatedByName =
                    session.displayName || session.memberName || null;
            }
            revalidateTag(CACHE_TAGS.nextMeeting, "max");
            revalidateTag(CACHE_TAGS.schedules, "max");
            revalidateTag(CACHE_TAGS.notifications, "max");
            await sendPushNotification(request.nextUrl.origin, {
                title: "次回部会が登録されました",
                body: formatNextMeetingPushBody(
                    validation.data.date,
                    validation.data.time,
                    validation.data.mode
                ),
                url: "/home",
                tag: "nb-portal-next-meeting",
            });
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
