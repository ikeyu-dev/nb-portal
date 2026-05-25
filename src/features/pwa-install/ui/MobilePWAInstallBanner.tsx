"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faDownload,
    faMobileScreenButton,
    faShareNodes,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "other";

const DISMISS_KEY = "nb-pwa-install-banner-dismissed-at";
const DISMISS_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

const isStandaloneDisplay = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isMobileViewport = () =>
    window.matchMedia("(max-width: 768px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

const getPlatform = (): Platform => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS =
        /iphone|ipad|ipod/.test(userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOS) return "ios";
    if (/android/.test(userAgent)) return "android";
    return "other";
};

const isRecentlyDismissed = () => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0");
    if (!dismissedAt) return false;
    return Date.now() - dismissedAt < DISMISS_INTERVAL_MS;
};

export function MobilePWAInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [platform, setPlatform] = useState<Platform>("other");
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const shouldShow =
            isMobileViewport() &&
            !isStandaloneDisplay() &&
            !isRecentlyDismissed();

        const timerId = window.setTimeout(() => {
            setPlatform(getPlatform());
            setIsVisible(shouldShow);
        }, 0);

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
            if (shouldShow) {
                setIsVisible(true);
            }
        };

        const handleAppInstalled = () => {
            setIsVisible(false);
            setDeferredPrompt(null);
        };

        window.addEventListener(
            "beforeinstallprompt",
            handleBeforeInstallPrompt
        );
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.clearTimeout(timerId);
            window.removeEventListener(
                "beforeinstallprompt",
                handleBeforeInstallPrompt
            );
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setIsVisible(false);
    };

    const install = async () => {
        if (!deferredPrompt) return;

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    if (!isVisible) return null;

    const canPrompt = !!deferredPrompt;
    const isIOS = platform === "ios";
    const installInstruction =
        platform === "android"
            ? "右上のメニュー（︙）→ アプリをインストール"
            : "ブラウザの共有・メニュー → ホーム画面に追加";

    return (
        <div className="mb-5 rounded-2xl border border-primary/20 bg-base-100 p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FontAwesomeIcon icon={faMobileScreenButton} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold">
                                ホーム画面に追加できます
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-base-content/70">
                                アプリのように開けます。通知を使う場合もホーム画面からの起動が必要です。
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

                    {canPrompt ? (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm mt-3 gap-2"
                            onClick={install}
                        >
                            <FontAwesomeIcon icon={faDownload} />
                            インストール
                        </button>
                    ) : (
                        <div className="mt-3 rounded-xl bg-base-200 px-3 py-2 text-sm text-base-content/75">
                            <div className="flex items-center gap-2 font-medium">
                                <FontAwesomeIcon icon={faShareNodes} />
                                {isIOS
                                    ? "共有ボタン → ホーム画面に追加"
                                    : installInstruction}
                            </div>
                            {isIOS && (
                                <p className="mt-1 text-xs text-base-content/60">
                                    表示されない場合はSafariで開いてください。
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
