"use client";

export type SubscriptionState =
    | "loading"
    | "unsupported"
    | "denied"
    | "subscribed"
    | "unsubscribed";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export const isPushNotificationSupported = () =>
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

export const urlBase64ToUint8Array = (base64String: string): ArrayBuffer => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
};

export async function getServiceWorkerRegistration(
    maxRetries = 3,
    retryDelay = 1000
): Promise<ServiceWorkerRegistration | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const existingRegistration =
                await navigator.serviceWorker.getRegistration("/");
            if (existingRegistration?.active) {
                return existingRegistration;
            }

            const timeoutPromise = new Promise<null>((resolve) => {
                setTimeout(() => resolve(null), 5000);
            });

            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                timeoutPromise,
            ]);

            if (registration) {
                return registration;
            }

            if (attempt < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
        } catch (error) {
            console.error(
                `Service Worker registration attempt ${attempt + 1} failed:`,
                error
            );
            if (attempt < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
        }
    }
    return null;
}

export async function getPushSubscriptionState(): Promise<SubscriptionState> {
    if (!isPushNotificationSupported()) {
        return "unsupported";
    }

    if (Notification.permission === "denied") {
        return "denied";
    }

    try {
        const registration = await getServiceWorkerRegistration();

        if (!registration) {
            return "unsubscribed";
        }

        const subscription = await registration.pushManager.getSubscription();
        return subscription ? "subscribed" : "unsubscribed";
    } catch (error) {
        console.error("Error checking subscription:", error);
        return "unsubscribed";
    }
}

const waitForServiceWorkerActivation = async (
    worker: ServiceWorker | null
) => {
    if (!worker) return;
    if (worker.state === "activated") return;

    await new Promise<void>((resolve) => {
        worker.addEventListener("statechange", function handler() {
            if (this.state === "activated") {
                this.removeEventListener("statechange", handler);
                resolve();
            }
        });
    });
};

export async function subscribeToPushNotifications(userEmail: string) {
    if (!isPushNotificationSupported()) {
        throw new Error("このブラウザはプッシュ通知に対応していません");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        return {
            subscribed: false,
            denied: Notification.permission === "denied",
        };
    }

    let registration = await getServiceWorkerRegistration(5, 2000);

    if (!registration) {
        const newRegistration = await navigator.serviceWorker.register(
            "/sw.js"
        );
        await waitForServiceWorkerActivation(
            newRegistration.installing || newRegistration.waiting
        );
        registration = await getServiceWorkerRegistration(3, 1000);
    }

    if (!registration) {
        throw new Error("Service Workerを利用できません");
    }

    const existingSubscription =
        await registration.pushManager.getSubscription();
    if (existingSubscription) {
        await existingSubscription.unsubscribe();
    }

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const response = await fetch("/api/push-subscribe", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            subscription: subscription.toJSON(),
            studentId: userEmail.split("@")[0],
        }),
    });

    if (!response.ok) {
        throw new Error("通知設定の保存に失敗しました");
    }

    return { subscribed: true, denied: false };
}

export async function unsubscribeFromPushNotifications() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) return;

    await subscription.unsubscribe();

    await fetch("/api/push-subscribe", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            endpoint: subscription.endpoint,
        }),
    });
}
