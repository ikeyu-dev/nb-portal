"use client";

import { useEffect, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-regular-svg-icons";
import {
    getPushSubscriptionState,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    type SubscriptionState,
} from "@/src/features/push-notification/lib/push-subscription";

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
        const nextState = await getPushSubscriptionState();
        setState(nextState);
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
            const result = await subscribeToPushNotifications(userEmail);
            if (result.subscribed) {
                setState("subscribed");
            } else if (result.denied) {
                setState("denied");
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
            await unsubscribeFromPushNotifications();
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
                <FontAwesomeIcon icon={faBell} className="h-5 w-5 text-primary" />
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
