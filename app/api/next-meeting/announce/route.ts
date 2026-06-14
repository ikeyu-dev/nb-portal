import { NextRequest, NextResponse } from "next/server";
import { auth, resolveMemberProfile } from "@/src/auth";
import { sendDiscordWebhook } from "@/src/shared/lib/discord";
import type { NextMeetingSettings } from "@/src/shared/types/api";
import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";
import { validateOrigin } from "@/src/shared/lib/csrf";

const BACKEND_API_URL = getBackendApiUrl();

const normalizeAnnounceError = (error?: string) => {
    if (!error) return "次回部会連絡の送信に失敗しました";
    return error;
};

const getNextMeetingMentionText = () =>
    process.env.DISCORD_MEETING_ROLE_MENTION || "@部員";

const getNextMeetingUnsetMentionText = () =>
    process.env.DISCORD_MEETING_UNSET_ROLE_MENTION || "@部長";

const formatNextMeetingDateLabel = (dateString: string, timeString: string) => {
    const date = new Date(`${dateString}T00:00:00`);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${dateString.replace(/-/g, "/")}(${weekdays[date.getDay()]}) ${timeString}`;
};

const formatDateTime = (value: string) => {
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

const buildNextMeetingReminderEmbed = (settings: NextMeetingSettings) => {
    const updatedAtLabel = settings.updatedAt
        ? formatDateTime(settings.updatedAt)
        : null;
    const footerText = [
        updatedAtLabel ? `更新 ${updatedAtLabel}` : null,
        settings.updatedBy || settings.updatedByName || null,
    ]
        .filter(Boolean)
        .join(" / ");

    return {
        title: "次回部会のお知らせ",
        description:
            settings.mode === "DISCORD"
                ? "次回部会は Discord で行います。"
                : "次回部会は対面で行います。",
        color: settings.mode === "DISCORD" ? 0x5865f2 : 0x2ecc71,
        fields: [
            {
                name: "日時",
                value: formatNextMeetingDateLabel(settings.date, settings.time),
                inline: false,
            },
        ],
        ...(footerText ? { footer: { text: footerText } } : {}),
    };
};

const fetchNextMeeting = async () => {
    if (!BACKEND_API_URL) {
        throw new Error("Backend API URL is not configured");
    }

    const url = new URL(BACKEND_API_URL);
    url.searchParams.append("path", "next-meeting");

    const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        headers: getBackendApiHeaders(),
    });
    const data = (await response.json()) as {
        success?: boolean;
        data?: unknown;
        error?: string;
    };

    if (!response.ok || data?.success === false) {
        throw new Error(normalizeAnnounceError(data?.error));
    }

    return (data?.data || null) as NextMeetingSettings | null;
};

export async function POST(request: NextRequest) {
    const originError = validateOrigin(request);
    if (originError) return originError;

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
        const settings = await fetchNextMeeting();

        const result = settings
            ? await sendDiscordWebhook({
                  target: "meeting",
                  embeds: [buildNextMeetingReminderEmbed(settings)],
                  content: getNextMeetingMentionText(),
              })
            : await sendDiscordWebhook({
                  target: "meeting",
                  embeds: [
                      {
                          title: "次回部会が未設定です",
                          description:
                              "次回部会が設定されていません。ポータルから次回部会を設定してください。",
                          color: 0xf1c40f,
                      },
                  ],
                  content: getNextMeetingUnsetMentionText(),
              });

        return NextResponse.json(
            {
                ...result,
                message: result.success
                    ? "Next meeting announcement sent"
                    : undefined,
                error: result.success
                    ? undefined
                    : normalizeAnnounceError(result.error),
            },
            { status: result.success ? 200 : 502 }
        );
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
