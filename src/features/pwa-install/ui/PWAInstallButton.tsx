"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallButton() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(true); // 初期値をtrueにして判定後に表示
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // iOSかどうかを判定
        const isIOSDevice =
            /iPad|iPhone|iPod/.test(navigator.userAgent) &&
            !(window as Window & { MSStream?: unknown }).MSStream;
        setIsIOS(isIOSDevice);

        // PWAとして既にインストールされているかチェック
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (navigator as Navigator & { standalone?: boolean }).standalone ===
                true;
        setIsInstalled(isStandalone);
        setIsReady(true);

        // beforeinstallpromptイベントをリッスン（Android/Desktop Chrome等）
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener(
            "beforeinstallprompt",
            handleBeforeInstallPrompt
        );

        // インストール完了イベントをリッスン
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener(
                "beforeinstallprompt",
                handleBeforeInstallPrompt
            );
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === "accepted") {
                setDeferredPrompt(null);
            }
        } else {
            // Chromeでbeforeinstallpromptがまだ発火していない場合
            setShowIOSInstructions(true);
        }
    };

    // まだ判定中の場合は表示しない
    if (!isReady) {
        return null;
    }

    // 既にインストール済みの場合は表示しない
    if (isInstalled) {
        return null;
    }

    return (
        <>
            <button
                onClick={handleInstallClick}
                className="btn btn-ghost btn-sm w-full justify-start gap-2"
            >
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                </svg>
                アプリをインストール
            </button>

            {/* インストール手順モーダル */}
            {showIOSInstructions && (
                <dialog className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">
                            アプリをインストール
                        </h3>
                        {isIOS ? (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="badge badge-primary badge-lg">
                                        1
                                    </div>
                                    <p>
                                        画面下部の
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 inline mx-1"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                            />
                                        </svg>
                                        （共有）ボタンをタップ
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="badge badge-primary badge-lg">
                                        2
                                    </div>
                                    <p>「ホーム画面に追加」をタップ</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="badge badge-primary badge-lg">
                                        3
                                    </div>
                                    <p>右上の「追加」をタップ</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="badge badge-primary badge-lg">
                                        1
                                    </div>
                                    <p>
                                        ブラウザの右上の
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 inline mx-1"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                            />
                                        </svg>
                                        メニューをタップ
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="badge badge-primary badge-lg">
                                        2
                                    </div>
                                    <p>「ホーム画面に追加」または「アプリをインストール」をタップ</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="badge badge-primary badge-lg">
                                        3
                                    </div>
                                    <p>「インストール」をタップ</p>
                                </div>
                            </div>
                        )}
                        <div className="modal-action">
                            <button
                                className="btn"
                                onClick={() => setShowIOSInstructions(false)}
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setShowIOSInstructions(false)}>
                            close
                        </button>
                    </form>
                </dialog>
            )}
        </>
    );
}

export default PWAInstallButton;
