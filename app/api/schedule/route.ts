import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/src/auth";
import { CACHE_TAGS } from "@/src/shared/lib/cache-policy";
import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";
import { validateWriteRequest } from "@/src/shared/lib/csrf";
import { sendPushNotification } from "@/src/shared/lib/push-notification-server";

const BACKEND_API_URL = getBackendApiUrl();

// メールアドレスから学籍番号（最初の7文字）を抽出
const extractStudentId = (email: string | null | undefined): string => {
    if (!email) return "";
    const localPart = email.split("@")[0];
    return localPart.substring(0, 7).toLowerCase();
};

const formatScheduleDate = (data: Record<string, unknown>) => {
    const year = String(data.year ?? data.YYYY ?? "");
    const month = String(data.month ?? data.MM ?? "");
    const date = String(data.date ?? data.DD ?? "");
    if (!year || !month || !date) return "";
    return `${year}/${month}/${date}`;
};

const formatScheduleTime = (data: Record<string, unknown>) => {
    const hour = String(data.timeHH ?? data.TIME_HH ?? "");
    const minute = String(data.timeMM ?? data.TIME_MM ?? "");
    if (!hour) return "";
    return `${hour.padStart(2, "0")}:${(minute || "0").padStart(2, "0")}`;
};

const getScheduleTitle = (data: Record<string, unknown>) =>
    String(data.title ?? data.TITLE ?? "予定");

const getScheduleKindLabel = (data: Record<string, unknown>) =>
    getScheduleTitle(data) === "部会" ? "部会" : "予定";

const getScheduleEventId = (data: Record<string, unknown>) =>
    String(data.eventId ?? data.EVENT_ID ?? "");

const buildSchedulePushBody = (data: Record<string, unknown>) => {
    const date = formatScheduleDate(data);
    const time = formatScheduleTime(data);
    const place = String(data.where ?? data.WHERE ?? "");
    return [date, time, place].filter(Boolean).join(" ");
};

const fetchScheduleForNotification = async (
    eventId: string
): Promise<Record<string, unknown> | null> => {
    if (!BACKEND_API_URL || !eventId) return null;

    try {
        const url = new URL(BACKEND_API_URL);
        url.searchParams.append("path", "schedules");
        const response = await fetch(url.toString(), {
            headers: getBackendApiHeaders(),
            cache: "no-store",
        });
        const data = (await response.json()) as {
            success?: boolean;
            data?: Array<Record<string, unknown>>;
        };
        if (!data.success || !Array.isArray(data.data)) return null;
        return (
            data.data.find((schedule) => getScheduleEventId(schedule) === eventId) ||
            null
        );
    } catch (error) {
        console.error("Failed to fetch schedule for push notification:", error);
        return null;
    }
};

const sendSchedulePushNotification = async (
    origin: string,
    action: "created" | "updated" | "deleted",
    scheduleData: Record<string, unknown>
) => {
    const actionLabel = {
        created: "追加",
        updated: "更新",
        deleted: "削除",
    }[action];
    const eventId = getScheduleEventId(scheduleData);

    await sendPushNotification(origin, {
        title: `${getScheduleKindLabel(scheduleData)}が${actionLabel}されました: ${getScheduleTitle(scheduleData)}`,
        body: buildSchedulePushBody(scheduleData),
        url: "/calendar",
        tag: eventId
            ? `nb-portal-schedule-${action}-${eventId}`
            : `nb-portal-schedule-${action}`,
    });
};

// スケジュール新規作成
export async function POST(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    // 認証チェック
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }
    if (!BACKEND_API_URL) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
            { status: 500 }
        );
    }

    try {
        const body = (await request.json()) as Record<string, unknown>;

        // ログインユーザーの学籍番号を作成者として追加
        const createdBy = extractStudentId(session.user.email);

        // Backend APIに転送
        const url = new URL(BACKEND_API_URL);
        url.searchParams.append("path", "schedules");

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getBackendApiHeaders(),
            },
            body: JSON.stringify({
                ...body,
                createdBy,
            }),
        });

        const data = (await response.json()) as {
            success?: boolean;
            data?: Record<string, unknown>;
            error?: string;
        };

        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.schedules, "max");
            revalidateTag(CACHE_TAGS.nextMeeting, "max");
            revalidateTag(CACHE_TAGS.notifications, "max");
            const scheduleData = data.data || body;
            await sendSchedulePushNotification(
                request.nextUrl.origin,
                "created",
                scheduleData
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("API route error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

// スケジュール削除
export async function DELETE(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    // 認証チェック
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }
    if (!BACKEND_API_URL) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
            { status: 500 }
        );
    }

    try {
        const body = (await request.json()) as Record<string, unknown>;
        const eventId = getScheduleEventId(body);
        const scheduleBeforeDelete = await fetchScheduleForNotification(eventId);

        // Backend APIに転送
        const url = new URL(BACKEND_API_URL);
        url.searchParams.append("path", "schedules/delete");

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getBackendApiHeaders(),
            },
            body: JSON.stringify(body),
        });

        const data = (await response.json()) as {
            success?: boolean;
            error?: string;
        };

        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.schedules, "max");
            revalidateTag(CACHE_TAGS.nextMeeting, "max");
            revalidateTag(CACHE_TAGS.notifications, "max");
            await sendSchedulePushNotification(
                request.nextUrl.origin,
                "deleted",
                scheduleBeforeDelete || body
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("API route error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

// スケジュール更新
export async function PUT(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    // 認証チェック
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }
    if (!BACKEND_API_URL) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
            { status: 500 }
        );
    }

    try {
        const body = (await request.json()) as Record<string, unknown>;

        // ログインユーザーの学籍番号を更新者として追加
        const updatedBy = extractStudentId(session.user.email);

        // Backend APIに転送
        const url = new URL(BACKEND_API_URL);
        url.searchParams.append("path", "schedules/update");

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getBackendApiHeaders(),
            },
            body: JSON.stringify({
                ...body,
                updatedBy,
            }),
        });

        const data = (await response.json()) as {
            success?: boolean;
            data?: Record<string, unknown>;
            error?: string;
        };

        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.schedules, "max");
            revalidateTag(CACHE_TAGS.nextMeeting, "max");
            revalidateTag(CACHE_TAGS.notifications, "max");
            await sendSchedulePushNotification(
                request.nextUrl.origin,
                "updated",
                data.data || body
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("API route error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
