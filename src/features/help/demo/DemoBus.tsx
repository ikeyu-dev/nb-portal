"use client";

import { useState } from "react";

interface BusTime {
    hour: number;
    minutes: number[];
}

interface DemoBusSchedule {
    stationName: string;
    fromStation: BusTime[];
    fromUniversity: BusTime[];
}

const DEMO_BUS_DATA: { tobu: DemoBusSchedule; jr: DemoBusSchedule } = {
    tobu: {
        stationName: "東武動物公園駅",
        fromStation: [
            { hour: 8, minutes: [0, 30] },
            { hour: 9, minutes: [0, 30] },
            { hour: 10, minutes: [0] },
        ],
        fromUniversity: [
            { hour: 16, minutes: [30] },
            { hour: 17, minutes: [0, 30] },
            { hour: 18, minutes: [0] },
        ],
    },
    jr: {
        stationName: "新白岡駅",
        fromStation: [
            { hour: 8, minutes: [15, 45] },
            { hour: 9, minutes: [15] },
        ],
        fromUniversity: [
            { hour: 17, minutes: [15] },
            { hour: 18, minutes: [15] },
        ],
    },
};

/**
 * バス時刻表のデモコンポーネント
 */
export function DemoBus() {
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const formatTime = (hour: number, minute: number) => {
        return `${hour}:${String(minute).padStart(2, "0")}`;
    };

    return (
        <div className="space-y-4">
            <div className="form-control w-full max-w-xs">
                <label className="label">
                    <span className="label-text">日付を選択</span>
                </label>
                <input
                    type="date"
                    className="input input-bordered w-full"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 東武動物公園駅 */}
                <div className="card bg-base-100 border border-orange-500/30">
                    <div className="card-body p-4">
                        <h3 className="font-bold text-orange-500">
                            {DEMO_BUS_DATA.tobu.stationName}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <p className="text-base-content/60 mb-1">
                                    駅発
                                </p>
                                {DEMO_BUS_DATA.tobu.fromStation.map((t) =>
                                    t.minutes.map((m) => (
                                        <span
                                            key={`${t.hour}-${m}`}
                                            className="badge badge-sm mr-1 mb-1"
                                        >
                                            {formatTime(t.hour, m)}
                                        </span>
                                    ))
                                )}
                            </div>
                            <div>
                                <p className="text-base-content/60 mb-1">
                                    大学発
                                </p>
                                {DEMO_BUS_DATA.tobu.fromUniversity.map((t) =>
                                    t.minutes.map((m) => (
                                        <span
                                            key={`${t.hour}-${m}`}
                                            className="badge badge-sm mr-1 mb-1"
                                        >
                                            {formatTime(t.hour, m)}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 新白岡駅 */}
                <div className="card bg-base-100 border border-blue-500/30">
                    <div className="card-body p-4">
                        <h3 className="font-bold text-blue-500">
                            {DEMO_BUS_DATA.jr.stationName}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <p className="text-base-content/60 mb-1">
                                    駅発
                                </p>
                                {DEMO_BUS_DATA.jr.fromStation.map((t) =>
                                    t.minutes.map((m) => (
                                        <span
                                            key={`${t.hour}-${m}`}
                                            className="badge badge-sm mr-1 mb-1"
                                        >
                                            {formatTime(t.hour, m)}
                                        </span>
                                    ))
                                )}
                            </div>
                            <div>
                                <p className="text-base-content/60 mb-1">
                                    大学発
                                </p>
                                {DEMO_BUS_DATA.jr.fromUniversity.map((t) =>
                                    t.minutes.map((m) => (
                                        <span
                                            key={`${t.hour}-${m}`}
                                            className="badge badge-sm mr-1 mb-1"
                                        >
                                            {formatTime(t.hour, m)}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <p className="text-xs text-base-content/50 text-center">
                これはデモ表示です。実際の時刻表とは異なります。
            </p>
        </div>
    );
}
