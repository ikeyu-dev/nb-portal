"use client";

import { useMemo, useState } from "react";
import {
    NEXT_MEETING_MODE_LABELS,
    NEXT_MEETING_MODES,
    type MemberPermission,
    type NextMeetingMode,
    type NextMeetingSettings,
} from "@/src/shared/types/api";
import { announceNextMeeting, updateNextMeeting } from "@/src/shared/api";

const canManageNextMeeting = (permission?: MemberPermission) =>
    permission === "HEAD" || permission === "SUB_HEAD";

const formatNextMeeting = (meeting: NextMeetingSettings | null): string => {
    if (!meeting) return "未設定";

    const date = new Date(`${meeting.date}T00:00:00`);
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    return `${meeting.date.replaceAll("-", "/")}(${weekday}) ${meeting.time} ${NEXT_MEETING_MODE_LABELS[meeting.mode]}`;
};

const formatUpdatedAt = (updatedAt: string): string => {
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return updatedAt;

    const parts = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(date);
    const value = (type: string) =>
        parts.find((part) => part.type === type)?.value || "";

    return `${value("year")}/${value("month")}/${value("day")} ${value("hour")}:${value("minute")}:${value("second")}`;
};

interface NextMeetingCardProps {
    initialMeeting: NextMeetingSettings | null;
    permission?: MemberPermission;
    className?: string;
}

export function NextMeetingCard({
    initialMeeting,
    permission,
    className = "",
}: NextMeetingCardProps) {
    const [meeting, setMeeting] = useState(initialMeeting);
    const [date, setDate] = useState(initialMeeting?.date || "");
    const [time, setTime] = useState(initialMeeting?.time || "21:00");
    const [mode, setMode] = useState<NextMeetingMode>(
        initialMeeting?.mode || "DISCORD"
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnnouncing, setIsAnnouncing] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const canManage = useMemo(
        () => canManageNextMeeting(permission),
        [permission]
    );

    const openEditor = () => {
        setDate(meeting?.date || "");
        setTime(meeting?.time || "21:00");
        setMode(meeting?.mode || "DISCORD");
        setError(null);
        setSuccessMessage(null);
        setIsEditorOpen(true);
    };

    const closeEditor = () => {
        if (isSubmitting) return;
        setIsEditorOpen(false);
        setError(null);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!date || !time) {
            setError("日付と時刻を入力してください");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await updateNextMeeting({ date, time, mode });
            if (!result.success || !result.data) {
                setError(result.error || "次回部会の更新に失敗しました");
                return;
            }

            setMeeting(result.data);
            setSuccessMessage("次回部会を更新しました");
            setIsEditorOpen(false);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "次回部会の更新に失敗しました"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAnnounce = async () => {
        setError(null);
        setSuccessMessage(null);

        setIsAnnouncing(true);
        try {
            await announceNextMeeting();
            setSuccessMessage("次回部会連絡をDiscordに送信しました");
        } catch (announceError) {
            setError(
                announceError instanceof Error
                    ? announceError.message
                    : "次回部会連絡の送信に失敗しました"
            );
        } finally {
            setIsAnnouncing(false);
        }
    };

    return (
        <div
            className={`card bg-base-100 shadow-xl border border-base-300 ${className}`}
        >
            <div className="card-body gap-4 p-5 pb-4">
                <div className="flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    <h2
                        className="card-title"
                        style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)" }}
                    >
                        次回部会
                    </h2>
                </div>

                <div className="rounded-lg border border-base-300 bg-base-50 px-4 py-3">
                    <div className="flex items-stretch gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-base-content/60 mb-1">
                                予定
                            </p>
                            <p className="truncate font-medium">
                                {formatNextMeeting(meeting)}
                            </p>
                            {meeting?.updatedAt && (
                                <p className="text-xs text-base-content/50 mt-2">
                                    更新: {formatUpdatedAt(meeting.updatedAt)}
                                    {meeting.updatedByName || meeting.updatedBy
                                        ? ` / ${meeting.updatedByName || meeting.updatedBy}`
                                        : ""}
                                </p>
                            )}
                        </div>
                        {canManage && (
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm gap-2"
                                    onClick={openEditor}
                                    disabled={isAnnouncing}
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
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                    </svg>
                                    編集
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm gap-2"
                                    onClick={handleAnnounce}
                                    disabled={isAnnouncing}
                                >
                                    {isAnnouncing ? (
                                        <span className="loading loading-spinner loading-xs" />
                                    ) : (
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
                                                d="M22 2L11 13"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M22 2L15 22L11 13L2 9L22 2Z"
                                            />
                                        </svg>
                                    )}
                                    送信
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {successMessage && (
                    <p className="text-sm text-success">{successMessage}</p>
                )}
            </div>

            {isEditorOpen && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4">
                            次回部会を編集
                        </h3>

                        <form
                            onSubmit={handleSubmit}
                            className="grid grid-cols-1 gap-4"
                        >
                            <label className="form-control">
                                <span className="label-text text-sm">日付</span>
                                <input
                                    type="date"
                                    className="input input-bordered w-full"
                                    value={date}
                                    onChange={(event) =>
                                        setDate(event.target.value)
                                    }
                                    required
                                />
                            </label>

                            <label className="form-control">
                                <span className="label-text text-sm">時刻</span>
                                <input
                                    type="time"
                                    className="input input-bordered w-full"
                                    value={time}
                                    onChange={(event) =>
                                        setTime(event.target.value)
                                    }
                                    required
                                />
                            </label>

                            <label className="form-control">
                                <span className="label-text text-sm">
                                    開催形式
                                </span>
                                <select
                                    className="select select-bordered w-full"
                                    value={mode}
                                    onChange={(event) =>
                                        setMode(
                                            event.target.value as NextMeetingMode
                                        )
                                    }
                                >
                                    {NEXT_MEETING_MODES.map((meetingMode) => (
                                        <option
                                            key={meetingMode}
                                            value={meetingMode}
                                        >
                                            {
                                                NEXT_MEETING_MODE_LABELS[
                                                    meetingMode
                                                ]
                                            }
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {error && (
                                <div className="alert alert-error">{error}</div>
                            )}

                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={closeEditor}
                                    disabled={isSubmitting}
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && (
                                        <span className="loading loading-spinner loading-sm" />
                                    )}
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                    <form
                        method="dialog"
                        className="modal-backdrop"
                        onSubmit={closeEditor}
                    >
                        <button type="submit">close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
