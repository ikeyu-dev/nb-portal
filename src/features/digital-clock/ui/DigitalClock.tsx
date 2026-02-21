"use client";

import { useEffect, useReducer } from "react";

/**
 * デジタル時計コンポーネント
 * 24時間表記（hh:mm:ss）で現在時刻を表示する。
 * 秒部分は時・分より小さいフォントサイズで表示する。
 */
export default function DigitalClock() {
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

    return (
        <div className="flex items-center justify-center">
            <span
                suppressHydrationWarning
                className="text-4xl font-bold tabular-nums"
            >
                {hours}:{minutes}
            </span>
            <span
                suppressHydrationWarning
                className="text-2xl font-bold tabular-nums text-base-content/70"
            >
                :{seconds}
            </span>
        </div>
    );
}
