"use client";

import { useEffect, useState } from "react";
import { ScheduleCard } from "@/features/schedule-card";
import type { Absence } from "@/src/shared/types/api";

interface Schedule {
    [key: string]: string | number | boolean | Date;
}

interface SelectedDateInfo {
    date: Date;
    dateStr: string;
    events: Schedule[];
}

export default function CalendarPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<SelectedDateInfo | null>(
        null
    );
    const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [schedulesRes, absencesRes] = await Promise.all([
                    fetch(
                        `${process.env.NEXT_PUBLIC_GAS_API_URL}?path=schedules`
                    ),
                    fetch(
                        `${process.env.NEXT_PUBLIC_GAS_API_URL}?path=absences`
                    ),
                ]);
                const schedulesData = await schedulesRes.json();
                const absencesData = await absencesRes.json();
                if (schedulesData.success) {
                    setSchedules(schedulesData.data || []);
                } else {
                    setError(
                        schedulesData.error || "データの取得に失敗しました"
                    );
                }
                if (absencesData.success) {
                    setAbsences(absencesData.data || []);
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
    }, []);

    // 活動日のマップを作成（YYYY-MM-DD形式 -> イベント数）
    const activityCounts = new Map<string, number>();
    const eventsByDate = new Map<string, Schedule[]>();
    schedules.forEach((schedule) => {
        const values = Object.values(schedule);
        const year = Number(values[1]);
        const month = Number(values[2]);
        const day = Number(values[3]);
        if (year && month && day) {
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
                day
            ).padStart(2, "0")}`;
            activityCounts.set(dateStr, (activityCounts.get(dateStr) || 0) + 1);
            const existing = eventsByDate.get(dateStr) || [];
            eventsByDate.set(dateStr, [...existing, schedule]);
        }
    });

    // 日付クリック時のハンドラー
    const handleDateClick = (date: Date, dateStr: string) => {
        const events = eventsByDate.get(dateStr) || [];
        if (events.length > 0) {
            setSelectedDate({ date, dateStr, events });
        }
    };

    // モーダルを閉じる
    const closeModal = () => {
        setSelectedDate(null);
        setSelectedEvent(null);
    };

    // 一覧からイベントを選択
    const handleEventSelect = (event: Schedule) => {
        setSelectedEvent(event);
    };

    // 詳細モーダルを閉じて一覧に戻る
    const closeEventModal = () => {
        setSelectedEvent(null);
    };

    // カレンダーの月を変更
    const changeMonth = (delta: number) => {
        setCurrentDate((prev) => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };

    // 今月に戻る
    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // カレンダーのグリッドを生成
    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // 月の最初の日と最後の日
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // 月の最初の日の曜日（0=日曜日）
        const startDayOfWeek = firstDayOfMonth.getDay();

        // カレンダーに表示する日を生成
        const days: {
            date: Date;
            dateStr: string;
            isCurrentMonth: boolean;
            isToday: boolean;
            activityCount: number;
        }[] = [];

        // 前月の日を追加
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, month - 1, prevMonthLastDay - i);
            const dateStr = `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            days.push({
                date,
                dateStr,
                isCurrentMonth: false,
                isToday: false,
                activityCount: activityCounts.get(dateStr) || 0,
            });
        }

        // 今月の日を追加
        const today = new Date();
        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const date = new Date(year, month, day);
            const dateStr = `${year}-${String(month + 1).padStart(
                2,
                "0"
            )}-${String(day).padStart(2, "0")}`;
            days.push({
                date,
                dateStr,
                isCurrentMonth: true,
                isToday:
                    today.getFullYear() === year &&
                    today.getMonth() === month &&
                    today.getDate() === day,
                activityCount: activityCounts.get(dateStr) || 0,
            });
        }

        // 次月の日を追加（6行になるまで）
        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(year, month + 1, day);
            const dateStr = `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            days.push({
                date,
                dateStr,
                isCurrentMonth: false,
                isToday: false,
                activityCount: activityCounts.get(dateStr) || 0,
            });
        }

        return days;
    };

    const days = generateCalendarDays();
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

    if (isLoading) {
        return (
            <div className="p-4 lg:p-6 w-full h-full flex items-center justify-center">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 w-full h-full flex flex-col">
            {error && (
                <div className="alert alert-error mb-4 w-full">
                    <span>{error}</span>
                </div>
            )}

            {/* カレンダーカード */}
            <div className="card bg-base-100 shadow-xl border border-base-300 w-full flex-1 flex flex-col">
                <div className="card-body p-3 sm:p-4 lg:p-6 flex-1 flex flex-col">
                    {/* ヘッダー：月切り替え */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => changeMonth(-1)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
                                {currentDate.getFullYear()}年
                                {currentDate.getMonth() + 1}月
                            </h2>
                            <button
                                className="btn btn-ghost btn-xs"
                                onClick={goToToday}
                            >
                                今月
                            </button>
                        </div>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => changeMonth(1)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* 曜日ヘッダー */}
                    <div className="grid grid-cols-7 gap-1 mb-2 bg-base-200 rounded-lg">
                        {weekDays.map((day, index) => (
                            <div
                                key={day}
                                className={`text-center font-bold py-2 ${
                                    index === 0
                                        ? "text-error"
                                        : index === 6
                                        ? "text-info"
                                        : ""
                                }`}
                                style={{ fontSize: 'clamp(0.875rem, 2vw, 1.25rem)' }}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* カレンダーグリッド */}
                    <div className="grid grid-cols-7 gap-1 flex-1">
                        {days.map((day, index) => {
                            const dayOfWeek = day.date.getDay();
                            const hasEvents = day.activityCount > 0;
                            return (
                                <div
                                    key={index}
                                    onClick={() =>
                                        hasEvents &&
                                        handleDateClick(day.date, day.dateStr)
                                    }
                                    className={`
                                        relative flex flex-col items-center justify-center rounded-lg
                                        ${
                                            hasEvents
                                                ? "cursor-pointer hover:bg-base-200"
                                                : ""
                                        }
                                        ${
                                            day.isCurrentMonth
                                                ? ""
                                                : "opacity-30"
                                        }
                                        ${
                                            day.isToday
                                                ? "bg-primary text-primary-content font-bold hover:bg-primary/80"
                                                : ""
                                        }
                                        ${
                                            !day.isToday &&
                                            day.isCurrentMonth &&
                                            dayOfWeek === 0
                                                ? "text-error"
                                                : ""
                                        }
                                        ${
                                            !day.isToday &&
                                            day.isCurrentMonth &&
                                            dayOfWeek === 6
                                                ? "text-info"
                                                : ""
                                        }
                                    `}
                                >
                                    <span style={{ fontSize: 'clamp(0.875rem, 2vw, 1.5rem)' }}>
                                        {day.date.getDate()}
                                    </span>
                                    {hasEvents && (
                                        <div className="absolute bottom-2 flex gap-0.5 ">
                                            {Array.from({
                                                length: Math.min(
                                                    day.activityCount,
                                                    3
                                                ),
                                            }).map((_, i) => (
                                                <span
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        day.isToday
                                                            ? "bg-primary-content"
                                                            : "bg-primary"
                                                    }`}
                                                ></span>
                                            ))}
                                            {day.activityCount > 3 && (
                                                <span
                                                    className={`text-xs leading-none ${
                                                        day.isToday
                                                            ? "text-primary-content"
                                                            : "text-primary"
                                                    }`}
                                                >
                                                    +
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* 凡例 */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-base-300 text-base-content/70" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            <span>1件</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="flex gap-0.5">
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                            </div>
                            <span>2件</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="flex gap-0.5">
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                <span className="text-xs text-primary">+</span>
                            </div>
                            <span>4件以上</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded bg-primary"></span>
                            <span>今日</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* イベント詳細モーダル - 1件の場合は直接ScheduleCardモーダルを表示 */}
            {selectedDate &&
                selectedDate.events.length === 1 &&
                (() => {
                    const event = selectedDate.events[0];
                    const values = Object.values(event);
                    const eventId = String(values[0] ?? "");
                    const year = Number(values[1]);
                    const month = Number(values[2]);
                    const date = Number(values[3]);
                    const rawTimeHH = values[4];
                    const rawTimeMM = values[5];
                    const title = String(values[6] ?? "予定");
                    const where = String(values[7] ?? "");
                    const detail = String(values[8] ?? "");

                    const scheduleDate = new Date(year, month - 1, date);
                    const scheduleDayOfWeek = [
                        "日",
                        "月",
                        "火",
                        "水",
                        "木",
                        "金",
                        "土",
                    ][scheduleDate.getDay()];
                    const dateLabel = `${month}/${date}(${scheduleDayOfWeek})`;

                    const hasTime =
                        rawTimeHH !== "" &&
                        rawTimeHH !== null &&
                        rawTimeHH !== undefined &&
                        rawTimeMM !== "" &&
                        rawTimeMM !== null &&
                        rawTimeMM !== undefined;
                    const timeLabel = hasTime
                        ? `${String(rawTimeHH).padStart(2, "0")}:${String(
                              rawTimeMM
                          ).padStart(2, "0")}`
                        : undefined;

                    const eventAbsences = absences.filter((absence) => {
                        const absenceValues = Object.values(absence);
                        return absenceValues[1] === eventId;
                    });

                    return (
                        <ScheduleCard
                            eventId={eventId}
                            title={title}
                            where={where}
                            detail={detail}
                            absences={eventAbsences}
                            dateLabel={dateLabel}
                            timeLabel={timeLabel}
                            defaultOpen={true}
                            onClose={closeModal}
                            hideCard={true}
                        />
                    );
                })()}

            {/* イベント詳細モーダル - 複数件の場合は一覧表示 */}
            {selectedDate &&
                selectedDate.events.length > 1 &&
                !selectedEvent && (
                    <dialog className="modal modal-open modal-middle">
                        <div className="modal-box max-w-2xl max-h-[calc(100vh-5rem)]">
                            <button
                                onClick={closeModal}
                                className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                            >
                                ✕
                            </button>
                            <h3 className="font-bold text-xl mb-4">
                                {selectedDate.date.getFullYear()}年
                                {selectedDate.date.getMonth() + 1}月
                                {selectedDate.date.getDate()}日の予定
                                <span className="badge badge-primary ml-2">
                                    {selectedDate.events.length}件
                                </span>
                            </h3>
                            <div className="space-y-3">
                                {selectedDate.events.map((event, index) => {
                                    const values = Object.values(event);
                                    const rawTimeHH = values[4];
                                    const rawTimeMM = values[5];
                                    const title = String(values[6] ?? "予定");
                                    const where = String(values[7] ?? "");

                                    const hasTime =
                                        rawTimeHH !== "" &&
                                        rawTimeHH !== null &&
                                        rawTimeHH !== undefined &&
                                        rawTimeMM !== "" &&
                                        rawTimeMM !== null &&
                                        rawTimeMM !== undefined;
                                    const timeLabel = hasTime
                                        ? `${String(rawTimeHH).padStart(
                                              2,
                                              "0"
                                          )}:${String(rawTimeMM).padStart(
                                              2,
                                              "0"
                                          )}`
                                        : null;

                                    return (
                                        <div
                                            key={index}
                                            onClick={() =>
                                                handleEventSelect(event)
                                            }
                                            className="p-4 bg-base-100 rounded-xl border-l-4 border-primary shadow-sm hover:shadow-lg transition-all cursor-pointer hover:bg-base-200/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 bg-primary rounded-full shrink-0"></div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-lg flex items-center gap-2">
                                                        {title}
                                                        {timeLabel && (
                                                            <span className="text-sm font-normal text-base-content/70">
                                                                {timeLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {where && (
                                                        <div className="text-sm text-base-content/70 mt-1">
                                                            {where}
                                                        </div>
                                                    )}
                                                </div>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-5 w-5 text-base-content/50"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 5l7 7-7 7"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <form
                            method="dialog"
                            className="modal-backdrop"
                        >
                            <button onClick={closeModal}>close</button>
                        </form>
                    </dialog>
                )}

            {/* 選択されたイベントの詳細モーダル */}
            {selectedDate &&
                selectedDate.events.length > 1 &&
                selectedEvent &&
                (() => {
                    const values = Object.values(selectedEvent);
                    const eventId = String(values[0] ?? "");
                    const year = Number(values[1]);
                    const month = Number(values[2]);
                    const date = Number(values[3]);
                    const rawTimeHH = values[4];
                    const rawTimeMM = values[5];
                    const title = String(values[6] ?? "予定");
                    const where = String(values[7] ?? "");
                    const detail = String(values[8] ?? "");

                    const scheduleDate = new Date(year, month - 1, date);
                    const scheduleDayOfWeek = [
                        "日",
                        "月",
                        "火",
                        "水",
                        "木",
                        "金",
                        "土",
                    ][scheduleDate.getDay()];
                    const dateLabel = `${month}/${date}(${scheduleDayOfWeek})`;

                    const hasTime =
                        rawTimeHH !== "" &&
                        rawTimeHH !== null &&
                        rawTimeHH !== undefined &&
                        rawTimeMM !== "" &&
                        rawTimeMM !== null &&
                        rawTimeMM !== undefined;
                    const timeLabel = hasTime
                        ? `${String(rawTimeHH).padStart(2, "0")}:${String(
                              rawTimeMM
                          ).padStart(2, "0")}`
                        : undefined;

                    const eventAbsences = absences.filter((absence) => {
                        const absenceValues = Object.values(absence);
                        return absenceValues[1] === eventId;
                    });

                    return (
                        <ScheduleCard
                            eventId={eventId}
                            title={title}
                            where={where}
                            detail={detail}
                            absences={eventAbsences}
                            dateLabel={dateLabel}
                            timeLabel={timeLabel}
                            defaultOpen={true}
                            onClose={closeEventModal}
                            hideCard={true}
                        />
                    );
                })()}
        </div>
    );
}
