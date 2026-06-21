import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/src/auth";
import { CACHE_TAGS } from "@/src/shared/lib/cache-policy";
import {
    type AbsenceSubmitData,
    absenceDeleteSchema,
    absenceSubmitSchema,
    formatValidationErrors,
} from "@/src/shared/lib/validation";
import { validateOrigin, validateContentType } from "@/src/shared/lib/csrf";
import { sendDiscordWebhook } from "@/src/shared/lib/discord";
import { isAttendanceResponseAllowed } from "@/src/shared/lib/schedule-deadline";

import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";

const BACKEND_API_URL = getBackendApiUrl();

const buildSubmitBody = (
    body: Record<string, unknown>,
    session: Session
) => {
    const sessionDisplayName =
        session.displayName ||
        session.memberName ||
        session.nickname ||
        session.user?.name ||
        session.studentId;

    return {
        ...body,
        studentNumber: session.studentId,
        name: body.name || sessionDisplayName,
        reason: body.type === "出席" ? body.reason || "出席" : body.reason,
    };
};

const postToBackend = async (path: string, body: unknown) => {
    if (!BACKEND_API_URL) {
        throw new Error("Backend API URL is not configured");
    }

    const url = new URL(BACKEND_API_URL);
    url.searchParams.append("path", path);

    const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getBackendApiHeaders(),
        },
        body: JSON.stringify(body),
    });

    const responseText = await response.text();
    try {
        const data = JSON.parse(responseText);
        if (!response.ok) {
            return {
                success: false,
                error: data?.error || `Backend API error: ${response.status}`,
            };
        }
        return data;
    } catch {
        console.error("Backend API returned non-JSON response:", {
            status: response.status,
            body: responseText.slice(0, 500),
        });
        return {
            success: false,
            error: `Backend API returned non-JSON response: ${response.status}`,
        };
    }
};

const fetchScheduleByEventId = async (eventId: string) => {
    if (!BACKEND_API_URL || !eventId) return null;

    const url = new URL(BACKEND_API_URL);
    url.searchParams.append("path", "schedules");

    const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        headers: getBackendApiHeaders(),
    });
    const data = (await response.json()) as {
        success?: boolean;
        data?: Array<Record<string, unknown>>;
    };
    if (!response.ok || !data.success || !Array.isArray(data.data)) {
        return null;
    }

    return (
        data.data.find(
            (schedule) => String(schedule.EVENT_ID ?? "") === eventId
        ) || null
    );
};

const getScheduleResponseWindow = (schedule: Record<string, unknown>) => ({
    startDate:
        schedule.YYYY && schedule.MM && schedule.DD
            ? `${String(schedule.YYYY).padStart(4, "0")}-${String(
                  schedule.MM
              ).padStart(2, "0")}-${String(schedule.DD).padStart(2, "0")}`
            : "",
    endDate:
        schedule.END_YYYY && schedule.END_MM && schedule.END_DD
            ? `${String(schedule.END_YYYY).padStart(4, "0")}-${String(
                  schedule.END_MM
              ).padStart(2, "0")}-${String(schedule.END_DD).padStart(2, "0")}`
            : "",
    startTime:
        schedule.TIME_HH !== "" &&
        schedule.TIME_HH !== null &&
        schedule.TIME_HH !== undefined
            ? `${String(schedule.TIME_HH).padStart(2, "0")}:${String(
                  schedule.TIME_MM || "0"
              ).padStart(2, "0")}`
            : "",
    endTime:
        schedule.END_TIME_HH !== "" &&
        schedule.END_TIME_HH !== null &&
        schedule.END_TIME_HH !== undefined
            ? `${String(schedule.END_TIME_HH).padStart(2, "0")}:${String(
                  schedule.END_TIME_MM || "0"
              ).padStart(2, "0")}`
            : "",
    deadlineDate: String(schedule.ATTENDANCE_DEADLINE ?? ""),
});

const validateAttendanceDeadline = async (eventId: string) => {
    const schedule = await fetchScheduleByEventId(eventId);
    if (!schedule) return null;

    if (isAttendanceResponseAllowed(getScheduleResponseWindow(schedule))) {
        return null;
    }

    return NextResponse.json(
        {
            success: false,
            error: "この予定の出欠連絡期限を過ぎています",
        },
        { status: 403 }
    );
};

const getAbsenceColor = (type: AbsenceSubmitData["type"]) => {
    const colorMap = {
        欠席: 0xff0000,
        遅刻: 0xffa500,
        早退: 0xffcc00,
        中抜け: 0x0099ff,
        出席: 0x00aa66,
    } as const;

    return colorMap[type] || 0x808080;
};

const formatTypeWithTime = (data: AbsenceSubmitData) => {
    if (data.type === "早退" && data.timeLeavingEarly) {
        return `${data.type}（${data.timeLeavingEarly}）`;
    }

    if (data.type === "中抜け" && (data.timeStepOut || data.timeReturn)) {
        return `${data.type}（${data.timeStepOut || ""} ~ ${
            data.timeReturn || ""
        }）`;
    }

    return data.type;
};

