// Push通知のユーティリティ関数

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Base64 URLをUint8Arrayに変換
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// 通知の許可状態を取得
export function getNotificationPermission(): NotificationPermission | "unsupported" {
    if (!("Notification" in window)) {
        return "unsupported";
    }
    return Notification.permission;
}

// 通知の許可をリクエスト
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
    if (!("Notification" in window)) {
        return "unsupported";
    }
    const permission = await Notification.requestPermission();
    return permission;
}

// Service Workerの登録を取得
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!("serviceWorker" in navigator)) {
        return null;
    }
    try {
        const registration = await navigator.serviceWorker.ready;
        return registration;
    } catch {
        return null;
    }
}

// プッシュ通知を購読
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!VAPID_PUBLIC_KEY) {
        console.error("VAPID public key is not configured");
        return null;
    }

    const registration = await getServiceWorkerRegistration();
    if (!registration) {
        console.error("Service Worker is not registered");
        return null;
    }

    try {
        // 既存の購読を確認
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // 新しい購読を作成
            const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey as BufferSource,
            });
        }

        return subscription;
    } catch (error) {
        console.error("Failed to subscribe to push notifications:", error);
        return null;
    }
}

// プッシュ通知の購読を解除
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
        return false;
    }

    try {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
            return true;
        }
        return false;
    } catch (error) {
        console.error("Failed to unsubscribe from push notifications:", error);
        return false;
    }
}

// 現在の購読状態を取得
export async function getPushSubscription(): Promise<PushSubscription | null> {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
        return null;
    }

    try {
        return await registration.pushManager.getSubscription();
    } catch {
        return null;
    }
}

// 購読情報をサーバーに送信
export async function saveSubscriptionToServer(
    subscription: PushSubscription,
    studentId: string
): Promise<boolean> {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL;
        if (!apiUrl) return false;

        const response = await fetch(`${apiUrl}?path=push-subscribe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                studentId,
            }),
        });

        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error("Failed to save subscription to server:", error);
        return false;
    }
}

// 購読情報をサーバーから削除
export async function removeSubscriptionFromServer(
    endpoint: string,
    studentId: string
): Promise<boolean> {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL;
        if (!apiUrl) return false;

        const response = await fetch(`${apiUrl}?path=push-unsubscribe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                endpoint,
                studentId,
            }),
        });

        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error("Failed to remove subscription from server:", error);
        return false;
    }
}
