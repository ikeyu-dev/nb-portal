import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

// VAPID設定
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, body: notificationBody, url } = body;

        if (!title || !notificationBody) {
            return NextResponse.json(
                { success: false, error: "Missing required fields (title, body)" },
                { status: 400 }
            );
        }

        // GASから購読者一覧を取得
        const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL;
        if (!apiUrl) {
            return NextResponse.json(
                { success: false, error: "API URL not configured" },
                { status: 500 }
            );
        }

        const subscriptionsRes = await fetch(`${apiUrl}?path=push-subscriptions`);
        const subscriptionsData = await subscriptionsRes.json();

        if (!subscriptionsData.success || !subscriptionsData.data) {
            return NextResponse.json({
                success: true,
                message: "No subscriptions to notify",
                sent: 0,
            });
        }

        const subscriptions: Array<{
            studentId: string;
            endpoint: string;
            p256dh: string;
            auth: string;
        }> = subscriptionsData.data;

        const payload: NotificationPayload = {
            title,
            body: notificationBody,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-192x192.png",
            url: url || "/notifications",
        };

        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                const pushSubscription: PushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                };

                return webpush.sendNotification(
                    pushSubscription,
                    JSON.stringify(payload)
                );
            })
        );

        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;

        return NextResponse.json({
            success: true,
            message: `Notifications sent: ${succeeded} succeeded, ${failed} failed`,
            sent: succeeded,
            failed,
        });
    } catch (error) {
        console.error("Push notification error:", error);
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
