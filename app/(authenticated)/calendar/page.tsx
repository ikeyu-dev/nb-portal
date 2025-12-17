"use client";

import { useEffect, useState } from "react";
import { ScheduleCard } from "@/features/schedule-card";
import type { Absence } from "@/src/shared/types/api";

// イベントカラーの定義
export const EVENT_COLORS = [
    { id: "primary", hex: "#2a83a2", label: "デフォルト" },
    { id: "red", hex: "#d7003a", label: "赤" },
    { id: "green", hex: "#88cb7f", label: "緑" },
    { id: "purple", hex: "#4a488e", label: "紫" },
    { id: "yellow", hex: "#eec362", label: "黄" },
    { id: "brown", hex: "#554738", label: "茶" },
] as const;

export type EventColorId = (typeof EVENT_COLORS)[number]["id"];

// カラーIDからHEX値を取得
const getColorHex = (colorId: string | undefined): string => {
    const color = EVENT_COLORS.find((c) => c.id === colorId);
    return color?.hex || EVENT_COLORS[0].hex;
};

interface Schedule {
    [key: string]: string | number | boolean | Date;
}

interface SelectedDateInfo {
    date: Date;
    dateStr: string;
    events: ScheduleWithPosition[];
}

// 複数日イベントの位置情報
type EventPosition = "single" | "start" | "middle" | "end";

interface ScheduleWithPosition {
    schedule: Schedule;
    position: EventPosition;
    // 週の中での開始位置（0-6）を記録（同じ週で左端から始まるか判定用）
    isWeekStart: boolean;
    // 週の中での終了位置（0-6）を記録（同じ週で右端で終わるか判定用）
    isWeekEnd: boolean;
}

