"use client";

import { useState, useEffect, useMemo } from "react";

interface BusTime {
    hour: number;
    minutes: number[];
}

interface BusSchedule {
    stationName: string;
    fromStation: BusTime[];
    fromUniversity: BusTime[];
    notices?: string[];
}

interface BusScheduleData {
    date: string;
    scheduleType?: string;
    tobu: BusSchedule;
    jr: BusSchedule;
}

interface NextBus {
    hour: number;
    minute: number;
    remainingMinutes: number;
}

// 次のバスを計算
const getNextBus = (times: BusTime[], now: Date): NextBus | null => {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // すべてのバス時刻をフラット化してソート
    const allBuses: { hour: number; minute: number }[] = [];
    for (const time of times) {
        for (const minute of time.minutes) {
            allBuses.push({ hour: time.hour, minute });
        }
    }

    // 時刻順にソート
    allBuses.sort((a, b) => {
        if (a.hour !== b.hour) return a.hour - b.hour;
        return a.minute - b.minute;
    });

    // 現在時刻より後の最初のバスを探す
    for (const bus of allBuses) {
        if (bus.hour < currentHour) continue;
        if (bus.hour === currentHour && bus.minute <= currentMinute) continue;

        const remainingMinutes =
            (bus.hour - currentHour) * 60 + (bus.minute - currentMinute);

        return {
            hour: bus.hour,
            minute: bus.minute,
            remainingMinutes,
        };
    }

    return null;
};

// 時刻表示用フォーマット
const formatTime = (hour: number, minute: number): string => {
    return `${hour}:${String(minute).padStart(2, "0")}`;
};

interface BusScheduleCardProps {
    schedule: BusSchedule;
    type: "tobu" | "jr";
    compact?: boolean;
    selectedDate?: string;
}

