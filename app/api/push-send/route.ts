import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT!;
const PUSH_API_SECRET = process.env.PUSH_API_SECRET!;

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
        // APIシークレットの検証（GASからの呼び出し用）
        const authHeader = request.headers.get("authorization");
        const providedSecret = authHeader?.replace("Bearer ", "");

        if (providedSecret !== PUSH_API_SECRET) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { title, body: messageBody, url, tag } = body;

        if (!title) {
            return NextResponse.json(
                { error: "Title is required" },
                { status: 400 }
            );
        }

        // GASから購読者一覧を取得
        const subscriptionsResponse = await fetch(
            `${GAS_API_URL}?path=push-subscriptions`
        );
        const subscriptionsData = await subscriptionsResponse.json();

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
                        await fetch(`${GAS_API_URL}?path=push-unsubscribe`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
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
