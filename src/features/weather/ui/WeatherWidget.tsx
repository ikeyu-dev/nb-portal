"use client";

import { useEffect, useState } from "react";

interface WeatherData {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    humidity: number;
}

// WMO Weather interpretation codes
const getWeatherDescription = (code: number): string => {
    const weatherCodes: { [key: number]: string } = {
        0: "快晴",
        1: "晴れ",
        2: "やや曇り",
        3: "曇り",
        45: "霧",
        48: "霧氷",
        51: "小雨",
        53: "雨",
        55: "大雨",
        61: "小雨",
        63: "雨",
        65: "大雨",
        71: "小雪",
        73: "雪",
        75: "大雪",
        77: "みぞれ",
        80: "にわか雨",
        81: "にわか雨",
        82: "豪雨",
        85: "にわか雪",
        86: "にわか雪",
        95: "雷雨",
        96: "雷雨",
        99: "雷雨",
    };
    return weatherCodes[code] || "不明";
};

// 天気アイコンをSVGで表示
const WeatherIcon = ({ code }: { code: number }) => {
    // 晴れ
    if (code === 0) {
        return (
            <svg
                viewBox="0 0 64 64"
                className="w-full h-full"
            >
                <circle
                    cx="32"
                    cy="32"
                    r="12"
                    className="fill-yellow-400"
                />
                {[...Array(8)].map((_, i) => {
                    const angle = i * 45 * (Math.PI / 180);
                    const x1 = 32 + 18 * Math.cos(angle);
                    const y1 = 32 + 18 * Math.sin(angle);
                    const x2 = 32 + 24 * Math.cos(angle);
                    const y2 = 32 + 24 * Math.sin(angle);
                    return (
                        <line
                            key={i}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            className="stroke-yellow-400"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    );
                })}
            </svg>
        );
    }

    // 晴れ時々曇り
    if (code <= 3) {
        return (
            <svg
                viewBox="0 0 64 64"
                className="w-full h-full"
            >
                <circle
                    cx="24"
                    cy="24"
                    r="10"
                    className="fill-yellow-400"
                />
                {[...Array(8)].map((_, i) => {
                    const angle = i * 45 * (Math.PI / 180);
                    const x1 = 24 + 14 * Math.cos(angle);
                    const y1 = 24 + 14 * Math.sin(angle);
                    const x2 = 24 + 18 * Math.cos(angle);
                    const y2 = 24 + 18 * Math.sin(angle);
                    return (
                        <line
                            key={i}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            className="stroke-yellow-400"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    );
                })}
                <path
                    d="M20 44 Q20 36 28 36 Q28 30 36 30 Q46 30 46 38 Q54 38 54 46 Q54 52 46 52 L24 52 Q16 52 16 46 Q16 44 20 44"
                    className="fill-base-content/30"
                />
            </svg>
        );
    }

    // 霧
    if (code <= 48) {
        return (
            <svg
                viewBox="0 0 64 64"
                className="w-full h-full"
            >
                <line
                    x1="12"
                    y1="28"
                    x2="52"
                    y2="28"
                    className="stroke-base-content/40"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
                <line
                    x1="16"
                    y1="36"
                    x2="48"
                    y2="36"
                    className="stroke-base-content/30"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
                <line
                    x1="12"
                    y1="44"
                    x2="52"
                    y2="44"
                    className="stroke-base-content/20"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
            </svg>
        );
    }

    // 雨
    if (code <= 67 || (code >= 80 && code <= 82)) {
        return (
            <svg
                viewBox="0 0 64 64"
                className="w-full h-full"
            >
                <path
                    d="M16 36 Q16 28 24 28 Q24 20 34 20 Q46 20 46 30 Q54 30 54 38 Q54 44 46 44 L22 44 Q14 44 14 38 Q14 36 16 36"
                    className="fill-base-content/40"
                />
                <line
                    x1="22"
                    y1="50"
                    x2="20"
                    y2="58"
                    className="stroke-blue-400"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <line
                    x1="32"
                    y1="50"
                    x2="30"
                    y2="58"
                    className="stroke-blue-400"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <line
                    x1="42"
                    y1="50"
                    x2="40"
                    y2="58"
                    className="stroke-blue-400"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </svg>
        );
    }

    // 雪
    if (code <= 77 || (code >= 85 && code <= 86)) {
        return (
            <svg
                viewBox="0 0 64 64"
                className="w-full h-full"
            >
                <path
                    d="M16 36 Q16 28 24 28 Q24 20 34 20 Q46 20 46 30 Q54 30 54 38 Q54 44 46 44 L22 44 Q14 44 14 38 Q14 36 16 36"
                    className="fill-base-content/40"
                />
                <circle
                    cx="22"
                    cy="54"
                    r="3"
                    className="fill-sky-200"
                />
                <circle
                    cx="32"
                    cy="52"
                    r="3"
                    className="fill-sky-200"
                />
                <circle
                    cx="42"
                    cy="56"
                    r="3"
                    className="fill-sky-200"
                />
            </svg>
        );
    }

    // 雷雨
    return (
        <svg
            viewBox="0 0 64 64"
            className="w-full h-full"
        >
            <path
                d="M16 32 Q16 24 24 24 Q24 16 34 16 Q46 16 46 26 Q54 26 54 34 Q54 40 46 40 L22 40 Q14 40 14 34 Q14 32 16 32"
                className="fill-base-content/50"
            />
            <path
                d="M30 42 L34 50 L28 50 L32 60 L28 52 L34 52 L30 42"
                className="fill-yellow-400"
            />
        </svg>
    );
};

export default function WeatherWidget() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 東京の座標（デフォルト）
        const latitude = 35.6762;
        const longitude = 139.6503;

        fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=Asia/Tokyo`
        )
            .then((res) => res.json())
            .then((data) => {
                setWeather({
                    temperature: Math.round(data.current.temperature_2m),
                    weatherCode: data.current.weather_code,
                    windSpeed: data.current.wind_speed_10m,
                    humidity: data.current.relative_humidity_2m,
                });
                setLoading(false);
            })
            .catch(() => {
                setError("天気情報の取得に失敗しました");
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <span className="loading loading-spinner loading-sm text-primary"></span>
        );
    }

    if (error || !weather) {
        return (
            <p className="text-sm text-base-content/50">
                天気情報を取得できませんでした
            </p>
        );
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-3 text-base-content/70">
            <div className="flex items-center gap-1.5">
                <div className="w-6 h-6">
                    <WeatherIcon code={weather.weatherCode} />
                </div>
                <span className="font-semibold text-base-content">
                    {getWeatherDescription(weather.weatherCode)}
                </span>
            </div>
            <span className="font-bold text-lg tabular-nums text-base-content">
                {weather.temperature}
                <span className="text-sm text-base-content/60">°C</span>
            </span>
            <span className="text-sm tabular-nums">
                湿度 {weather.humidity}%
            </span>
            <span className="text-sm tabular-nums">
                風速 {weather.windSpeed}m/s
            </span>
        </div>
    );
}
