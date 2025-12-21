/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// プッシュ通知を受信したときの処理
self.addEventListener("push", function (event) {
    if (!event.data) {
        console.log("Push event but no data");
        return;
    }

    try {
        const data = event.data.json();
        const title = data.title || "NB-Portal";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const options: any = {
            body: data.body || "",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-192x192.png",
            tag: data.tag || "nb-portal-notification",
            data: {
                url: data.url || "/notifications",
            },
            vibrate: [100, 50, 100],
            requireInteraction: false,
        };

        event.waitUntil(self.registration.showNotification(title, options));
    } catch (error) {
        console.error("Error parsing push data:", error);
    }
});

// 通知をクリックしたときの処理
self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const url = event.notification.data?.url || "/notifications";

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (clientList) {
                // 既存のウィンドウがあればフォーカス
                for (const client of clientList) {
                    if (
                        client.url.includes(self.location.origin) &&
                        "focus" in client
                    ) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // なければ新しいウィンドウを開く
                if (self.clients.openWindow) {
                    return self.clients.openWindow(url);
                }
            })
    );
});

export {};
