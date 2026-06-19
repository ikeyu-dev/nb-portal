"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-regular-svg-icons";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import {
    getPushSubscriptionState,
    isPushNotificationSupported,
    subscribeToPushNotifications,
} from "@/src/features/push-notification/lib/push-subscription";
import { AppModal } from "@/src/shared/ui/AppModal";

interface PWANotificationPromptProps {
    userEmail: string | null;
}

const DISMISS_KEY = "nb-pwa-notification-prompt-dismissed-at";
const DISMISS_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const isStandaloneDisplay = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isRecentlyDismissed = () => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0");
    if (!dismissedAt) return false;
    return Date.now() - dismissedAt < DISMISS_INTERVAL_MS;
};

export function PWANotificationPrompt({
    userEmail,
}: PWANotificationPromptProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const checkPrompt = async () => {
            if (!userEmail || !isStandaloneDisplay() || isRecentlyDismissed()) {
                return;
            }

            if (
                !isPushNotificationSupported() ||
                Notification.permission !== "default"
            ) {
                return;
            }

            const state = await getPushSubscriptionState();
            if (isMounted && state === "unsubscribed") {
                setIsVisible(true);
            }
        };

        void checkPrompt();

        return () => {
            isMounted = false;
        };
    }, [userEmail]);

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setIsVisible(false);
    };

    const enableNotifications = async () => {
        if (!userEmail) return;

        setIsSubmitting(true);
        setMessage(null);

        try {
            const result = await subscribeToPushNotifications(userEmail);
            if (result.subscribed) {
                setIsVisible(false);
                return;
            }

            setMessage(
                result.denied
                    ? "ブラウザで通知がブロックされています。設定から許可してください。"
                    : "通知は有効になりませんでした。必要になったらお知らせページから設定できます。"
            );
        } catch (error) {
            console.error("Error enabling notifications:", error);
            setMessage("通知の設定に失敗しました。時間をおいて再度お試しください。");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isVisible) return null;

    return (
        <AppModal
            onClose={dismiss}
            ariaLabel="通知を有効にしますか"
            boxClassName="max-w-sm max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl p-6 sm:max-h-[calc(100dvh-10rem)]"
        >
                <div className="mb-4 flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <FontAwesomeIcon icon={faBell} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold">通知を有効にしますか</h2>
                        <p className="mt-2 text-sm leading-relaxed text-base-content/70">
                            予定の追加や変更を、この端末で受け取れるようにします。
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-circle"
                        onClick={dismiss}
                        aria-label="閉じる"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {message && (
                    <div className="alert alert-warning mb-4 py-2 text-sm">
                        <span>{message}</span>
                    </div>
                )}

                <div className="modal-action">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={dismiss}
                        disabled={isSubmitting}
                    >
                        あとで
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={enableNotifications}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <span className="loading loading-spinner loading-sm" />
                        ) : (
                            "有効にする"
                        )}
                    </button>
                </div>
        </AppModal>
    );
}
