import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import crypto from "crypto";

import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";

const BACKEND_API_URL = getBackendApiUrl();
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT!;
const PUSH_API_SECRET = process.env.PUSH_API_SECRET!;

/**
 * タイミングセーフな文字列比較
 * タイミング攻撃を防ぐため、常に一定時間で比較を行う
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (!a || !b) {
        return false;
    }

    if (a.length !== b.length) {
        // 長さが異なる場合でもタイミング攻撃を防ぐため、ダミー比較を実行
        crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// VAPIDの設定
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface PushSubscription {
    studentId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
}

export async function POST(request: NextRequest) {
    try {
        if (!PUSH_API_SECRET) {
            return NextResponse.json(
                { error: "Push API secret is not configured" },
                { status: 500 }
            );
        }

        // APIシークレットの検証
        const authHeader = request.headers.get("authorization");
        const providedSecret = authHeader?.replace("Bearer ", "") || "";

        // タイミングセーフな比較でAPIシークレットを検証
        if (!timingSafeEqual(providedSecret, PUSH_API_SECRET)) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = (await request.json()) as {
            title?: string;
            body?: string;
            url?: string;
            tag?: string;
        };
        const { title, body: messageBody, url, tag } = body;

        if (!title) {
            return NextResponse.json(
                { error: "Title is required" },
                { status: 400 }
            );
        }

        // Backendから購読者一覧を取得
        const subscriptionsResponse = await fetch(
            `${BACKEND_API_URL}?path=push-subscriptions`,
            { headers: getBackendApiHeaders() }
        );
        const subscriptionsData = (await subscriptionsResponse.json()) as {
            success?: boolean;
            data?: PushSubscription[];
            error?: string;
        };

        if (!subscriptionsData.success || !subscriptionsData.data) {
            return NextResponse.json(
                { error: "Failed to fetch subscriptions" },
                { status: 500 }
            );
        }

        const subscriptions: PushSubscription[] = subscriptionsData.data;

        if (subscriptions.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No subscriptions to send to",
                sent: 0,
            });
        }

        const payload = JSON.stringify({
            title,
            body: messageBody || "",
            url: url || "/notifications",
            tag: tag || "nb-portal-notification",
        });

        // 各購読者に通知を送信
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth,
                            },
                        },
                        payload
                    );
                    return { success: true, endpoint: sub.endpoint };
                } catch (error) {
                    // 410 Gone の場合、購読が無効なので削除をリクエスト
                    if (
                        error instanceof webpush.WebPushError &&
                        error.statusCode === 410
                    ) {
                        // 無効な購読を削除
                        await fetch(`${BACKEND_API_URL}?path=push-unsubscribe`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                ...getBackendApiHeaders(),
                            },
                            body: JSON.stringify({
                                endpoint: sub.endpoint,
                            }),
                        });
                    }
                    return {
                        success: false,
                        endpoint: sub.endpoint,
                        error:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    };
                }
            })
        );

        const successful = results.filter(
            (r) => r.status === "fulfilled" && r.value.success
        ).length;
        const failed = results.length - successful;

        return NextResponse.json({
            success: true,
            sent: successful,
            failed,
            total: subscriptions.length,
        });
    } catch (error) {
        console.error("Error sending push notifications:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