interface EventForm {
    title: string;
    where: string;
    detail: string;
    timeHH: string;
    timeMM: string;
    year: string;
    month: string;
    date: string;
    endYear: string;
    endMonth: string;
    endDate: string;
    isAllDay: boolean;
    color: EventColorId;
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
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [addForm, setAddForm] = useState<EventForm>({
        title: "",
        where: "",
        detail: "",
        timeHH: "",
        timeMM: "",
        year: "",
        month: "",
        date: "",
        endYear: "",
        endMonth: "",
        endDate: "",
        isAllDay: false,
        color: "primary",
    });
    const [editForm, setEditForm] = useState<EventForm>({
        title: "",
        where: "",
        detail: "",
        timeHH: "",
        timeMM: "",
        year: "",
        month: "",
        date: "",
        endYear: "",
        endMonth: "",
        endDate: "",
        isAllDay: false,
        color: "primary",
    });

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
    // 複数日にまたがるイベントは、開始日から終了日までの各日に表示（位置情報付き）
    const activityCounts = new Map<string, number>();
    const eventsByDate = new Map<string, ScheduleWithPosition[]>();
    schedules.forEach((schedule) => {
        const values = Object.values(schedule);
        const startYear = Number(values[1]);
        const startMonth = Number(values[2]);
        const startDay = Number(values[3]);
        // 終了日はインデックス9, 10, 11（END_YYYY, END_MM, END_DD）
        const endYear = values[9] ? Number(values[9]) : 0;
        const endMonth = values[10] ? Number(values[10]) : 0;
        const endDay = values[11] ? Number(values[11]) : 0;

        if (startYear && startMonth && startDay) {
            const startDate = new Date(startYear, startMonth - 1, startDay);
            // 終了日がある場合は複数日、なければ開始日のみ
            const hasEndDate = endYear && endMonth && endDay;
            const endDate = hasEndDate
                ? new Date(endYear, endMonth - 1, endDay)
                : startDate;

            const isMultiDay =
                hasEndDate && startDate.getTime() !== endDate.getTime();

            // 開始日から終了日まで各日にイベントを追加
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateStr = `${currentDate.getFullYear()}-${String(
                    currentDate.getMonth() + 1
                ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(
                    2,
                    "0"
                )}`;
                activityCounts.set(
                    dateStr,
                    (activityCounts.get(dateStr) || 0) + 1
                );

                // 位置情報を計算
                let position: EventPosition = "single";
                if (isMultiDay) {
                    const isStart =
                        currentDate.getTime() === startDate.getTime();
                    const isEnd = currentDate.getTime() === endDate.getTime();
                    if (isStart) {
                        position = "start";
                    } else if (isEnd) {
                        position = "end";
                    } else {
                        position = "middle";
                    }
                }

                // 週の境界を計算（日曜日が週の始まり）
                const dayOfWeek = currentDate.getDay();
                const isWeekStart =
                    dayOfWeek === 0 ||
                    currentDate.getTime() === startDate.getTime();
                const isWeekEnd =
                    dayOfWeek === 6 ||
                    currentDate.getTime() === endDate.getTime();

                const existing = eventsByDate.get(dateStr) || [];
                eventsByDate.set(dateStr, [
                    ...existing,
                    { schedule, position, isWeekStart, isWeekEnd },
                ]);

                // 次の日へ
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    });

    // 日付クリック時のハンドラー
    const handleDateClick = (date: Date, dateStr: string) => {
        const events = eventsByDate.get(dateStr) || [];
        setSelectedDate({ date, dateStr, events });
    };

    // モーダルを閉じる
    const closeModal = () => {
        setSelectedDate(null);
        setSelectedEvent(null);
        setShowAddModal(false);
        setShowEditModal(false);
        setAddForm({
            title: "",
            where: "",
            detail: "",
            timeHH: "",
            timeMM: "",
            year: "",
            month: "",
            date: "",
            endYear: "",
            endMonth: "",
            endDate: "",
            isAllDay: false,
            color: "primary",
        });
        setEditForm({
            title: "",
            where: "",
            detail: "",
            timeHH: "",
            timeMM: "",
            year: "",
            month: "",
            date: "",
            endYear: "",
            endMonth: "",
            endDate: "",
            isAllDay: false,
            color: "primary",
        });
    };

    // 追加モーダルを開く
    const openAddModal = () => {
        setShowAddModal(true);
    };

    // 追加モーダルを閉じる（一覧に戻る）
    const closeAddModal = () => {
        setShowAddModal(false);
        setAddForm({
            title: "",
            where: "",
            detail: "",
            timeHH: "",
            timeMM: "",
            year: "",
            month: "",
            date: "",
            endYear: "",
            endMonth: "",
            endDate: "",
            isAllDay: false,
            color: "primary",
        });
    };

    // イベント追加の送信
    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !addForm.title.trim()) return;

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/schedule", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    year: selectedDate.date.getFullYear(),
                    month: selectedDate.date.getMonth() + 1,
                    date: selectedDate.date.getDate(),
                    timeHH: addForm.timeHH || undefined,
                    timeMM: addForm.timeMM || undefined,
                    title: addForm.title.trim(),
                    where: addForm.where.trim(),
                    detail: addForm.detail.trim(),
                    endYear: addForm.endYear || undefined,
                    endMonth: addForm.endMonth || undefined,
                    endDate: addForm.endDate || undefined,
                    color: addForm.color,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // 新しいスケジュールをローカル状態に追加
                const newSchedule: Schedule = {
                    EVENT_ID: data.data.eventId,
                    YYYY: data.data.year,
                    MM: data.data.month,
                    DD: data.data.date,
                    TIME_HH: data.data.timeHH || "",
                    TIME_MM: data.data.timeMM || "",
                    TITLE: data.data.title,
                    WHERE: data.data.where,
                    DETAIL: data.data.detail,
                    END_YYYY: data.data.endYear || "",
                    END_MM: data.data.endMonth || "",
                    END_DD: data.data.endDate || "",
                    COLOR: data.data.color || "primary",
                };
                setSchedules((prev) => [...prev, newSchedule]);

