"use client";

import { useEffect, useState, useCallback } from "react";

type SubscriptionState =
    | "loading"
    | "unsupported"
    | "denied"
    | "subscribed"
    | "unsubscribed";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/**
 * Base64 URL形式の文字列をUint8Arrayに変換
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
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
}

/**
 * Service Workerの登録を取得（リトライ機能付き）
 */
async function getServiceWorkerRegistration(
    maxRetries = 3,
    retryDelay = 1000
): Promise<ServiceWorkerRegistration | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // まず既存の登録を確認
            const existingRegistration =
                await navigator.serviceWorker.getRegistration("/");
            if (existingRegistration?.active) {
                return existingRegistration;
            }

            // readyを待機（タイムアウト付き）
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

            // リトライ前に待機
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

interface PushNotificationToggleProps {
    userEmail: string | null;
}

/**
 * プッシュ通知のオン/オフを切り替えるトグルコンポーネント
 */
export default function PushNotificationToggle({
    userEmail,
}: PushNotificationToggleProps) {
    const [state, setState] = useState<SubscriptionState>("loading");
    const [isProcessing, setIsProcessing] = useState(false);

    const checkSubscription = useCallback(async () => {
        // ブラウザサポートチェック
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            setState("unsupported");
            return;
        }

        // 通知許可状態チェック
        const permission = Notification.permission;
        if (permission === "denied") {
            setState("denied");
            return;
        }

        try {
            const registration = await getServiceWorkerRegistration();

            if (!registration) {
                // Service Workerが利用できない場合もunsubscribedとして扱う
                setState("unsubscribed");
                return;
            }

            const subscription =
                await registration.pushManager.getSubscription();
            setState(subscription ? "subscribed" : "unsubscribed");
        } catch (error) {
            console.error("Error checking subscription:", error);
            setState("unsubscribed");
        }
    }, []);

    useEffect(() => {
        checkSubscription();
    }, [checkSubscription]);

    const subscribe = async () => {
        if (!userEmail) {
            console.error("User not logged in");
            return;
        }

        setIsProcessing(true);
        try {
            // 通知許可をリクエスト
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                // ブラウザで完全にブロックされている場合のみdenied
                // キャンセルや後での場合はunsubscribedのまま（再度オンにできる）
                if (Notification.permission === "denied") {
                    setState("denied");
                }
                // それ以外（default）はunsubscribedのまま
                return;
            }

            // Service Workerの登録を取得（リトライ付き）
            const registration = await getServiceWorkerRegistration(5, 2000);

            if (!registration) {
                // Service Workerが取得できない場合、再登録を試みる
                try {
                    const newRegistration =
                        await navigator.serviceWorker.register("/sw.js");

                    // Service Workerがactiveになるまで待機
                    if (newRegistration.installing) {
                        await new Promise<void>((resolve) => {
                            newRegistration.installing!.addEventListener(
                                "statechange",
                                function handler() {
                                    if (this.state === "activated") {
                                        this.removeEventListener(
                                            "statechange",
                                            handler
                                        );
                                        resolve();
                                    }
                                }
                            );
                        });
                    } else if (newRegistration.waiting) {
                        await new Promise<void>((resolve) => {
                            newRegistration.waiting!.addEventListener(
                                "statechange",
                                function handler() {
                                    if (this.state === "activated") {
                                        this.removeEventListener(
                                            "statechange",
                                            handler
                                        );
                                        resolve();
                                    }
                                }
                            );
                        });
                    }

                    // 再度取得を試みる
                    const retryRegistration =
                        await getServiceWorkerRegistration(3, 1000);
                    if (!retryRegistration) {
                        throw new Error("Service Worker activation failed");
                    }
                } catch (regError) {
                    console.error(
                        "Service Worker re-registration failed:",
                        regError
                    );
                    const errorMessage =
                        regError instanceof Error
                            ? regError.message
                            : "Unknown error";
                    alert(
                        `Service Workerの登録に失敗しました: ${errorMessage}\nブラウザの設定でService Workerを有効にしてください。`
                    );
                    return;
                }
            }

            // 最終的な登録を取得
            const finalRegistration =
                registration || (await getServiceWorkerRegistration(1, 0));
            if (!finalRegistration) {
                throw new Error("Service Worker not available");
            }

            // 既存のサブスクリプションがあれば解除
            const existingSubscription =
                await finalRegistration.pushManager.getSubscription();
            if (existingSubscription) {
                await existingSubscription.unsubscribe();
            }

            // 新しいサブスクリプションを作成
            const subscription = await finalRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            // 学籍番号を抽出（メールアドレスの@より前の部分）
            const studentId = userEmail.split("@")[0];

            // サーバーに登録
            const response = await fetch("/api/push-subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    studentId,
                }),
            });

            if (response.ok) {
                setState("subscribed");
            } else {
                throw new Error("Failed to save subscription");
            }
        } catch (error) {
            console.error("Error subscribing:", error);
            alert(
                "プッシュ通知の登録に失敗しました。ページを再読み込みしてもう一度お試しください。"
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const unsubscribe = async () => {
        if (!userEmail) return;

        setIsProcessing(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription =
                await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();

                // サーバーから削除
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

            setState("unsubscribed");
        } catch (error) {
            console.error("Error unsubscribing:", error);
            alert("プッシュ通知の解除に失敗しました");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggle = () => {
        if (state === "subscribed") {
            unsubscribe();
        } else if (state === "unsubscribed") {
            subscribe();
        }
    };

    // サポートされていない場合は表示しない
    if (state === "unsupported") {
        return null;
    }

    return (
        <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
            <div className="flex items-center gap-3">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>
                <div>
                    <p className="font-medium text-sm">プッシュ通知</p>
                    <p className="text-xs text-base-content/60">
                        {state === "loading" && "読み込み中..."}
                        {state === "denied" &&
                            "ブラウザで通知がブロックされています"}
                        {state === "subscribed" && "新しいお知らせを通知します"}
                        {state === "unsubscribed" && "通知を受け取る"}
                    </p>
                </div>
            </div>
            <div>
                {state === "loading" ? (
                    <span className="loading loading-spinner loading-sm"></span>
                ) : state === "denied" ? (
                    <span className="badge badge-error badge-sm">
                        ブロック中
                    </span>
                ) : (
                    <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={state === "subscribed"}
                        onChange={handleToggle}
                        disabled={isProcessing}
                    />
                )}
            </div>
        </div>
    );
}
