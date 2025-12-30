"use client";

import { useState, useRef, useEffect } from "react";

const EVENT_COLORS = [
    { id: "primary", hex: "#2a83a2", label: "デフォルト" },
    { id: "red", hex: "#d7003a", label: "赤" },
    { id: "green", hex: "#88cb7f", label: "緑" },
    { id: "purple", hex: "#4a488e", label: "紫" },
    { id: "yellow", hex: "#eec362", label: "黄" },
    { id: "brown", hex: "#554738", label: "茶" },
] as const;

type EventColorId = (typeof EVENT_COLORS)[number]["id"];

interface DemoEvent {
    id: string;
    title: string;
    date: Date;
    color: EventColorId;
}

const DEMO_EVENTS: DemoEvent[] = [
    {
        id: "1",
        title: "定期練習",
        date: new Date(2024, 11, 15),
        color: "primary",
    },
    {
        id: "2",
        title: "ミーティング",
        date: new Date(2024, 11, 20),
        color: "green",
    },
    { id: "3", title: "本番", date: new Date(2024, 11, 25), color: "red" },
];

/**
 * カレンダーのデモコンポーネント
 */
export function DemoCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date(2024, 11, 1));
    const [events, setEvents] = useState<DemoEvent[]>(DEMO_EVENTS);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({
        title: "",
        color: "primary" as EventColorId,
    });

    const addModalRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (showAddModal) {
            addModalRef.current?.showModal();
        } else {
            addModalRef.current?.close();
        }
    }, [showAddModal]);

    const changeMonth = (delta: number) => {
        setCurrentDate((prev) => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };

    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDayOfMonth.getDay();

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false,
            });
        }

        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            days.push({
                date: new Date(year, month, day),
                isCurrentMonth: true,
            });
        }

        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            days.push({
                date: new Date(year, month + 1, day),
                isCurrentMonth: false,
            });
        }

        return days;
    };

    const getEventsForDate = (date: Date) => {
        return events.filter(
            (event) =>
                event.date.getFullYear() === date.getFullYear() &&
                event.date.getMonth() === date.getMonth() &&
                event.date.getDate() === date.getDate()
        );
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setShowAddModal(true);
    };

    const handleAdd = () => {
        if (!selectedDate || !addForm.title.trim()) return;

        const newEvent: DemoEvent = {
            id: String(Date.now()),
            title: addForm.title,
            date: selectedDate,
            color: addForm.color,
        };

        setEvents([...events, newEvent]);
        setShowAddModal(false);
        setSelectedDate(null);
        setAddForm({ title: "", color: "primary" });
    };

    const closeModal = () => {
        setShowAddModal(false);
        setSelectedDate(null);
        setAddForm({ title: "", color: "primary" });
    };

    const days = generateCalendarDays();
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

    return (
        <div className="space-y-4">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        className="btn btn-ghost btn-xs btn-circle"
                        onClick={() => changeMonth(-1)}
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
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <span className="font-medium text-sm min-w-[100px] text-center">
                        {currentDate.getFullYear()}年
                        {currentDate.getMonth() + 1}月
                    </span>
                    <button
                        className="btn btn-ghost btn-xs btn-circle"
                        onClick={() => changeMonth(1)}
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
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>
                </div>
                <button
                    className="btn btn-ghost btn-xs text-primary"
                    onClick={() => setCurrentDate(new Date())}
                >
                    今日
                </button>
            </div>

            {/* カレンダーグリッド */}
            <div className="border border-base-300 rounded-lg overflow-hidden">
                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 border-b border-base-300">
                    {weekDays.map((day, index) => (
                        <div
                            key={day}
                            className={`text-center text-xs py-1 font-medium ${
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

                {/* カレンダー本体 */}
                <div className="grid grid-cols-7">
                    {days.map((day, index) => {
                        const dayEvents = getEventsForDate(day.date);
                        const dayOfWeek = day.date.getDay();
                        const isToday =
                            day.date.toDateString() ===
                            new Date().toDateString();

                        return (
                            <div
                                key={index}
                                onClick={() => handleDateClick(day.date)}
                                className={`
                                    relative h-16 border-r border-b border-base-300 cursor-pointer hover:bg-base-200/50
                                    ${!day.isCurrentMonth ? "bg-base-200/30" : "bg-base-100"}
                                `}
                            >
                                <div className="p-1">
                                    <span
                                        className={`
                                            inline-flex items-center justify-center w-5 h-5 text-xs
                                            ${isToday ? "bg-primary text-primary-content rounded-full font-bold" : ""}
                                            ${!isToday && day.isCurrentMonth && dayOfWeek === 0 ? "text-error" : ""}
                                            ${!isToday && day.isCurrentMonth && dayOfWeek === 6 ? "text-info" : ""}
                                            ${!day.isCurrentMonth ? "text-base-content/30" : ""}
                                        `}
                                    >
                                        {day.date.getDate()}
                                    </span>
                                </div>
                                <div className="px-1 space-y-0.5">
                                    {dayEvents.slice(0, 2).map((event) => (
                                        <div
                                            key={event.id}
                                            className="text-[8px] text-white px-1 py-0.5 rounded truncate"
                                            style={{
                                                backgroundColor:
                                                    EVENT_COLORS.find(
                                                        (c) =>
                                                            c.id === event.color
                                                    )?.hex ||
                                                    EVENT_COLORS[0].hex,
                                            }}
                                        >
                                            {event.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 2 && (
                                        <div className="text-[8px] text-base-content/60">
                                            +{dayEvents.length - 2}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 追加モーダル */}
            <dialog
                ref={addModalRef}
                className="modal"
                onClose={closeModal}
            >
                <div className="modal-box">
                    <button
                        onClick={closeModal}
                        className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    >
                        ✕
                    </button>
                    <h3 className="font-bold text-lg mb-4">
                        {selectedDate &&
                            `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日に予定を追加`}
                    </h3>

                    <div className="form-control mb-4">
                        <label className="label">
                            <span className="label-text">
                                タイトル <span className="text-error">*</span>
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
                        />
                    </div>

                    <div className="form-control mb-4">
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
                                    style={{ backgroundColor: color.hex }}
                                    title={color.label}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="modal-action">
                        <button
                            className="btn btn-ghost"
                            onClick={closeModal}
                        >
                            キャンセル
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleAdd}
                            disabled={!addForm.title.trim()}
                        >
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

            <p className="text-xs text-base-content/50 text-center">
                これはデモ表示です。実際のカレンダーとは異なります。
            </p>
        </div>
    );
}
