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
    const year = String(data.year ?? "");
    const month = String(data.month ?? "");
    const date = String(data.date ?? "");
    if (!year || !month || !date) return "";
    return `${year}/${month}/${date}`;
};

const formatScheduleTime = (data: Record<string, unknown>) => {
    const hour = String(data.timeHH ?? "");
    const minute = String(data.timeMM ?? "");
    if (!hour) return "";
    return `${hour.padStart(2, "0")}:${(minute || "0").padStart(2, "0")}`;
};

const buildSchedulePushBody = (data: Record<string, unknown>) => {
    const date = formatScheduleDate(data);
    const time = formatScheduleTime(data);
    const place = String(data.where ?? "");
    return [date, time, place].filter(Boolean).join(" ");
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
            await sendPushNotification(request.nextUrl.origin, {
                title: `予定が追加されました: ${String(scheduleData.title ?? "予定")}`,
                body: buildSchedulePushBody(scheduleData),
                url: "/calendar",
                tag: "nb-portal-schedule-created",
            });
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
            error?: string;
        };

        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.schedules, "max");
            revalidateTag(CACHE_TAGS.nextMeeting, "max");
            revalidateTag(CACHE_TAGS.notifications, "max");
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
