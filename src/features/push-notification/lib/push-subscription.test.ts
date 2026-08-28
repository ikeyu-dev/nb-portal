import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    getPushSubscriptionState,
    getServiceWorkerRegistration,
    isPushNotificationSupported,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    urlBase64ToUint8Array,
} from "./push-subscription";

const setBrowserApi = (name: string, value: unknown) => {
    Object.defineProperty(window, name, {
        configurable: true,
        writable: true,
        value,
    });
};

const setNavigatorApi = (name: string, value: unknown) => {
    Object.defineProperty(navigator, name, {
        configurable: true,
        writable: true,
        value,
    });
};

describe("Push購読", () => {
    const getSubscription = vi.fn();
    const subscribe = vi.fn();
    const registration = {
        active: { state: "activated" },
        installing: null,
        waiting: null,
        pushManager: { getSubscription, subscribe },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        setBrowserApi("PushManager", class PushManager {});
        setBrowserApi("Notification", {
            permission: "default",
            requestPermission: vi.fn().mockResolvedValue("granted"),
        });
        setNavigatorApi("serviceWorker", {
            getRegistration: vi.fn().mockResolvedValue(registration),
            ready: Promise.resolve(registration),
            register: vi.fn().mockResolvedValue(registration),
        });
        vi.stubGlobal("fetch", vi.fn());
        getSubscription.mockResolvedValue(null);
    });

    it("必要な3つのブラウザAPIがあれば対応済みと判定する", () => {
        expect(isPushNotificationSupported()).toBe(true);

        Reflect.deleteProperty(window, "PushManager");
        expect(isPushNotificationSupported()).toBe(false);
    });

    it("URL-safe Base64をArrayBufferへ変換する", () => {
        expect(Array.from(new Uint8Array(urlBase64ToUint8Array("AQID-_8")))).toEqual(
            [1, 2, 3, 251, 255]
        );
    });

    it("activeなService Worker登録を優先して返す", async () => {
        const result = await getServiceWorkerRegistration();

        expect(result).toBe(registration);
        expect(navigator.serviceWorker.getRegistration).toHaveBeenCalledWith("/");
    });

    it("通知拒否時はService Workerを確認せずdeniedを返す", async () => {
        setBrowserApi("Notification", {
            permission: "denied",
            requestPermission: vi.fn(),
        });

        await expect(getPushSubscriptionState()).resolves.toBe("denied");
        expect(navigator.serviceWorker.getRegistration).not.toHaveBeenCalled();
    });

    it("既存購読の有無を現在の購読状態へ反映する", async () => {
        getSubscription.mockResolvedValueOnce({ endpoint: "https://push/sub" });
        await expect(getPushSubscriptionState()).resolves.toBe("subscribed");

        getSubscription.mockResolvedValueOnce(null);
        await expect(getPushSubscriptionState()).resolves.toBe("unsubscribed");
    });

    it("既存購読を解除して新しい購読をAPIへ保存する", async () => {
        const unsubscribe = vi.fn().mockResolvedValue(true);
        const existing = { unsubscribe };
        const created = {
            toJSON: () => ({
                endpoint: "https://push.example.test/new",
                keys: { p256dh: "key", auth: "auth" },
            }),
        };
        getSubscription.mockResolvedValue(existing);
        subscribe.mockResolvedValue(created);
        vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

        const result = await subscribeToPushNotifications(
            "A12345678@example.com"
        );

        expect(result).toEqual({ subscribed: true, denied: false });
        expect(unsubscribe).toHaveBeenCalled();
        expect(subscribe).toHaveBeenCalledWith({
            userVisibleOnly: true,
            applicationServerKey: expect.any(ArrayBuffer),
        });
        expect(fetch).toHaveBeenCalledWith("/api/push-subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subscription: created.toJSON(),
                studentId: "A12345678",
            }),
        });
    });

    it("通知権限が許可されなければ購読しない", async () => {
        setBrowserApi("Notification", {
            permission: "denied",
            requestPermission: vi.fn().mockResolvedValue("denied"),
        });

        await expect(subscribeToPushNotifications("a@example.com")).resolves.toEqual(
            { subscribed: false, denied: true }
        );
        expect(subscribe).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it("現在の購読を解除してendpointをAPIへ送る", async () => {
        const current = {
            endpoint: "https://push.example.test/current",
            unsubscribe: vi.fn().mockResolvedValue(true),
        };
        getSubscription.mockResolvedValue(current);
        vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

        await unsubscribeFromPushNotifications();

        expect(current.unsubscribe).toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledWith("/api/push-subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: current.endpoint }),
        });
    });
});
