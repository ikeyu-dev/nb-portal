// Service Worker for NB-Portal PWA
// Handles push notifications and basic caching

const CACHE_NAME = "nb-portal-v1";

// Install event
self.addEventListener("install", function (event) {
    console.log("Service Worker installing.");
    self.skipWaiting();
});

// Activate event
self.addEventListener("activate", function (event) {
    console.log("Service Worker activating.");
    event.waitUntil(clients.claim());
});

// Push notification event
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

// Notification click event
self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const url = event.notification.data?.url || "/notifications";

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (clientList) {
                // Focus existing window if found
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && "focus" in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // Open new window if none found
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// Fetch event (basic pass-through, no caching)
self.addEventListener("fetch", function (event) {
    // Let the browser handle the request normally
    return;
});
