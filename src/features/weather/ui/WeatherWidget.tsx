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
            <svg viewBox="0 0 64 64" className="w-full h-full">
                <circle cx="32" cy="32" r="12" className="fill-yellow-400" />
                {[...Array(8)].map((_, i) => {
                    const angle = (i * 45) * (Math.PI / 180);
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
            <svg viewBox="0 0 64 64" className="w-full h-full">
                <circle cx="24" cy="24" r="10" className="fill-yellow-400" />
                {[...Array(8)].map((_, i) => {
                    const angle = (i * 45) * (Math.PI / 180);
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
            <svg viewBox="0 0 64 64" className="w-full h-full">
                <line x1="12" y1="28" x2="52" y2="28" className="stroke-base-content/40" strokeWidth="4" strokeLinecap="round" />
                <line x1="16" y1="36" x2="48" y2="36" className="stroke-base-content/30" strokeWidth="4" strokeLinecap="round" />
                <line x1="12" y1="44" x2="52" y2="44" className="stroke-base-content/20" strokeWidth="4" strokeLinecap="round" />
            </svg>
        );
    }

    // 雨
    if (code <= 67 || (code >= 80 && code <= 82)) {
        return (
            <svg viewBox="0 0 64 64" className="w-full h-full">
                <path
                    d="M16 36 Q16 28 24 28 Q24 20 34 20 Q46 20 46 30 Q54 30 54 38 Q54 44 46 44 L22 44 Q14 44 14 38 Q14 36 16 36"
                    className="fill-base-content/40"
                />
                <line x1="22" y1="50" x2="20" y2="58" className="stroke-blue-400" strokeWidth="2" strokeLinecap="round" />
                <line x1="32" y1="50" x2="30" y2="58" className="stroke-blue-400" strokeWidth="2" strokeLinecap="round" />
                <line x1="42" y1="50" x2="40" y2="58" className="stroke-blue-400" strokeWidth="2" strokeLinecap="round" />
            </svg>
        );
    }

    // 雪
    if (code <= 77 || (code >= 85 && code <= 86)) {
        return (
            <svg viewBox="0 0 64 64" className="w-full h-full">
                <path
                    d="M16 36 Q16 28 24 28 Q24 20 34 20 Q46 20 46 30 Q54 30 54 38 Q54 44 46 44 L22 44 Q14 44 14 38 Q14 36 16 36"
                    className="fill-base-content/40"
                />
                <circle cx="22" cy="54" r="3" className="fill-sky-200" />
                <circle cx="32" cy="52" r="3" className="fill-sky-200" />
                <circle cx="42" cy="56" r="3" className="fill-sky-200" />
            </svg>
        );
    }

    // 雷雨
    return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
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
            <div className="flex items-center justify-center h-full">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    if (error || !weather) {
        return (
            <div className="flex items-center justify-center h-full p-4">
                <div className="text-center text-base-content/60">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 mx-auto mb-2 opacity-50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <p className="text-sm">{error || "取得エラー"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-2">
            {/* 天気アイコン */}
            <div className="w-16 h-16 lg:w-20 lg:h-20 mb-2">
                <WeatherIcon code={weather.weatherCode} />
            </div>

            {/* 気温 */}
            <div className="text-3xl lg:text-4xl font-bold text-base-content mb-1">
                {weather.temperature}
                <span className="text-xl lg:text-2xl text-base-content/60">°C</span>
            </div>

            {/* 天気の説明 */}
            <div className="text-base lg:text-lg font-medium text-base-content/80 mb-2">
                {getWeatherDescription(weather.weatherCode)}
            </div>

            {/* 詳細情報 */}
            <div className="flex gap-4 text-xs lg:text-sm text-base-content/60">
                <div className="flex items-center gap-1">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="w-4 h-4"
                        strokeWidth="2"
                    >
                        <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
                    </svg>
                    <span>{weather.windSpeed}m/s</span>
                </div>
                <div className="flex items-center gap-1">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="w-4 h-4"
                        strokeWidth="2"
                    >
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                    </svg>
                    <span>{weather.humidity}%</span>
                </div>
            </div>
        </div>
    );
}
