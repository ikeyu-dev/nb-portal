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

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const greeting = getGreeting(now.getHours());

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
