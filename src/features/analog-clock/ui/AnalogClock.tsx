"use client";

import { useEffect, useState } from "react";

export default function AnalogClock() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());

        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    if (!time) {
        return (
            <div className="relative w-48 h-48 lg:w-56 lg:h-56 mx-auto flex items-center justify-center">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    const hours = time.getHours() % 12;
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    const hourDegrees = hours * 30 + minutes * 0.5;
    const minuteDegrees = minutes * 6;
    const secondDegrees = seconds * 6;

    // 時刻の数字配列
    const hourNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    return (
        <div className="relative w-48 h-48 lg:w-56 lg:h-56 mx-auto">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
                {/* 外側の装飾リング */}
                <circle
                    cx="100"
                    cy="100"
                    r="98"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-primary/30"
                />

                {/* 時計の背景（グラデーション） */}
                <defs>
                    <radialGradient id="clockFace" cx="50%" cy="30%" r="70%">
                        <stop offset="0%" className="[stop-color:oklch(var(--b1))]" />
                        <stop offset="100%" className="[stop-color:oklch(var(--b2))]" />
                    </radialGradient>
                    <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                        <feOffset in="blur" dx="0" dy="2" result="offsetBlur" />
                        <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
                    </filter>
                </defs>

                {/* メインの文字盤 */}
                <circle
                    cx="100"
                    cy="100"
                    r="92"
                    fill="url(#clockFace)"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-base-content/10"
                />

                {/* 分マーカー（60個） */}
                {[...Array(60)].map((_, i) => {
                    if (i % 5 === 0) return null;
                    const angle = (i * 6 - 90) * (Math.PI / 180);
                    const x1 = 100 + 85 * Math.cos(angle);
                    const y1 = 100 + 85 * Math.sin(angle);
                    const x2 = 100 + 82 * Math.cos(angle);
                    const y2 = 100 + 82 * Math.sin(angle);

                    return (
                        <line
                            key={`min-${i}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="currentColor"
                            strokeWidth="1"
                            className="text-base-content/30"
                        />
                    );
                })}

                {/* 時間マーカーと数字 */}
                {hourNumbers.map((num, i) => {
                    const angle = (i * 30 - 90) * (Math.PI / 180);
                    const x1 = 100 + 85 * Math.cos(angle);
                    const y1 = 100 + 85 * Math.sin(angle);
                    const x2 = 100 + 75 * Math.cos(angle);
                    const y2 = 100 + 75 * Math.sin(angle);
                    const textX = 100 + 65 * Math.cos(angle);
                    const textY = 100 + 65 * Math.sin(angle);

                    return (
                        <g key={`hour-${i}`}>
                            <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                className="text-base-content"
                            />
                            <text
                                x={textX}
                                y={textY}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize="12"
                                fontWeight="600"
                                fill="currentColor"
                                className="text-base-content/80"
                            >
                                {num}
                            </text>
                        </g>
                    );
                })}

                {/* 時針（太め、丸みを帯びた） */}
                <g transform={`rotate(${hourDegrees} 100 100)`}>
                    <line
                        x1="100"
                        y1="100"
                        x2="100"
                        y2="55"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                        className="text-base-content"
                    />
                </g>

                {/* 分針 */}
                <g transform={`rotate(${minuteDegrees} 100 100)`}>
                    <line
                        x1="100"
                        y1="100"
                        x2="100"
                        y2="35"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="text-base-content"
                    />
                </g>

                {/* 秒針 */}
                <g transform={`rotate(${secondDegrees} 100 100)`}>
                    <line
                        x1="100"
                        y1="115"
                        x2="100"
                        y2="28"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="text-primary"
                    />
                    {/* 秒針の反対側の重り */}
                    <circle cx="100" cy="112" r="3" fill="currentColor" className="text-primary" />
                </g>

                {/* 中心のドット */}
                <circle
                    cx="100"
                    cy="100"
                    r="6"
                    fill="currentColor"
                    className="text-primary"
                />
                <circle
                    cx="100"
                    cy="100"
                    r="3"
                    fill="currentColor"
                    className="text-primary-content"
                />
            </svg>
        </div>
    );
}