const getEventDateTimeLabel = (data: AbsenceSubmitData) =>
    [data.eventDateLabel, data.eventTimeLabel].filter(Boolean).join(" ");

const getAbsenceNotificationTitle = (data: AbsenceSubmitData) =>
    `${data.name || "不明"}：${
        data.type === "出席" ? "出席連絡" : `${data.type}連絡`
    }`;

const formatDiscordDateTime = (value?: string) => {
    if (!value) return "";

    const jstWallClockMatch = value.match(
        /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?(?:\+09:00)?$/
    );
    if (jstWallClockMatch) {
        return `${jstWallClockMatch[1]}/${jstWallClockMatch[2]}/${jstWallClockMatch[3]} ${jstWallClockMatch[4]}:${jstWallClockMatch[5]}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const buildAbsenceDescription = (data: AbsenceSubmitData) => {
    const eventLines = [
        `**${data.eventTitle || data.eventId}**`,
        getEventDateTimeLabel(data),
    ].filter(Boolean);
    const responseLines = [
        `種別：${formatTypeWithTime(data)}`,
        data.type !== "出席" && data.reason ? `理由：${data.reason}` : null,
        data.reasonDetail ? `詳細：${data.reasonDetail}` : null,
    ].filter(Boolean);

    return [eventLines.join("\n"), responseLines.join("\n")].join("\n\n");
};

const sendAbsenceDiscordNotification = async (
    data: AbsenceSubmitData,
    timestamp?: string
) => {
    const result = await sendDiscordWebhook({
        embeds: [
            {
                title: getAbsenceNotificationTitle(data),
                description: buildAbsenceDescription(data),
                color: getAbsenceColor(data.type),
                ...(timestamp
                    ? { footer: { text: formatDiscordDateTime(timestamp) } }
                    : {}),
            },
        ],
    });

    if (!result.success) {
        console.error("Discord webhook failed:", result);
        return false;
    }

    return true;
};

const attachDiscordResult = (
    data: Record<string, unknown>,
    discordNotified: boolean
) => ({
    ...data,
    data:
        data.data && typeof data.data === "object"
            ? { ...data.data, discordNotified }
            : { discordNotified },
});

/**
 * 欠席連絡送信API
 * CSRF保護、セッション認証、入力バリデーションを適用
 */
export async function POST(request: NextRequest) {
    // CSRF保護: Originチェック
    const originError = validateOrigin(request);
    if (originError) {
        return originError;
    }

    // CSRF保護: Content-Typeチェック
    const contentTypeError = validateContentType(request);
    if (contentTypeError) {
        return contentTypeError;
    }

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
        const submitBody = buildSubmitBody(body, session);

        // 入力バリデーション
        const validationResult = absenceSubmitSchema.safeParse(submitBody);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "バリデーションエラー",
                    details: formatValidationErrors(validationResult.error),
                },
                { status: 400 }
            );
        }

        const validatedData = validationResult.data;
        const deadlineError = await validateAttendanceDeadline(
            validatedData.eventId
        );
        if (deadlineError) return deadlineError;

        const data = await postToBackend("absences", validatedData);

        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.absences, "max");
            const discordNotified = await sendAbsenceDiscordNotification(
                validatedData,
                data.data?.timestamp
            );
            return NextResponse.json(
                attachDiscordResult(data, discordNotified)
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

export async function PUT(request: NextRequest) {
    const originError = validateOrigin(request);
    if (originError) {
        return originError;
    }

    const contentTypeError = validateContentType(request);
    if (contentTypeError) {
        return contentTypeError;
    }

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
        const submitBody = buildSubmitBody(body, session);
        const validationResult = absenceSubmitSchema.safeParse(submitBody);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "バリデーションエラー",
                    details: formatValidationErrors(validationResult.error),
                },
                { status: 400 }
            );
        }

        const deadlineError = await validateAttendanceDeadline(
            validationResult.data.eventId
        );
        if (deadlineError) return deadlineError;

        const data = await postToBackend("absences/update", validationResult.data);

        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.absences, "max");
            const discordNotified = await sendAbsenceDiscordNotification(
                validationResult.data,
                data.data?.timestamp
            );
            return NextResponse.json(
                attachDiscordResult(data, discordNotified)
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

export async function DELETE(request: NextRequest) {
    const originError = validateOrigin(request);
    if (originError) {
        return originError;
    }

    const contentTypeError = validateContentType(request);
    if (contentTypeError) {
        return contentTypeError;
    }

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
        const validationResult = absenceDeleteSchema.safeParse({
            ...body,
            studentNumber: session.studentId,
        });
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "バリデーションエラー",
                    details: formatValidationErrors(validationResult.error),
                },
                { status: 400 }
            );
        }

        const data = await postToBackend("absences/delete", validationResult.data);

        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.absences, "max");
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
