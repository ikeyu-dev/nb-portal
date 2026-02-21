"use client";

import { useEffect, useReducer } from "react";

/** 時間帯に応じたあいさつを返す */
const getGreeting = (hour: number): string => {
    if (hour < 5) return "おつかれさまです";
    if (hour < 11) return "おはようございます";
    if (hour < 17) return "こんにちは";
    return "おつかれさまです";
};

interface DigitalClockProps {
    memberName?: string | null;
}

/** JSTの時・分・秒を数値部分のみで取得するフォーマッタ */
const jstFormatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
});

/**
 * デジタル時計コンポーネント
 * 24時間表記（hh:mm:ss）で現在時刻を表示する。
 */
export default function DigitalClock({ memberName }: DigitalClockProps) {
    const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

    useEffect(() => {
        const timer = setInterval(() => {
            forceUpdate();
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const parts = jstFormatter.formatToParts(new Date());
    const hours = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minutes = parts.find((p) => p.type === "minute")?.value ?? "00";
    const seconds = parts.find((p) => p.type === "second")?.value ?? "00";
    const greeting = getGreeting(Number(hours));

    return (
        <div className="flex flex-col items-center gap-1">
            <p
                suppressHydrationWarning
                className="text-sm text-base-content/60"
            >
                {greeting}
                {memberName && `、${memberName}さん`}
            </p>
            <div className="flex items-baseline justify-center">
                <span
                    suppressHydrationWarning
                    className="text-5xl font-bold tabular-nums"
                >
                    {hours}:{minutes}
                </span>
                <span
                    suppressHydrationWarning
                    className="text-2xl font-bold tabular-nums text-base-content/60"
                >
                    :{seconds}
                </span>
            </div>
        </div>
    );
}
