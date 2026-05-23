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

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

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

const postToGAS = async (path: string, body: unknown) => {
    if (!GAS_API_URL) {
        throw new Error("GAS API URL is not configured");
    }

    const url = new URL(GAS_API_URL);
    url.searchParams.append("path", path);

    const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const responseText = await response.text();
    try {
        const data = JSON.parse(responseText);
        if (!response.ok) {
            return {
                success: false,
                error: data?.error || `GAS API error: ${response.status}`,
            };
        }
        return data;
    } catch {
        console.error("GAS API returned non-JSON response:", {
            status: response.status,
            body: responseText.slice(0, 500),
        });
        return {
            success: false,
            error: `GAS API returned non-JSON response: ${response.status}`,
        };
    }
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
                ...(timestamp ? { footer: { text: timestamp } } : {}),
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
    if (!GAS_API_URL) {
        return NextResponse.json(
            { success: false, error: "GAS API URL is not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
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
        const data = await postToGAS("absences", validatedData);

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
    if (!GAS_API_URL) {
        return NextResponse.json(
            { success: false, error: "GAS API URL is not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
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

        const data = await postToGAS("absences/update", validationResult.data);

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
    if (!GAS_API_URL) {
        return NextResponse.json(
            { success: false, error: "GAS API URL is not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
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

        const data = await postToGAS("absences/delete", validationResult.data);

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
