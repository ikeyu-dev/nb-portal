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
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const checkPermission = async () => {
            console.log("[NotificationSettings] Checking permission...");
            const perm = getNotificationPermission();
            console.log("[NotificationSettings] Permission:", perm);
            setPermission(perm);

            if (perm === "granted") {
                const subscription = await getPushSubscription();
                console.log("[NotificationSettings] Subscription:", !!subscription);
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

    // ローディング中は何も表示しない
    if (permission === "loading") {
        return null;
    }

    // 購読済みまたは閉じた場合は何も表示しない
    if (isSubscribed || isDismissed) {
        return null;
    }

    // 非対応ブラウザの場合
    if (permission === "unsupported") {
        return (
            <div role="alert" className="alert alert-warning mb-6">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 shrink-0"
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
                    <h3 className="font-bold">通知非対応</h3>
                    <div className="text-xs">このブラウザはプッシュ通知に対応していません。PWAとしてインストールしてください。</div>
                </div>
                <button
                    onClick={() => setIsDismissed(true)}
                    className="btn btn-sm btn-ghost"
                >
                    閉じる
                </button>
            </div>
        );
    }

    // 通知がブロックされている場合
    if (permission === "denied") {
        return (
            <div role="alert" className="alert alert-error mb-6">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 shrink-0"
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
                    <h3 className="font-bold">通知がブロックされています</h3>
                    <div className="text-xs">ブラウザの設定から通知を許可してください</div>
                </div>
                <button
                    onClick={() => setIsDismissed(true)}
                    className="btn btn-sm btn-ghost"
                >
                    閉じる
                </button>
            </div>
        );
    }

    // 未購読の場合のみアラートを表示
    return (
        <div role="alert" className="alert alert-info mb-6">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 shrink-0"
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
                <h3 className="font-bold">プッシュ通知</h3>
                <div className="text-xs">新しいお知らせを通知で受け取れます</div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => setIsDismissed(true)}
                    className="btn btn-sm btn-ghost"
                >
                    後で
                </button>
                <button
                    onClick={handleEnableNotifications}
                    disabled={isLoading}
                    className="btn btn-sm btn-primary"
                >
                    {isLoading ? (
                        <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                        "通知を受け取る"
                    )}
                </button>
            </div>
        </div>
    );
}

export default NotificationSettings;