                // モーダルを閉じる
                closeModal();
            } else {
                setError(data.error || "スケジュールの追加に失敗しました");
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "スケジュールの追加に失敗しました"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // 一覧からイベントを選択
    const handleEventSelect = (event: Schedule) => {
        setSelectedEvent(event);
    };

    // 詳細モーダルを閉じて一覧に戻る
    const closeEventModal = () => {
        setSelectedEvent(null);
    };

    // 編集モーダルを開く
    const openEditModal = () => {
        if (!selectedEvent) return;
        const values = Object.values(selectedEvent);
        const rawTimeHH = values[4];
        const rawTimeMM = values[5];
        // 終了日はインデックス9, 10, 11（END_YYYY, END_MM, END_DD）
        const rawEndYear = values[9];
        const rawEndMonth = values[10];
        const rawEndDate = values[11];

        // 終日判定: 時刻がなく、終了日がある場合は終日
        const hasTime =
            rawTimeHH !== "" && rawTimeHH !== null && rawTimeHH !== undefined;
        const hasEndDate =
            rawEndYear !== "" &&
            rawEndYear !== null &&
            rawEndYear !== undefined;
        const isAllDay = !hasTime && hasEndDate;

        setEditForm({
            title: String(values[6] ?? ""),
            where: String(values[7] ?? ""),
            detail: String(values[8] ?? ""),
            timeHH:
                rawTimeHH !== "" &&
                rawTimeHH !== null &&
                rawTimeHH !== undefined
                    ? String(rawTimeHH)
                    : "",
            timeMM:
                rawTimeMM !== "" &&
                rawTimeMM !== null &&
                rawTimeMM !== undefined
                    ? String(rawTimeMM)
                    : "",
            year: String(values[1] ?? ""),
            month: String(values[2] ?? ""),
            date: String(values[3] ?? ""),
            endYear:
                rawEndYear !== "" &&
                rawEndYear !== null &&
                rawEndYear !== undefined
                    ? String(rawEndYear)
                    : "",
            endMonth:
                rawEndMonth !== "" &&
                rawEndMonth !== null &&
                rawEndMonth !== undefined
                    ? String(rawEndMonth)
                    : "",
            endDate:
                rawEndDate !== "" &&
                rawEndDate !== null &&
                rawEndDate !== undefined
                    ? String(rawEndDate)
                    : "",
            isAllDay,
            color: (values[12] as EventColorId) || "primary",
        });
        setShowEditModal(true);
    };

    // 編集モーダルを閉じる
    const closeEditModal = () => {
        setShowEditModal(false);
        setShowDeleteConfirm(false);
        setEditForm({
            title: "",
            where: "",
            detail: "",
            timeHH: "",
            timeMM: "",
            year: "",
            month: "",
            date: "",
            endYear: "",
            endMonth: "",
            endDate: "",
            isAllDay: false,
            color: "primary",
        });
    };

    // イベント削除の処理
    const handleDeleteSubmit = async () => {
        if (!selectedEvent) return;

        setIsDeleting(true);
        try {
            const values = Object.values(selectedEvent);
            const eventId = String(values[0]);

            const response = await fetch("/api/schedule", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ eventId }),
            });

            const data = await response.json();

            if (data.success) {
                // ローカル状態から削除
                setSchedules((prev) =>
                    prev.filter((schedule) => {
                        const scheduleValues = Object.values(schedule);
                        return String(scheduleValues[0]) !== eventId;
                    })
                );

                // モーダルを閉じる
                closeEditModal();
                closeModal();
            } else {
                setError(data.error || "スケジュールの削除に失敗しました");
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "スケジュールの削除に失敗しました"
            );
        } finally {
            setIsDeleting(false);
        }
    };

    // イベント編集の送信
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEvent || !editForm.title.trim()) return;

        setIsSubmitting(true);
        try {
            const values = Object.values(selectedEvent);
            const eventId = String(values[0]);

            const response = await fetch("/api/schedule", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventId,
                    year: Number(editForm.year),
                    month: Number(editForm.month),
                    date: Number(editForm.date),
                    timeHH: editForm.timeHH || undefined,
                    timeMM: editForm.timeMM || undefined,
                    title: editForm.title.trim(),
                    where: editForm.where.trim(),
                    detail: editForm.detail.trim(),
                    endYear: editForm.endYear || undefined,
                    endMonth: editForm.endMonth || undefined,
                    endDate: editForm.endDate || undefined,
                    color: editForm.color,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // ローカル状態を更新
                setSchedules((prev) =>
                    prev.map((schedule) => {
                        const scheduleValues = Object.values(schedule);
                        if (String(scheduleValues[0]) === eventId) {
                            return {
                                ...schedule,
                                YYYY: data.data.year,
                                MM: data.data.month,
                                DD: data.data.date,
                                TITLE: data.data.title,
                                WHERE: data.data.where,
                                DETAIL: data.data.detail,
                                TIME_HH: data.data.timeHH || "",
                                TIME_MM: data.data.timeMM || "",
                                END_YYYY: data.data.endYear || "",
                                END_MM: data.data.endMonth || "",
                                END_DD: data.data.endDate || "",
                                COLOR: data.data.color || "primary",
                            };
                        }
                        return schedule;
                    })
                );

                // 編集モーダルと詳細モーダルを閉じる（日付が変わった可能性があるため）
                closeEditModal();
                closeModal();
            } else {
                setError(data.error || "スケジュールの更新に失敗しました");
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "スケジュールの更新に失敗しました"
            );
        } finally {
            setIsSubmitting(false);
        }
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
            events: ScheduleWithPosition[];
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
    const getEventTitle = (schedule: Schedule): string => {
        const values = Object.values(schedule);
        return String(values[6] ?? "予定");
    };

    // イベントの時刻を取得
    const getEventTime = (schedule: Schedule): string | null => {
        const values = Object.values(schedule);
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
                            const rowIndex = Math.floor(index / 7);
                            const isLastRow = rowIndex === 5;
                            const colIndex = index % 7;

                            return (
                                <div
                                    key={index}
                                    onClick={() =>
                                        handleDateClick(day.date, day.dateStr)
                                    }
                                    className={`
                                        relative flex flex-col border-r border-b border-base-300 cursor-pointer active:bg-base-200/50 overflow-visible
                                        ${isLastRow ? "border-b-0" : ""}
                                        ${colIndex === 6 ? "border-r-0" : ""}
                                        ${
                                            !day.isCurrentMonth
                                                ? "bg-base-200/30"
                                                : "bg-base-100"
                                        }
                                    `}
                                    style={{ zIndex: 1 }}
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
                                    <div className="relative flex-1">
                                        {day.events
                                            .slice(0, 3)
                                            .map((eventWithPos, eventIndex) => {
                                                const title = getEventTitle(
                                                    eventWithPos.schedule
                                                );
                                                const {
                                                    position,
                                                    isWeekStart,
                                                    isWeekEnd,
                                                } = eventWithPos;
                                                const isMultiDay =
                                                    position !== "single";

                                                // イベントの色を取得
                                                const eventColor = getColorHex(
                                                    String(
                                                        Object.values(
                                                            eventWithPos.schedule
                                                        )[12] || "primary"
                                                    )
                                                );

                                                // 複数日イベントの場合、セルの境界を越えて表示
                                                const leftStyle =
                                                    isMultiDay && !isWeekStart
                                                        ? "-1px"
                                                        : "2px";
                                                const rightStyle =
                                                    isMultiDay && !isWeekEnd
                                                        ? "-1px"
                                                        : "2px";
                                                const topOffset =
                                                    eventIndex * 16; // 各イベントの高さ + gap

                                                return (
                                                    <div
                                                        key={eventIndex}
                                                        className={`absolute text-[9px] leading-tight text-white py-0.5 truncate ${
                                                            isMultiDay
                                                                ? `${
                                                                      isWeekStart
                                                                          ? "rounded-l"
                                                                          : ""
                                                                  } ${
                                                                      isWeekEnd
                                                                          ? "rounded-r"
                                                                          : ""
                                                                  }`
                                                                : "rounded"
                                                        }`}
                                                        style={{
                                                            top: `${topOffset}px`,
                                                            left: leftStyle,
                                                            right: rightStyle,
                                                            zIndex: 10,
                                                            paddingLeft:
                                                                isWeekStart
                                                                    ? "4px"
                                                                    : "1px",
                                                            paddingRight:
                                                                isWeekEnd
                                                                    ? "4px"
                                                                    : "1px",
                                                            backgroundColor:
                                                                eventColor,
                                                        }}
                                                    >
                                                        {isWeekStart
                                                            ? title
                                                            : "\u00A0"}
                                                    </div>
                                                );
                                            })}
                                        {day.events.length > 3 && (
                                            <div
                                                className="absolute text-[9px] text-base-content/60 px-0.5"
                                                style={{
                                                    top: "48px",
                                                    left: "2px",
                                                }}
                                            >
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
                        const rowIndex = Math.floor(index / 7);
                        const isLastRow = rowIndex === 5;
                        const colIndex = index % 7;

                        return (
                            <div
                                key={index}
                                onClick={() =>
                                    handleDateClick(day.date, day.dateStr)
                                }
                                className={`
                                    relative flex flex-col border-r border-b border-base-300 last:border-r-0 cursor-pointer hover:bg-base-200/50 overflow-visible
                                    ${isLastRow ? "border-b-0" : ""}
                                    ${colIndex === 6 ? "border-r-0" : ""}
                                    ${
                                        !day.isCurrentMonth
                                            ? "bg-base-200/30"
                                            : "bg-base-100"
                                    }
                                `}
                                style={{ zIndex: 1 }}
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
                                <div className="relative flex-1">
                                    {day.events
                                        .slice(0, 2)
                                        .map((eventWithPos, eventIndex) => {
                                            const time = getEventTime(
                                                eventWithPos.schedule
                                            );
                                            const title = getEventTitle(
                                                eventWithPos.schedule
                                            );
                                            const {
                                                position,
                                                isWeekStart,
                                                isWeekEnd,
                                            } = eventWithPos;
                                            const isMultiDay =
                                                position !== "single";

                                            // イベントの色を取得
                                            const eventColor = getColorHex(
                                                String(
                                                    Object.values(
                                                        eventWithPos.schedule
                                                    )[12] || "primary"
                                                )
                                            );

                                            // 複数日イベントの場合、セルの境界を越えて表示
                                            // left: 開始日は4px、それ以外は-1px（境界線を越える）
                                            // right: 終了日は4px、それ以外は-1px（境界線を越える）
                                            const leftStyle =
                                                isMultiDay && !isWeekStart
                                                    ? "-1px"
                                                    : "4px";
                                            const rightStyle =
                                                isMultiDay && !isWeekEnd
                                                    ? "-1px"
                                                    : "4px";
                                            const topOffset = eventIndex * 22; // 各イベントの高さ + gap

                                            return (
                                                <div
                                                    key={eventIndex}
                                                    className={`absolute text-xs text-white py-0.5 truncate leading-tight ${
                                                        isMultiDay
                                                            ? `${
                                                                  isWeekStart
                                                                      ? "rounded-l"
                                                                      : ""
                                                              } ${
                                                                  isWeekEnd
                                                                      ? "rounded-r"
                                                                      : ""
                                                              }`
                                                            : "rounded"
                                                    }`}
                                                    style={{
                                                        top: `${topOffset}px`,
                                                        left: leftStyle,
                                                        right: rightStyle,
                                                        zIndex: 10,
                                                        paddingLeft: isWeekStart
                                                            ? "6px"
                                                            : "2px",
                                                        paddingRight: isWeekEnd
                                                            ? "6px"
                                                            : "2px",
                                                        backgroundColor:
                                                            eventColor,
                                                    }}
                                                >
                                                    {isWeekStart && time && (
                                                        <span className="font-medium mr-1">
                                                            {time}
                                                        </span>
                                                    )}
                                                    {isWeekStart
                                                        ? title
                                                        : "\u00A0"}
                                                </div>
                                            );
                                        })}
                                    {day.events.length > 2 && (
                                        <div
                                            className="absolute text-xs text-base-content/60 px-1"
                                            style={{ top: "44px", left: "4px" }}
                                        >
                                            +{day.events.length - 2}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* イベント一覧モーダル */}
            {selectedDate && !selectedEvent && !showAddModal && (
                <dialog className="modal modal-open modal-middle">
                    <div className="modal-box max-w-2xl max-h-[calc(100vh-5rem)] flex flex-col">
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
                        <div className="flex-1 overflow-y-auto">
                            {selectedDate.events.length === 0 ? (
                                <div className="text-center py-8 text-base-content/60">
                                    この日の予定はありません
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDate.events.map(
                                        (eventWithPos, index) => {
                                            const { schedule, position } =
                                                eventWithPos;
                                            const values =
                                                Object.values(schedule);
                                            const startYear = Number(values[1]);
                                            const startMonth = Number(
                                                values[2]
                                            );
                                            const startDay = Number(values[3]);
                                            const rawTimeHH = values[4];
                                            const rawTimeMM = values[5];
                                            const title = String(
                                                values[6] ?? "予定"
                                            );
                                            const where = String(
                                                values[7] ?? ""
                                            );
                                            const endYear = values[9]
                                                ? Number(values[9])
                                                : 0;
                                            const endMonth = values[10]
                                                ? Number(values[10])
                                                : 0;
                                            const endDay = values[11]
                                                ? Number(values[11])
                                                : 0;

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
                                                  )}:${String(
                                                      rawTimeMM
                                                  ).padStart(2, "0")}`
                                                : null;

                                            // 複数日イベントの期間表示
                                            const isMultiDay =
                                                position !== "single";
                                            const dateRangeLabel =
                                                isMultiDay &&
                                                endYear &&
                                                endMonth &&
                                                endDay
                                                    ? `${startYear}年 ${startMonth}月 ${startDay}日 〜 ${endYear}年 ${endMonth}月 ${endDay}日`
                                                    : null;

                                            // イベントの色を取得
                                            const eventColor = getColorHex(
                                                String(values[12] || "primary")
                                            );

                                            return (
                                                <div
                                                    key={index}
                                                    onClick={() =>
                                                        handleEventSelect(
                                                            schedule
                                                        )
                                                    }
                                                    className="p-4 bg-base-100 rounded-xl border-l-4 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:bg-base-200/50"
                                                    style={{
                                                        borderLeftColor:
                                                            eventColor,
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-3 h-3 rounded-full shrink-0"
                                                            style={{
                                                                backgroundColor:
                                                                    eventColor,
                                                            }}
                                                        ></div>
                                                        <div className="flex-1">
                                                            <div className="font-bold text-lg flex items-center gap-2">
                                                                {title}
                                                                {timeLabel && (
                                                                    <span className="text-sm font-normal text-base-content/70">
                                                                        {
                                                                            timeLabel
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {dateRangeLabel && (
                                                                <div className="text-sm text-base-content/70 mt-1">
                                                                    {
                                                                        dateRangeLabel
                                                                    }
                                                                </div>
                                                            )}
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
                                        }
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-action justify-end mt-4">
                            <button
                                onClick={openAddModal}
                                className="btn btn-primary"
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
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                追加
                            </button>
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

            {/* イベント追加モーダル */}
            {selectedDate && showAddModal && (
                <dialog className="modal modal-open modal-middle">
                    <div className="modal-box max-w-md">
                        <button
                            onClick={closeAddModal}
                            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        >
                            ✕
                        </button>
                        <h3 className="font-bold text-xl mb-4">
                            {selectedDate.date.getFullYear()}年
                            {selectedDate.date.getMonth() + 1}月
                            {selectedDate.date.getDate()}日に予定を追加
                        </h3>
                        <form
                            onSubmit={handleAddSubmit}
                            className="space-y-4"
                        >
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        タイトル{" "}
                                        <span className="text-error">*</span>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="予定のタイトル"
                                    className="input input-bordered w-full"
                                    value={addForm.title}
                                    onChange={(e) =>
                                        setAddForm({
                                            ...addForm,
                                            title: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="form-control">
                                <label className="label cursor-pointer justify-start gap-3">
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary"
                                        checked={addForm.isAllDay}
                                        onChange={(e) =>
                                            setAddForm({
                                                ...addForm,
                                                isAllDay: e.target.checked,
                                                // 終日をオンにしたら時刻をクリア
                                                timeHH: e.target.checked
                                                    ? ""
                                                    : addForm.timeHH,
                                                timeMM: e.target.checked
                                                    ? ""
                                                    : addForm.timeMM,
                                            })
                                        }
                                    />
                                    <span className="label-text">終日</span>
                                </label>
                            </div>
                            {addForm.isAllDay ? (
                                <>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text">
                                                開始日
                                            </span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base-content/70">
                                                {selectedDate.date.getFullYear()}
                                                年
                                                {selectedDate.date.getMonth() +
                                                    1}
                                                月{selectedDate.date.getDate()}
                                                日
                                            </span>
                                        </div>
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text">
                                                終了日{" "}
                                                <span className="text-error">
                                                    *
                                                </span>
                                            </span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                placeholder="年"
                                                min="2020"
                                                max="2100"
                                                className="input input-bordered w-24"
                                                value={addForm.endYear}
                                                onChange={(e) =>
                                                    setAddForm({
                                                        ...addForm,
                                                        endYear: e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                            <span>年</span>
                                            <input
                                                type="number"
                                                placeholder="月"
                                                min="1"
                                                max="12"
                                                className="input input-bordered w-20"
                                                value={addForm.endMonth}
                                                onChange={(e) =>
                                                    setAddForm({
                                                        ...addForm,
                                                        endMonth:
                                                            e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                            <span>月</span>
                                            <input
                                                type="number"
                                                placeholder="日"
                                                min="1"
                                                max="31"
                                                className="input input-bordered w-20"
                                                value={addForm.endDate}
                                                onChange={(e) =>
                                                    setAddForm({
                                                        ...addForm,
                                                        endDate: e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                            <span>日</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">時刻</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder="時"
                                            min="0"
                                            max="23"
                                            className="input input-bordered w-20"
                                            value={addForm.timeHH}
                                            onChange={(e) =>
                                                setAddForm({
                                                    ...addForm,
                                                    timeHH: e.target.value,
                                                })
                                            }
                                        />
                                        <span>:</span>
                                        <input
                                            type="number"
                                            placeholder="分"
                                            min="0"
                                            max="59"
                                            className="input input-bordered w-20"
                                            value={addForm.timeMM}
                                            onChange={(e) =>
                                                setAddForm({
                                                    ...addForm,
                                                    timeMM: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">場所</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="場所"
                                    className="input input-bordered w-full"
                                    value={addForm.where}
                                    onChange={(e) =>
                                        setAddForm({
                                            ...addForm,
                                            where: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">詳細</span>
                                </label>
                                <textarea
                                    placeholder="詳細"
                                    className="textarea textarea-bordered w-full"
                                    rows={3}
                                    value={addForm.detail}
                                    onChange={(e) =>
                                        setAddForm({
                                            ...addForm,
                                            detail: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">カラー</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {EVENT_COLORS.map((color) => (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() =>
                                                setAddForm({
                                                    ...addForm,
                                                    color: color.id,
                                                })
                                            }
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                                                addForm.color === color.id
                                                    ? "border-base-content scale-110"
                                                    : "border-transparent hover:scale-105"
                                            }`}
                                            style={{
                                                backgroundColor: color.hex,
                                            }}
                                            title={color.label}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={closeAddModal}
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={
                                        isSubmitting || !addForm.title.trim()
                                    }
                                >
                                    {isSubmitting ? (
                                        <span className="loading loading-spinner loading-sm"></span>
                                    ) : (
                                        "追加"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <form
                        method="dialog"
                        className="modal-backdrop"
                    >
                        <button onClick={closeAddModal}>close</button>
                    </form>
                </dialog>
            )}

            {/* 選択されたイベントの詳細モーダル */}
            {selectedDate &&
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
                            onEdit={openEditModal}
                            hideCard={true}
                        />
                    );
                })()}

            {/* イベント編集モーダル */}
            {selectedEvent && showEditModal && (
                <dialog className="modal modal-open modal-middle">
                    <div className="modal-box max-w-md">
                        <button
                            onClick={closeEditModal}
                            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        >
                            ✕
                        </button>
                        <h3 className="font-bold text-xl mb-4">予定を編集</h3>
                        <form
                            onSubmit={handleEditSubmit}
                            className="space-y-4"
                        >
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        タイトル{" "}
                                        <span className="text-error">*</span>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="予定のタイトル"
                                    className="input input-bordered w-full"
                                    value={editForm.title}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            title: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="form-control">
                                <label className="label cursor-pointer justify-start gap-3">
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary"
                                        checked={editForm.isAllDay}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                isAllDay: e.target.checked,
                                                // 終日をオンにしたら時刻をクリア
                                                timeHH: e.target.checked
                                                    ? ""
                                                    : editForm.timeHH,
                                                timeMM: e.target.checked
                                                    ? ""
                                                    : editForm.timeMM,
                                            })
                                        }
                                    />
                                    <span className="label-text">終日</span>
                                </label>
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        {editForm.isAllDay ? "開始日" : "日付"}{" "}
                                        <span className="text-error">*</span>
                                    </span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="年"
                                        min="2020"
                                        max="2100"
                                        className="input input-bordered w-24"
                                        value={editForm.year}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                year: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <span>年</span>
                                    <input
                                        type="number"
                                        placeholder="月"
                                        min="1"
                                        max="12"
                                        className="input input-bordered w-20"
                                        value={editForm.month}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                month: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <span>月</span>
                                    <input
                                        type="number"
                                        placeholder="日"
                                        min="1"
                                        max="31"
                                        className="input input-bordered w-20"
                                        value={editForm.date}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                date: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <span>日</span>
                                </div>
                            </div>
                            {editForm.isAllDay ? (
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">
                                            終了日{" "}
                                            <span className="text-error">
                                                *
                                            </span>
                                        </span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder="年"
                                            min="2020"
                                            max="2100"
                                            className="input input-bordered w-24"
                                            value={editForm.endYear}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    endYear: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                        <span>年</span>
                                        <input
                                            type="number"
                                            placeholder="月"
                                            min="1"
                                            max="12"
                                            className="input input-bordered w-20"
                                            value={editForm.endMonth}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    endMonth: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                        <span>月</span>
                                        <input
                                            type="number"
                                            placeholder="日"
                                            min="1"
                                            max="31"
                                            className="input input-bordered w-20"
                                            value={editForm.endDate}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    endDate: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                        <span>日</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">時刻</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder="時"
                                            min="0"
                                            max="23"
                                            className="input input-bordered w-20"
                                            value={editForm.timeHH}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    timeHH: e.target.value,
                                                })
                                            }
                                        />
                                        <span>:</span>
                                        <input
                                            type="number"
                                            placeholder="分"
                                            min="0"
                                            max="59"
                                            className="input input-bordered w-20"
                                            value={editForm.timeMM}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    timeMM: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">場所</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="場所"
                                    className="input input-bordered w-full"
                                    value={editForm.where}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            where: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">詳細</span>
                                </label>
                                <textarea
                                    placeholder="詳細"
                                    className="textarea textarea-bordered w-full"
                                    rows={3}
                                    value={editForm.detail}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            detail: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">カラー</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {EVENT_COLORS.map((color) => (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() =>
                                                setEditForm({
                                                    ...editForm,
                                                    color: color.id,
                                                })
                                            }
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                                                editForm.color === color.id
                                                    ? "border-base-content scale-110"
                                                    : "border-transparent hover:scale-105"
                                            }`}
                                            style={{
                                                backgroundColor: color.hex,
                                            }}
                                            title={color.label}
                                        />
                                    ))}
                                </div>
                            </div>
                            {/* 削除確認 */}
                            {showDeleteConfirm ? (
                                <div className="bg-error/10 border border-error rounded-lg p-4">
                                    <p className="text-sm text-error mb-3">
                                        この予定を削除しますか？この操作は取り消せません。
                                    </p>
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-ghost"
                                            onClick={() =>
                                                setShowDeleteConfirm(false)
                                            }
                                        >
                                            キャンセル
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-error"
                                            onClick={handleDeleteSubmit}
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? (
                                                <span className="loading loading-spinner loading-sm"></span>
                                            ) : (
                                                "削除する"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="modal-action justify-between">
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-error"
                                        onClick={() =>
                                            setShowDeleteConfirm(true)
                                        }
                                    >
                                        削除
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-ghost"
                                            onClick={closeEditModal}
                                        >
                                            キャンセル
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={
                                                isSubmitting ||
                                                !editForm.title.trim()
                                            }
                                        >
                                            {isSubmitting ? (
                                                <span className="loading loading-spinner loading-sm"></span>
                                            ) : (
                                                "保存"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                    <form
                        method="dialog"
                        className="modal-backdrop"
                    >
                        <button onClick={closeEditModal}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
