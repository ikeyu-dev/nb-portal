"use client";

import { useState, useEffect } from "react";
import {
    getNotificationPermission,
    requestNotificationPermission,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    getPushSubscription,
    saveSubscriptionToServer,
    removeSubscriptionFromServer,
} from "@/src/shared/lib/push-notifications";

interface NotificationSettingsProps {
    studentId: string;
}

export function NotificationSettings({ studentId }: NotificationSettingsProps) {
    const [permission, setPermission] = useState<NotificationPermission | "unsupported" | "loading">("loading");
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const checkPermission = async () => {
            const perm = getNotificationPermission();
            setPermission(perm);

            if (perm === "granted") {
                const subscription = await getPushSubscription();
                setIsSubscribed(!!subscription);
            }
        };
        checkPermission();
    }, []);

    const handleEnableNotifications = async () => {
        setIsLoading(true);
        try {
            // 通知許可をリクエスト
            const perm = await requestNotificationPermission();
            setPermission(perm);

            if (perm === "granted") {
                // プッシュ通知を購読
                const subscription = await subscribeToPushNotifications();
                if (subscription) {
                    // サーバーに購読情報を保存
                    const saved = await saveSubscriptionToServer(subscription, studentId);
                    if (saved) {
                        setIsSubscribed(true);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to enable notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisableNotifications = async () => {
        setIsLoading(true);
        try {
            const subscription = await getPushSubscription();
            if (subscription) {
                // サーバーから購読情報を削除
                await removeSubscriptionFromServer(subscription.endpoint, studentId);
                // ローカルの購読を解除
                await unsubscribeFromPushNotifications();
            }
            setIsSubscribed(false);
        } catch (error) {
            console.error("Failed to disable notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (permission === "loading") {
        return (
            <div className="p-4 rounded-xl bg-base-200 animate-pulse">
                <div className="h-6 bg-base-300 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-base-300 rounded w-3/4"></div>
            </div>
        );
    }

    if (permission === "unsupported") {
        return (
            <div className="p-4 rounded-xl bg-base-200">
                <div className="flex items-center gap-3">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-warning"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <div>
                        <div className="font-semibold">通知非対応</div>
                        <div className="text-sm text-base-content/70">
                            このブラウザはプッシュ通知に対応していません
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (permission === "denied") {
        return (
            <div className="p-4 rounded-xl bg-base-200">
                <div className="flex items-center gap-3">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-error"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                    </svg>
                    <div>
                        <div className="font-semibold">通知がブロックされています</div>
                        <div className="text-sm text-base-content/70">
                            ブラウザの設定から通知を許可してください
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 rounded-xl bg-base-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-6 w-6 ${isSubscribed ? "text-success" : "text-base-content/50"}`}
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
                        <div className="font-semibold">プッシュ通知</div>
                        <div className="text-sm text-base-content/70">
                            {isSubscribed
                                ? "お知らせが届くと通知されます"
                                : "新しいお知らせを通知で受け取る"}
                        </div>
                    </div>
                </div>
                <button
                    onClick={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
                    disabled={isLoading}
                    className={`btn btn-sm ${isSubscribed ? "btn-ghost" : "btn-primary"}`}
                >
                    {isLoading ? (
                        <span className="loading loading-spinner loading-sm"></span>
                    ) : isSubscribed ? (
                        "オフ"
                    ) : (
                        "オン"
                    )}
                </button>
            </div>
        </div>
    );
}

export default NotificationSettings;
