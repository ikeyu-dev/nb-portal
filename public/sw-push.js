// プッシュ通知用のService Worker拡張
// next-pwaが生成するsw.jsにインポートされる

self.addEventListener("push", function (event) {
    if (!event.data) {
        console.log("Push event but no data");
        return;
    }

    try {
        const data = event.data.json();
        const title = data.title || "NB-Portal";
        const options = {
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

self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const url = event.notification.data?.url || "/notifications";

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (clientList) {
                // 既存のウィンドウがあればフォーカス
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && "focus" in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // なければ新しいウィンドウを開く
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});
