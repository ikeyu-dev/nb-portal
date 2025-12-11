"use client";

import { useEffect, useState } from "react";

interface WeatherData {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
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

const getWeatherEmoji = (code: number): string => {
    if (code === 0) return "☀️";
    if (code <= 3) return "⛅";
    if (code <= 48) return "🌫️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "🌨️";
    if (code <= 82) return "🌧️";
    if (code <= 86) return "🌨️";
    return "⛈️";
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
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia/Tokyo`
        )
            .then((res) => res.json())
            .then((data) => {
                setWeather({
                    temperature: Math.round(data.current.temperature_2m),
                    weatherCode: data.current.weather_code,
                    windSpeed: data.current.wind_speed_10m,
                });
                setLoading(false);
            })
            .catch((err) => {
                setError("天気情報の取得に失敗しました");
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (error || !weather) {
        return (
            <div className="alert alert-warning">
                <span>{error || "天気情報がありません"}</span>
            </div>
        );
    }

    return (
        <div className="text-center">
            <div className="text-4xl lg:text-6xl mb-2 lg:mb-4">
                {getWeatherEmoji(weather.weatherCode)}
            </div>
            <div className="text-2xl lg:text-4xl font-bold mb-1 lg:mb-2">
                {weather.temperature}°C
            </div>
            <div className="text-base lg:text-xl mb-1 lg:mb-2">
                {getWeatherDescription(weather.weatherCode)}
            </div>
            <div className="text-xs lg:text-sm text-base-content/60">
                風速: {weather.windSpeed} m/s
            </div>
        </div>
    );
}
