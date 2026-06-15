type PushNotificationPayload = {
    title: string;
    body?: string;
    url?: string;
    tag?: string;
};

type PushSendResult = {
    success?: boolean;
    sent?: number;
    failed?: number;
    total?: number;
    message?: string;
    error?: string;
};

export const sendPushNotification = async (
    origin: string,
    payload: PushNotificationPayload
): Promise<PushSendResult | null> => {
    const secret = process.env.PUSH_API_SECRET;
    if (!secret) {
        console.error("Push notification skipped: PUSH_API_SECRET is not configured");
        return null;
    }

    try {
        const response = await fetch(new URL("/api/push-send", origin), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${secret}`,
            },
            body: JSON.stringify(payload),
        });

        const result = (await response.json()) as PushSendResult;
        if (!response.ok || result.error) {
            console.error("Push notification failed:", result);
        }
        return result;
    } catch (error) {
        console.error("Push notification request failed:", error);
        return null;
    }
};
