"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBell,
    faInbox,
    faPen,
    faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { PushNotificationToggle } from "@/src/features/push-notification";
import { HelpButton } from "@/src/features/help";
import {
    getClientCacheEntry,
    getStaleClientCacheEntry,
    setClientCache,
} from "@/src/shared/lib/client-cache";
import {
    CACHE_TTL_MS,
    CLIENT_CACHE_KEYS,
} from "@/src/shared/lib/cache-policy";
import type { ApiResponse } from "@/src/shared/types/api";

interface Notification {
    eventId: string;
    title: string;
    date: string;
    actionBy: string;
    actionByName: string;
    actionAt: string;
    actionType: "created" | "updated";
}

interface NotificationsContentProps {
    userEmail: string | null;
}

export function NotificationsContent({ userEmail }: NotificationsContentProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            const cached = getClientCacheEntry<Notification[]>(
                CLIENT_CACHE_KEYS.notifications,
                CACHE_TTL_MS.pageData
            );
            if (cached) {
                setNotifications(cached.data);
                setIsLoading(false);
            }

            try {
                const res = await fetch("/api/gas?path=notifications&limit=50", {
                    cache: "no-store",
                });
                const data = (await res.json()) as ApiResponse<Notification[]>;
                if (data.success) {
                    const nextNotifications = data.data || [];
                    setNotifications(nextNotifications);
                    setClientCache(
                        CLIENT_CACHE_KEYS.notifications,
                        nextNotifications
                    );
                } else {
                    setError(data.error || "データの取得に失敗しました");
                }
            } catch (err) {
                const stale = getStaleClientCacheEntry<Notification[]>(
                    CLIENT_CACHE_KEYS.notifications,
                    { maxAgeMs: CACHE_TTL_MS.stalePageData }
                );
                if (stale) {
                    setNotifications(stale.data);
                } else {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "データの取得に失敗しました"
                    );
                }
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
            <div className="p-4 lg:p-6 w-full">
                <div className="max-w-4xl mx-auto">
                    {/* ヘッダー Skeleton */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-6 w-6 bg-base-300 rounded animate-pulse"></div>
                        <div className="h-8 w-32 bg-base-300 rounded-lg animate-pulse"></div>
                    </div>

                    {/* プッシュ通知設定 Skeleton */}
                    <div className="card bg-base-100 shadow-xl border border-base-300 mb-6">
                        <div className="card-body p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-24 bg-base-300 rounded animate-pulse"></div>
                                        <div className="h-3 w-32 bg-base-300 rounded animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="h-6 w-12 bg-base-300 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* 通知一覧 Skeleton */}
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div
                                key={i}
                                className="card bg-base-100 shadow-xl border border-base-300"
                            >
                                <div className="card-body p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="h-9 w-9 bg-base-300 rounded-lg animate-pulse"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-3/4 bg-base-300 rounded animate-pulse"></div>
                                            <div className="h-5 w-1/2 bg-base-300 rounded animate-pulse"></div>
                                            <div className="h-3 w-24 bg-base-300 rounded animate-pulse"></div>
                                        </div>
                                        <div className="h-3 w-12 bg-base-300 rounded animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-4xl mx-auto">
                {/* ヘッダー */}
                <div className="flex items-center gap-3 mb-6">
                    <FontAwesomeIcon
                        icon={faBell}
                        className="text-2xl text-primary"
                    />
                    <h1
                        className="font-bold"
                        style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
                    >
                        お知らせ
                    </h1>
                    <HelpButton sectionId="notification" />
                </div>

                {/* プッシュ通知設定 */}
                <div className="mb-6">
                    <PushNotificationToggle userEmail={userEmail} />
                </div>

                {error && (
                    <div className="alert alert-error mb-4">
                        <span>{error}</span>
                    </div>
                )}

                {notifications.length === 0 ? (
                    <div className="text-center py-12 text-base-content/60">
                        <FontAwesomeIcon
                            icon={faInbox}
                            className="h-16 w-16 mx-auto mb-4 opacity-50"
                        />
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
                                                <FontAwesomeIcon
                                                    icon={faPlus}
                                                    className="text-lg text-primary"
                                                />
                                            ) : (
                                                <FontAwesomeIcon
                                                    icon={faPen}
                                                    className="text-lg text-warning"
                                                />
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
