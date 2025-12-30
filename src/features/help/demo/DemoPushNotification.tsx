"use client";

import { useState } from "react";

/**
 * プッシュ通知設定のデモコンポーネント
 */
export function DemoPushNotification() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleToggle = async () => {
        setIsLoading(true);
        setMessage(null);

        // 切り替えのシミュレーション
        await new Promise((resolve) => setTimeout(resolve, 500));

        setIsEnabled(!isEnabled);
        setMessage(
            !isEnabled
                ? "プッシュ通知を有効にしました（デモ）"
                : "プッシュ通知を無効にしました（デモ）"
        );
        setIsLoading(false);

        // メッセージを3秒後に消す
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="space-y-4">
            {/* プッシュ通知設定カード */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-4">
                    <div className="flex items-center justify-between">
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
                                <div className="font-medium text-sm">
                                    プッシュ通知
                                </div>
                                <div className="text-xs text-base-content/60">
                                    新しい予定が追加されたときに通知を受け取る
                                </div>
                            </div>
                        </div>
                        <label className="swap">
                            <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={handleToggle}
                                disabled={isLoading}
                            />
                            <div
                                className={`toggle ${isEnabled ? "toggle-primary" : ""} ${isLoading ? "opacity-50" : ""}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={handleToggle}
                                    disabled={isLoading}
                                    className="toggle toggle-primary"
                                />
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* 状態表示 */}
            {message && (
                <div className="alert alert-info text-sm py-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span>{message}</span>
                </div>
            )}

            {/* 説明 */}
            <div className="bg-base-200/50 rounded-lg p-3 text-sm space-y-2">
                <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">1.</span>
                    <span>
                        プッシュ通知を有効にすると、カレンダーに新しい予定が追加されたときにスマートフォンやPCに通知が届きます。
                    </span>
                </div>
                <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">2.</span>
                    <span>
                        ブラウザの通知許可が必要です。初回有効化時に許可を求めるダイアログが表示されます。
                    </span>
                </div>
                <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">3.</span>
                    <span>
                        通知を受け取りたくない場合は、いつでもオフに切り替えることができます。
                    </span>
                </div>
            </div>

            <p className="text-xs text-base-content/50 text-center">
                これはデモ表示です。実際の通知設定は行われません。
            </p>
        </div>
    );
}
