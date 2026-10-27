import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { validateWriteRequest } from "@/src/shared/lib/csrf";
import {
    getBackendApiHeaders,
    getBackendApiUrl,
} from "@/src/shared/lib/server-env";

type WorkerResult = {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
};

type ClaimedMeeting = {
    id: string;
    title: string;
    meetingDate: string | null;
    startTime: string | null;
    locationType: string | null;
    locationDetail: string;
    attendees: Array<{ nickname: string | null; name: string }>;
};

const json = (body: unknown, status = 200) =>
    NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
    });

async function workerRequest(
    method: "GET" | "POST",
    actor: string,
    query?: URLSearchParams,
    body?: Record<string, unknown>
) {
    const url = new URL(getBackendApiUrl());
    url.searchParams.set("path", "executive-meetings");
    url.searchParams.set("actor", actor);
    query?.forEach((value, key) => url.searchParams.set(key, value));
    return fetch(url, {
        method,
        headers: {
            ...getBackendApiHeaders(),
            ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify({ ...body, actor }) : undefined,
        cache: "no-store",
    });
}

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.studentId)
        return json({ success: false, error: "ログインが必要です" }, 401);
    try {
        const query = new URLSearchParams();
        for (const key of ["id", "q", "since"] as const) {
            const value = request.nextUrl.searchParams.get(key);
            if (value) query.set(key, value);
        }
        const response = await workerRequest("GET", session.studentId, query);
        return json(await response.json(), response.status);
    } catch {
        return json(
            { success: false, error: "議事録を取得できませんでした" },
            502
        );
    }
}

async function sendClaimedPart(
    request: NextRequest,
    actor: string,
    claim: WorkerResult
) {
    const data = claim.data ?? {};
    const part = data.part;
    const webhook = process.env.DISCORD_EXECUTIVE_MEETING_WEBHOOK_URL;
    const threadId = process.env.DISCORD_EXECUTIVE_MEETING_THREAD_ID;
    let error = "";

    if (!webhook || !threadId) {
        error = "議事録専用Discord送信先が設定されていません";
    } else {
        try {
            const meeting = data.meeting as ClaimedMeeting;
            const discordUrl = new URL(webhook);
            if (
                discordUrl.hostname !== "discord.com" ||
                !discordUrl.pathname.startsWith("/api/webhooks/")
            ) {
                throw new Error("議事録専用Webhook URLが不正です");
            }
            discordUrl.searchParams.set("thread_id", threadId);
            discordUrl.searchParams.set("wait", "true");
            const meetingDate = String(meeting.meetingDate ?? "").replaceAll(
                "-",
                "/"
            );
            const start = `${meetingDate} ${meeting.startTime ?? ""}`;
            const locationLabels: Record<string, string> = {
                MEETING_ROOM: "会議室",
                DISCORD: "Discord",
                CLUB_ROOM: "部室",
                OTHER: meeting.locationDetail,
            };
            const names = meeting.attendees
                .map((attendee) => attendee.nickname || attendee.name || "")
                .filter(Boolean)
                .join("、");
            const link = new URL(
                `/executive-meetings/${encodeURIComponent(meeting.id)}`,
                request.nextUrl.origin
            ).toString();
            const payload =
                part === "embed"
                    ? {
                          embeds: [
                              {
                                  title: meeting.title,
                                  url: link,
                                  color: 0x0284c7,
                                  fields: [
                                      {
                                          name: "開催日時",
                                          value: `${start} JST`,
                                          inline: true,
                                      },
                                      {
                                          name: "場所",
                                          value:
                                              locationLabels[
                                                  meeting.locationType ?? ""
                                              ] || "未設定",
                                          inline: true,
                                      },
                                      {
                                          name: "出席者",
                                          value: names || "なし",
                                          inline: false,
                                      },
                                      {
                                          name: "議事録",
                                          value: link,
                                          inline: false,
                                      },
                                  ],
                              },
                          ],
                      }
                    : {
                          content: (() => {
                              const characters = Array.from(
                                  String(data.markdown ?? "")
                              );
                              return characters.length > 2000
                                  ? `${characters.slice(0, 1995).join("")}...`
                                  : characters.join("");
                          })(),
                      };
            const discordResponse = await fetch(discordUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!discordResponse.ok)
                error = `Discordへの送信に失敗しました (${discordResponse.status})`;
        } catch (caught) {
            error =
                caught instanceof Error
                    ? caught.message
                    : "Discordへの送信に失敗しました";
        }
    }

    const result = await workerRequest("POST", actor, undefined, {
        action: "discord-result",
        id: (data.meeting as ClaimedMeeting).id,
        part,
        success: !error,
        error,
    });
    const resultBody = (await result.json()) as WorkerResult;
    return error
        ? json({ success: false, error, data: resultBody.data }, 502)
        : json(resultBody, result.status);
}

async function completeDiscordSend(
    request: NextRequest,
    actor: string,
    firstClaim: WorkerResult
) {
    let claim = firstClaim;
    let lastResult: NextResponse | null = null;
    for (let index = 0; index < 2; index += 1) {
        const result = await sendClaimedPart(request, actor, claim);
        lastResult = result;
        if (!result.ok) return result;
        const data = (await result.json()) as WorkerResult;
        if (claim.data?.part === "body") return json(data);
        const next = await workerRequest("POST", actor, undefined, {
            action: "claim-discord",
            id: (claim.data?.meeting as ClaimedMeeting | undefined)?.id,
        });
        const nextData = (await next.json()) as WorkerResult;
        if (!next.ok || !nextData.success) {
            if (next.status === 409) return json(data);
            return json(nextData, next.status);
        }
        claim = nextData;
    }
    return (
        lastResult ??
        json({ success: false, error: "Discord送信に失敗しました" }, 502)
    );
}

export async function POST(request: NextRequest) {
    const invalid = validateWriteRequest(request);
    if (invalid) return invalid;
    const session = await auth();
    if (!session?.studentId)
        return json({ success: false, error: "ログインが必要です" }, 401);
    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return json({ success: false, error: "入力が不正です" }, 400);
    }
    try {
        const response = await workerRequest(
            "POST",
            session.studentId,
            undefined,
            body
        );
        const responseBody = (await response.json()) as WorkerResult;
        if (
            response.ok &&
            body.action === "claim-discord" &&
            responseBody.success
        ) {
            return completeDiscordSend(
                request,
                session.studentId,
                responseBody
            );
        }
        return json(responseBody, response.status);
    } catch {
        return json(
            { success: false, error: "議事録を保存できませんでした" },
            502
        );
    }
}
