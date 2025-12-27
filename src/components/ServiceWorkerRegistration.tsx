"use client";

import { useEffect } from "react";

/**
 * Service Workerを登録し、グローバルイベントで登録完了を通知するコンポーネント
 */
export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        const registerServiceWorker = async () => {
            try {
                // 既存の登録を確認
                const existingRegistration =
                    await navigator.serviceWorker.getRegistration("/");

                if (existingRegistration) {
                    // 既存の登録がある場合は更新をチェック
                    await existingRegistration.update();
                    console.log(
                        "Service Worker updated:",
                        existingRegistration.scope
                    );
                    window.dispatchEvent(new Event("sw-ready"));
                    return;
                }

                // 新規登録
                const registration =
                    await navigator.serviceWorker.register("/sw.js");
                console.log("Service Worker registered:", registration.scope);

                // 登録完了を通知
                window.dispatchEvent(new Event("sw-ready"));
            } catch (error) {
                console.error("Service Worker registration failed:", error);
            }
        };

        registerServiceWorker();
    }, []);

    return null;
}
