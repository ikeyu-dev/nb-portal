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
            events: Schedule[];
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
                events: eventsByDate.get(dateStr) || [],
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
                events: eventsByDate.get(dateStr) || [],
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
                events: eventsByDate.get(dateStr) || [],
            });
        }

        return days;
    };

    const days = generateCalendarDays();
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

    // イベントのタイトルを取得
    const getEventTitle = (event: Schedule): string => {
        const values = Object.values(event);
        return String(values[6] ?? "予定");
    };

    // イベントの時刻を取得
    const getEventTime = (event: Schedule): string | null => {
        const values = Object.values(event);
        const rawTimeHH = values[4];
        const rawTimeMM = values[5];
        const hasTime =
            rawTimeHH !== "" &&
            rawTimeHH !== null &&
            rawTimeHH !== undefined &&
            rawTimeMM !== "" &&
            rawTimeMM !== null &&
            rawTimeMM !== undefined;
        return hasTime
            ? `${String(rawTimeHH).padStart(2, "0")}:${String(
                  rawTimeMM
              ).padStart(2, "0")}`
            : null;
    };

    if (isLoading) {
        return (
            <div className="p-4 lg:p-6 w-full h-full flex items-center justify-center">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="max-lg:p-0 lg:p-6 w-full lg:h-full flex flex-col lg:items-stretch items-center bg-base-100 lg:overflow-hidden">
            {error && (
                <div className="alert alert-error mb-4 w-full max-w-4xl lg:hidden">
                    <span>{error}</span>
                </div>
            )}

            {/* ===== モバイル版 Google Calendar App 月表示風 ===== */}
            <div
                className="lg:hidden w-full flex flex-col overflow-hidden"
                style={{ height: "calc(100dvh - 160px)" }}
            >
                {/* ヘッダー：年月表示 + 今日ボタン */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-base-300 shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            className="btn btn-ghost btn-sm btn-circle"
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
                        <span className="font-medium text-lg min-w-[120px] text-center">
                            {currentDate.getFullYear()}年
                            {currentDate.getMonth() + 1}月
                        </span>
                        <button
                            className="btn btn-ghost btn-sm btn-circle"
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
                    <button
                        className="btn btn-ghost btn-sm text-primary font-medium"
                        onClick={goToToday}
                    >
                        今日
                    </button>
                </div>

                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 border-b border-base-300 shrink-0">
                    {weekDays.map((day, index) => (
                        <div
                            key={day}
                            className={`text-center text-xs py-2 font-medium ${
                                index === 0
                                    ? "text-error"
                                    : index === 6
                                    ? "text-info"
                                    : "text-base-content/60"
                            }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* カレンダー本体（月表示・イベントチップ付き） */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="grid grid-cols-7 grid-rows-6 h-full">
                        {days.map((day, index) => {
                            const dayOfWeek = day.date.getDay();
                            const hasEvents = day.events.length > 0;
                            const rowIndex = Math.floor(index / 7);
                            const isLastRow = rowIndex === 5;

                            return (
                                <div
                                    key={index}
                                    onClick={() =>
                                        hasEvents &&
                                        handleDateClick(day.date, day.dateStr)
                                    }
                                    className={`
                                        relative flex flex-col border-r border-b border-base-300
                                        ${isLastRow ? "border-b-0" : ""}
                                        ${index % 7 === 6 ? "border-r-0" : ""}
                                        ${
                                            hasEvents
                                                ? "cursor-pointer active:bg-base-200/50"
                                                : ""
                                        }
                                        ${
                                            !day.isCurrentMonth
                                                ? "bg-base-200/30"
                                                : "bg-base-100"
                                        }
                                    `}
                                >
                                    {/* 日付 */}
                                    <div className="p-1">
                                        <span
                                            className={`
                                                inline-flex items-center justify-center w-6 h-6 text-xs
                                                ${
                                                    day.isToday
                                                        ? "bg-primary text-primary-content rounded-full font-bold"
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
                                                ${
                                                    !day.isCurrentMonth
                                                        ? "text-base-content/30"
                                                        : ""
                                                }
                                            `}
                                        >
                                            {day.date.getDate()}
                                        </span>
                                    </div>

                                    {/* イベントチップ */}
                                    <div className="flex flex-col gap-0.5 px-0.5 pb-0.5 overflow-hidden flex-1">
                                        {day.events
                                            .slice(0, 3)
                                            .map((event, eventIndex) => {
                                                const title =
                                                    getEventTitle(event);
                                                return (
                                                    <div
                                                        key={eventIndex}
                                                        className="text-[9px] leading-tight bg-primary/90 text-primary-content px-1 py-0.5 rounded truncate"
                                                    >
                                                        {title}
                                                    </div>
                                                );
                                            })}
                                        {day.events.length > 3 && (
                                            <div className="text-[9px] text-base-content/60 px-0.5">
                                                +{day.events.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ===== PC版 Google Calendar Web風 ===== */}
            {/* Google Calendar風ヘッダー */}
            <div className="hidden lg:flex items-center justify-start mb-4 px-2 w-full">
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        className="btn btn-sm btn-outline"
                        onClick={goToToday}
                    >
                        今日
                    </button>
                    <div className="flex items-center">
                        <button
                            className="btn btn-ghost btn-sm btn-circle"
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
                        <button
                            className="btn btn-ghost btn-sm btn-circle"
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
                    <h2
                        className="font-normal text-base-content"
                        style={{ fontSize: "clamp(1.125rem, 3vw, 1.5rem)" }}
                    >
                        {currentDate.getFullYear()}年
                        {currentDate.getMonth() + 1}月
                    </h2>
                </div>
            </div>

            {/* カレンダーグリッド（PC版） */}
            <div className="hidden lg:flex flex-col flex-1 border border-base-300 rounded-lg overflow-hidden w-full">
                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 border-b border-base-300">
                    {weekDays.map((day, index) => (
                        <div
                            key={day}
                            className={`text-center py-2 text-xs sm:text-sm font-medium border-r border-base-300 last:border-r-0 ${
                                index === 0
                                    ? "text-error"
                                    : index === 6
                                    ? "text-info"
                                    : "text-base-content/70"
                            }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* カレンダー本体 */}
                <div className="grid grid-cols-7 grid-rows-6 flex-1">
                    {days.map((day, index) => {
                        const dayOfWeek = day.date.getDay();
                        const hasEvents = day.events.length > 0;
                        const rowIndex = Math.floor(index / 7);
                        const isLastRow = rowIndex === 5;

                        return (
                            <div
                                key={index}
                                onClick={() =>
                                    hasEvents &&
                                    handleDateClick(day.date, day.dateStr)
                                }
                                className={`
                                    relative flex flex-col border-r border-b border-base-300 last:border-r-0
                                    ${isLastRow ? "border-b-0" : ""}
                                    ${index % 7 === 6 ? "border-r-0" : ""}
                                    ${
                                        hasEvents
                                            ? "cursor-pointer hover:bg-base-200/50"
                                            : ""
                                    }
                                    ${
                                        !day.isCurrentMonth
                                            ? "bg-base-200/30"
                                            : "bg-base-100"
                                    }
                                `}
                            >
                                {/* 日付 */}
                                <div className="p-2">
                                    <span
                                        className={`
                                            inline-flex items-center justify-center w-7 h-7 text-sm
                                            ${
                                                day.isToday
                                                    ? "bg-primary text-primary-content rounded-full font-bold"
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
                                            ${
                                                !day.isCurrentMonth
                                                    ? "text-base-content/40"
                                                    : ""
                                            }
                                        `}
                                    >
                                        {day.date.getDate()}
                                    </span>
                                </div>

                                {/* イベントチップ */}
                                <div className="flex flex-col gap-0.5 px-1 pb-1 overflow-hidden flex-1">
                                    {day.events
                                        .slice(0, 2)
                                        .map((event, eventIndex) => {
                                            const time = getEventTime(event);
                                            const title = getEventTitle(event);
                                            return (
                                                <div
                                                    key={eventIndex}
                                                    className="text-xs bg-primary/90 text-primary-content px-1.5 py-0.5 rounded truncate leading-tight"
                                                >
                                                    {time && (
                                                        <span className="font-medium mr-1">
                                                            {time}
                                                        </span>
                                                    )}
                                                    {title}
                                                </div>
                                            );
                                        })}
                                    {day.events.length > 2 && (
                                        <div className="text-xs text-base-content/60 px-1">
                                            +{day.events.length - 2}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
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
