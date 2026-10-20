import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { validateWriteRequest } from "@/src/shared/lib/csrf";
import { sendDiscordWebhook } from "@/src/shared/lib/discord";
import {
    getBackendApiHeaders,
    getBackendApiUrl,
} from "@/src/shared/lib/server-env";

const formatSurveyDeadline = (value: unknown) => {
    if (typeof value !== "string") return "日時未設定";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    })
        .format(date)
        .replaceAll("-", "/");
};

async function backend(request: NextRequest, method: "GET" | "POST") {
    if (method === "POST") {
        const invalid = validateWriteRequest(request);
        if (invalid) return invalid;
    }

    const session = await auth();
    const actor = session?.studentId;
    if (!actor) {
        return NextResponse.json(
            { success: false, error: "ログインが必要です" },
            { status: 401 }
        );
    }

    const localBackendUrl =
        process.env.NODE_ENV === "development"
            ? process.env.SURVEY_BACKEND_URL
            : undefined;
    const url = new URL(localBackendUrl || getBackendApiUrl());
    url.searchParams.set("path", "surveys");
    const headers = getBackendApiHeaders();
    if (localBackendUrl && process.env.SURVEY_BACKEND_API_KEY) {
        headers["x-nb-portal-api-key"] = process.env.SURVEY_BACKEND_API_KEY;
    }
    let body: string | undefined;
    if (method === "GET") {
        const id = request.nextUrl.searchParams.get("id");
        if (id) url.searchParams.set("id", id);
        url.searchParams.set("actor", actor);
    } else {
        const raw = await request.text();
        if (raw.length > 100_000) {
            return NextResponse.json(
                { success: false, error: "入力が長すぎます" },
                { status: 413 }
            );
        }
        try {
            body = JSON.stringify({ ...JSON.parse(raw), actor });
        } catch {
            return NextResponse.json(
                { success: false, error: "入力が不正です" },
                { status: 400 }
            );
        }
        headers["Content-Type"] = "application/json";
    }

    try {
        const response = await fetch(url, {
            method,
            headers,
            body,
            cache: "no-store",
        });
        const responseBody = await response.text();
        if (method === "POST" && response.ok) {
            try {
                const submitted = JSON.parse(body || "{}") as Record<
                    string,
                    unknown
                >;
                const result = JSON.parse(responseBody) as {
                    data?: { id?: string; publishedNow?: boolean };
                };
                const id = result.data?.id;
                if (
                    submitted.action === "publish" &&
                    result.data?.publishedNow &&
                    id
                ) {
                    const surveyUrl = new URL(
                        `/surveys/${encodeURIComponent(id)}`,
                        request.nextUrl.origin
                    ).toString();
                    const notification = await sendDiscordWebhook({
                        target: "survey",
                        embeds: [
                            {
                                author: {
                                    name: "新規アンケートが作成されました",
                                },
                                title: String(
                                    submitted.title || "新しいアンケート"
                                ),
                                description: submitted.description
                                    ? String(submitted.description)
                                    : undefined,
                                color: 0x0ea5e9,
                                fields: [
                                    {
                                        name: "回答期限",
                                        value: formatSurveyDeadline(
                                            submitted.deadlineAt
                                        ),
                                        inline: true,
                                    },
                                    {
                                        name: "アンケートのリンク",
                                        value: surveyUrl,
                                        inline: false,
                                    },
                                ],
                            },
                        ],
                    });
                    if (!notification.success) {
                        console.error(
                            "Survey Discord notification failed:",
                            notification.error
                        );
                    }
                }
            } catch (error) {
                console.error("Survey Discord notification failed:", error);
            }
        }
        return new NextResponse(responseBody, {
            status: response.status,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store",
            },
        });
    } catch {
        return NextResponse.json(
            { success: false, error: "アンケートを取得できませんでした" },
            { status: 502 }
        );
    }
}

export const GET = (request: NextRequest) => backend(request, "GET");
export const POST = (request: NextRequest) => backend(request, "POST");
