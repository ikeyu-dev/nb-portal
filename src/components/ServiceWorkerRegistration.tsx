"use client";

import { useEffect } from "react";

/**
 * Service Workerを登録し、グローバルイベントで登録完了を通知するコンポーネント
 */
export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) {
            console.warn("Service Worker is not supported in this browser");
            return;
        }

        const registerServiceWorker = async () => {
            try {
                // 既存の登録を確認
                const existingRegistration =
                    await navigator.serviceWorker.getRegistration("/");

                if (existingRegistration) {
                    // 既存の登録がある場合
                    if (existingRegistration.active) {
                        console.log(
                            "Service Worker already active:",
                            existingRegistration.scope
                        );
                        window.dispatchEvent(new Event("sw-ready"));
                    } else {
                        // activeでない場合は更新を待機
                        console.log("Service Worker exists but not active, updating...");
                        await existingRegistration.update();
                    }
                    return;
                }

                // 新規登録
                console.log("Registering new Service Worker...");
                const registration =
                    await navigator.serviceWorker.register("/sw.js");
                console.log("Service Worker registered:", registration.scope);

                // Service Workerがactiveになったら通知
                if (registration.active) {
                    window.dispatchEvent(new Event("sw-ready"));
                } else if (registration.installing || registration.waiting) {
                    const sw = registration.installing || registration.waiting;
                    sw?.addEventListener("statechange", function handler() {
                        if (this.state === "activated") {
                            console.log("Service Worker activated");
                            window.dispatchEvent(new Event("sw-ready"));
                            this.removeEventListener("statechange", handler);
                        }
                    });
                }
            } catch (error) {
                console.error("Service Worker registration failed:", error);
            }
        };

        registerServiceWorker();
    }, []);

    return null;
}