export function BusScheduleCard({
    schedule,
    type,
    compact = false,
    selectedDate,
}: BusScheduleCardProps) {
    const [now, setNow] = useState(new Date());

    // 今日の日付かどうかを判定
    const isToday = !selectedDate || selectedDate === new Date().toISOString().split("T")[0];

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 30000); // 30秒ごとに更新

        return () => clearInterval(timer);
    }, []);

    const nextFromStation = useMemo(
        () => getNextBus(schedule.fromStation, now),
        [schedule.fromStation, now]
    );
    const nextFromUniversity = useMemo(
        () => getNextBus(schedule.fromUniversity, now),
        [schedule.fromUniversity, now]
    );

    const colorClass = type === "tobu" ? "text-orange-500" : "text-blue-500";
    const bgClass = type === "tobu" ? "bg-orange-500/10" : "bg-blue-500/10";
    const borderClass =
        type === "tobu" ? "border-orange-500/30" : "border-blue-500/30";

    if (compact) {
        return (
            <div
                className={`p-4 rounded-xl border ${borderClass} ${bgClass} space-y-3`}
            >
                <div className="flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 ${colorClass}`}
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
                    <span className="font-bold">{schedule.stationName}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <div className="text-xs text-base-content/60 mb-1">
                            駅発
                        </div>
                        {nextFromStation ? (
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold text-lg">
                                    {formatTime(
                                        nextFromStation.hour,
                                        nextFromStation.minute
                                    )}
                                </span>
                                <span className="text-xs text-base-content/60">
                                    ({nextFromStation.remainingMinutes}分後)
                                </span>
                            </div>
                        ) : (
                            <span className="text-sm text-base-content/50">
                                本日終了
                            </span>
                        )}
                    </div>
                    <div>
                        <div className="text-xs text-base-content/60 mb-1">
                            大学発
                        </div>
                        {nextFromUniversity ? (
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold text-lg">
                                    {formatTime(
                                        nextFromUniversity.hour,
                                        nextFromUniversity.minute
                                    )}
                                </span>
                                <span className="text-xs text-base-content/60">
                                    ({nextFromUniversity.remainingMinutes}分後)
                                </span>
                            </div>
                        ) : (
                            <span className="text-sm text-base-content/50">
                                本日終了
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`card bg-base-100 shadow-sm border ${borderClass}`}>
            <div className="card-body p-4 lg:p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${bgClass}`}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-6 w-6 ${colorClass}`}
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
                    </div>
                    <h3 className="font-bold text-lg">{schedule.stationName}</h3>
                </div>

                {/* 次のバス表示（今日のみ表示） */}
                {isToday && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className={`p-4 rounded-xl ${bgClass}`}>
                            <div className="text-sm text-base-content/70 mb-2">
                                次の駅発バス
                            </div>
                            {nextFromStation ? (
                                <>
                                    <div className="font-bold text-2xl">
                                        {formatTime(
                                            nextFromStation.hour,
                                            nextFromStation.minute
                                        )}
                                    </div>
                                    <div className={`text-sm ${colorClass}`}>
                                        あと{nextFromStation.remainingMinutes}分
                                    </div>
                                </>
                            ) : (
                                <div className="text-base-content/50">本日終了</div>
                            )}
                        </div>
                        <div className={`p-4 rounded-xl ${bgClass}`}>
                            <div className="text-sm text-base-content/70 mb-2">
                                次の大学発バス
                            </div>
                            {nextFromUniversity ? (
                                <>
                                    <div className="font-bold text-2xl">
                                        {formatTime(
                                            nextFromUniversity.hour,
                                            nextFromUniversity.minute
                                        )}
                                    </div>
                                    <div className={`text-sm ${colorClass}`}>
                                        あと{nextFromUniversity.remainingMinutes}分
                                    </div>
                                </>
                            ) : (
                                <div className="text-base-content/50">本日終了</div>
                            )}
                        </div>
                    </div>
                )}

                {/* 時刻表（運休日でない場合のみ表示） */}
                {(schedule.fromStation.length > 0 || schedule.fromUniversity.length > 0) ? (
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                駅発
                            </h4>
                            <div className="overflow-x-auto">
                                <div className="flex gap-2 min-w-max">
                                    {schedule.fromStation.map((time) => (
                                        <div
                                            key={time.hour}
                                            className="flex flex-col items-center"
                                        >
                                            <div className="font-bold text-sm bg-base-200 px-2 py-1 rounded-t">
                                                {time.hour}時
                                            </div>
                                            <div className="bg-base-200/50 px-2 py-1 rounded-b min-h-[40px] text-center">
                                                {time.minutes.length > 0 ? (
                                                    time.minutes.map((m, i) => (
                                                        <div
                                                            key={i}
                                                            className="text-sm"
                                                        >
                                                            {String(m).padStart(
                                                                2,
                                                                "0"
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-sm text-base-content/30">
                                                        -
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                                大学発
                            </h4>
                            <div className="overflow-x-auto">
                                <div className="flex gap-2 min-w-max">
                                    {schedule.fromUniversity.map((time) => (
                                        <div
                                            key={time.hour}
                                            className="flex flex-col items-center"
                                        >
                                            <div className="font-bold text-sm bg-base-200 px-2 py-1 rounded-t">
                                                {time.hour}時
                                            </div>
                                            <div className="bg-base-200/50 px-2 py-1 rounded-b min-h-10 text-center">
                                                {time.minutes.length > 0 ? (
                                                    time.minutes.map((m, i) => (
                                                        <div
                                                            key={i}
                                                            className="text-sm"
                                                        >
                                                            {String(m).padStart(
                                                                2,
                                                                "0"
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-sm text-base-content/30">
                                                        -
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-base-content/60 py-4">
                        運休日です
                    </div>
                )}
            </div>
        </div>
    );
}

interface BusScheduleWidgetProps {
    data: BusScheduleData;
}

export function BusScheduleWidget({ data }: BusScheduleWidgetProps) {
    return (
        <div className="space-y-4">
            <BusScheduleCard schedule={data.tobu} type="tobu" compact />
            <BusScheduleCard schedule={data.jr} type="jr" compact />
        </div>
    );
}

export default BusScheduleCard;
