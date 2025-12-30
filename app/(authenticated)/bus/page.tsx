"use client";

import { useEffect, useState } from "react";
import { BusScheduleCard } from "@/src/features/bus-schedule/ui/BusScheduleCard";
import { HelpButton } from "@/src/features/help";

interface BusTime {
    hour: number;
    minutes: number[];
}

interface BusSchedule {
    stationName: string;
    fromStation: BusTime[];
    fromUniversity: BusTime[];
    notices: string[];
}

interface BusScheduleData {
    date: string;
    scheduleType: string;
    tobu: BusSchedule;
    jr: BusSchedule;
}

export default function BusSchedulePage() {
    const [data, setData] = useState<BusScheduleData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/bus-schedule?date=${selectedDate}`
                );
                const json = await res.json();
                if (json.success) {
                    setData(json.data);
                } else {
                    setError(json.error || "データの取得に失敗しました");
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "データの取得に失敗しました"
                );
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedDate]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(e.target.value);
    };

    if (isLoading) {
        return (
            <div className="p-4 lg:p-6 w-full">
                <div className="max-w-4xl mx-auto">
                    {/* ヘッダー Skeleton */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-6 w-6 bg-base-300 rounded animate-pulse"></div>
                        <div className="h-8 w-32 bg-base-300 rounded-lg animate-pulse"></div>
                    </div>

                    {/* バスダイヤ Skeleton */}
                    <div className="card bg-base-100 shadow-xl border border-base-300">
                        <div className="card-body">
                            <div className="flex items-center justify-center py-12">
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-4xl mx-auto">
                {/* ヘッダー */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7h8m-8 4h8m-4-8v16m-4-4h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                        </svg>
                        <h1
                            className="font-bold"
                            style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
                        >
                            バスダイヤ
                        </h1>
                        <HelpButton sectionId="bus" />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="input input-bordered input-sm"
                        />
                    </div>
                </div>

                {error && (
                    <div className="alert alert-error mb-4">
                        <span>{error}</span>
                    </div>
                )}

                {data && (
                    <div className="space-y-6">
                        {/* ダイヤ種別バッジ */}
                        {data.scheduleType && (
                            <div className="flex justify-center">
                                <span className="badge badge-lg badge-outline border-primary text-primary gap-2 px-4 py-3">
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
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    {data.scheduleType}
                                </span>
                            </div>
                        )}

                        {/* 東武動物公園駅 */}
                        <BusScheduleCard
                            schedule={data.tobu}
                            type="tobu"
                            selectedDate={selectedDate}
                        />

                        {/* 新白岡駅 */}
                        <BusScheduleCard
                            schedule={data.jr}
                            type="jr"
                            selectedDate={selectedDate}
                        />

                        {/* 注意事項 */}
                        <div className="text-sm text-base-content/60 space-y-1">
                            <p>
                                ※
                                宮代町運行の町内循環バスのバス停が「東武動物公園駅西口」「日本工業大学入口」に設置されています。
                            </p>
                            <p>
                                ※
                                行事等による「特別ダイヤ」では運行が変更になる場合があります。
                            </p>
                            <p>
                                ★＝約5分間隔、●＝約10分間隔、▲＝約15分間隔で運行
                            </p>
                        </div>

                        {/* 外部リンク */}
                        <div className="flex justify-center">
                            <a
                                href={`https://www.nit.ac.jp/campus/access/bus-schedule?date=${selectedDate}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline btn-sm gap-2"
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
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                </svg>
                                ホームページで確認
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
