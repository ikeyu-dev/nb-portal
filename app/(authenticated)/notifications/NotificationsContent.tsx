"use client";

import { useEffect, useState } from "react";

interface Notification {
    eventId: string;
    title: string;
    date: string;
    actionBy: string;
    actionByName: string;
    actionAt: string;
    actionType: "created" | "updated";
}

export function NotificationsContent() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_GAS_API_URL}?path=notifications&limit=50`
                );
                const data = await res.json();
                if (data.success) {
                    setNotifications(data.data || []);
                } else {
                    setError(data.error || "データの取得に失敗しました");
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "データの取得に失敗しました"
                );
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    // 相対時間を表示（例: 3分前、1時間前、2日前）
    const getRelativeTime = (dateStr: string): string => {
        const date = new Date(dateStr.replace(/\//g, "-"));
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return "たった今";
        if (diffMins < 60) return `${diffMins}分前`;
        if (diffHours < 24) return `${diffHours}時間前`;
        if (diffDays < 7) return `${diffDays}日前`;
        return dateStr.split(" ")[0];
    };

    if (isLoading) {
        return (
            <div className="p-4 lg:p-6 w-full h-full flex items-center justify-center">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-2xl mx-auto">
                {/* ヘッダー */}
                <div className="flex items-center gap-3 mb-6">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-primary"
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
                    <h1
                        className="font-bold"
                        style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
                    >
                        お知らせ
                    </h1>
                </div>

                {error && (
                    <div className="alert alert-error mb-4">
                        <span>{error}</span>
                    </div>
                )}

                {notifications.length === 0 ? (
                    <div className="text-center py-12 text-base-content/60">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 mx-auto mb-4 opacity-50"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                        </svg>
                        <p>お知らせはありません</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification, index) => (
                            <div
                                key={`${notification.eventId}-${notification.actionType}-${index}`}
                                className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md transition-shadow"
                            >
                                <div className="card-body p-4">
                                    <div className="flex items-start gap-3">
                                        {/* アイコン（作成/更新で色分け） */}
                                        <div
                                            className={`rounded-lg p-2 shrink-0 ${
                                                notification.actionType ===
                                                "created"
                                                    ? "bg-primary/10"
                                                    : "bg-warning/10"
                                            }`}
                                        >
                                            {notification.actionType ===
                                            "created" ? (
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
                                                        d="M12 4v16m8-8H4"
                                                    />
                                                </svg>
                                            ) : (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-5 w-5 text-warning"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                    />
                                                </svg>
                                            )}
                                        </div>

                                        {/* コンテンツ */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-base-content/70 mb-1">
                                                <span className="font-medium text-base-content">
                                                    {notification.actionByName}
                                                </span>
                                                さんがカレンダーの予定を
                                                {notification.actionType ===
                                                "created"
                                                    ? "追加"
                                                    : "更新"}
                                                しました
                                            </p>
                                            <p className="font-bold text-base truncate">
                                                {notification.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-base-content/60">
                                                <span>{notification.date}</span>
                                            </div>
                                        </div>

                                        {/* 時間 */}
                                        <div className="text-xs text-base-content/50 shrink-0">
                                            {getRelativeTime(
                                                notification.actionAt
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
