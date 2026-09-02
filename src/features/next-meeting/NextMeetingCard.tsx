"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendarDays,
    faPaperPlane,
    faPen,
} from "@fortawesome/free-solid-svg-icons";
import {
    NEXT_MEETING_MODE_LABELS,
    NEXT_MEETING_MODES,
    type MemberPermission,
    type NextMeetingMode,
    type NextMeetingSettings,
} from "@/src/shared/types/api";
import { announceNextMeeting, updateNextMeeting } from "@/src/shared/api";
import { useUrlModal } from "@/src/shared/lib/use-url-modal";
import { parseDateInput } from "@/src/shared/lib/jst-date";
import { AppModal } from "@/src/shared/ui/AppModal";
import { AsyncButton } from "@/src/shared/ui/AsyncButton";

const canManageNextMeeting = (permission?: MemberPermission) =>
    permission === "HEAD" || permission === "SUB_HEAD" || permission === "ACCOUNTANT";

const formatNextMeeting = (meeting: NextMeetingSettings | null): string => {
    if (!meeting) return "未設定";

    const date = parseDateInput(meeting.date);
    if (!date) return `${meeting.date.replaceAll("-", "/")} ${meeting.time} ${NEXT_MEETING_MODE_LABELS[meeting.mode]}`;
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
    const { modal, openModal, closeModal } = useUrlModal();
    const [meeting, setMeeting] = useState(initialMeeting);
    const [date, setDate] = useState(initialMeeting?.date || "");
    const [time, setTime] = useState(initialMeeting?.time || "21:00");
    const [mode, setMode] = useState<NextMeetingMode>(
        initialMeeting?.mode || "DISCORD"
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnnouncing, setIsAnnouncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const canManage = useMemo(
        () => canManageNextMeeting(permission),
        [permission]
    );
    const isEditorOpen = canManage && modal === "next-meeting-edit";
    const isAnnounceConfirmOpen =
        canManage && modal === "next-meeting-announce";

    useEffect(() => {
        if (!canManage) return;
        if (modal === "next-meeting-edit") {
            setDate(meeting?.date || "");
            setTime(meeting?.time || "21:00");
            setMode(meeting?.mode || "DISCORD");
            setError(null);
            setSuccessMessage(null);
        }
        if (modal === "next-meeting-announce") {
            setError(null);
            setSuccessMessage(null);
        }
    }, [canManage, meeting, modal]);

    const openEditor = () => {
        setDate(meeting?.date || "");
        setTime(meeting?.time || "21:00");
        setMode(meeting?.mode || "DISCORD");
        setError(null);
        setSuccessMessage(null);
        openModal("next-meeting-edit");
    };

    const closeEditor = () => {
        if (isSubmitting) return;
        closeModal();
    };

    const openAnnounceConfirm = () => {
        setError(null);
        setSuccessMessage(null);
        openModal("next-meeting-announce");
    };

    const closeAnnounceConfirm = () => {
        if (isAnnouncing) return;
        closeModal();
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
                setError(result.error || "次回部会を更新できませんでした");
                return;
            }

            setMeeting(result.data);
            setSuccessMessage("次回部会を更新しました");
            closeModal();
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "次回部会を更新できませんでした"
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
            const result = await announceNextMeeting();
            if (!result.success) {
                setError(result.error || "次回部会のお知らせを送信できませんでした");
                return;
            }

            setSuccessMessage("次回部会連絡をDiscordに送信しました");
            closeModal();
        } catch (announceError) {
            setError(
                announceError instanceof Error
                    ? announceError.message
                    : "次回部会のお知らせを送信できませんでした"
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
                    <FontAwesomeIcon
                        icon={faCalendarDays}
                        className="text-xl text-primary"
                    />
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
                                    <FontAwesomeIcon
                                        icon={faPen}
                                        className="text-lg"
                                    />
                                    編集
                                </button>
                                <AsyncButton
                                    type="button"
                                    className="btn btn-primary btn-outline btn-sm gap-2"
                                    onClick={openAnnounceConfirm}
                                    loading={isAnnouncing}
                                    loadingLabel="送信中"
                                    spinnerClassName="loading-xs"
                                >
                                    <FontAwesomeIcon
                                        icon={faPaperPlane}
                                        className="text-lg"
                                    />
                                    送信
                                </AsyncButton>
                            </div>
                        )}
                    </div>
                </div>

                {successMessage && (
                    <p className="text-sm text-success">{successMessage}</p>
                )}
            </div>

            <AppModal
                    open={isEditorOpen}
                    onClose={closeEditor}
                    ariaLabel="次回部会を編集"
                    boxClassName="max-w-2xl max-h-[calc(100dvh-8rem)] overflow-y-auto p-6 sm:max-h-[calc(100dvh-10rem)]"
                >
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
                                <AsyncButton
                                    type="submit"
                                    className="btn btn-primary"
                                    loading={isSubmitting}
                                    loadingLabel="保存中"
                                >
                                    保存
                                </AsyncButton>
                            </div>
                        </form>
            </AppModal>

            <AppModal
                    open={isAnnounceConfirmOpen}
                    onClose={closeAnnounceConfirm}
                    ariaLabel="次回部会連絡を送信"
                    boxClassName="max-w-md max-h-[calc(100dvh-8rem)] overflow-y-auto p-6 sm:max-h-[calc(100dvh-10rem)]"
                >
                        <h3 className="font-bold text-lg mb-3">
                            次回部会連絡を送信
                        </h3>
                        <p className="text-sm text-base-content/70">
                            Discord に次回部会連絡を送信します。
                        </p>
                        <p className="mt-3 rounded-lg bg-base-200 px-3 py-2 text-sm font-medium">
                            {formatNextMeeting(meeting)}
                        </p>
                        {error && (
                            <div className="alert alert-error mt-4">
                                {error}
                            </div>
                        )}
                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn"
                                onClick={closeAnnounceConfirm}
                                disabled={isAnnouncing}
                            >
                                キャンセル
                            </button>
                            <AsyncButton
                                type="button"
                                className="btn btn-primary"
                                onClick={handleAnnounce}
                                loading={isAnnouncing}
                                loadingLabel="送信中"
                            >
                                送信する
                            </AsyncButton>
                        </div>
            </AppModal>
        </div>
    );
}
