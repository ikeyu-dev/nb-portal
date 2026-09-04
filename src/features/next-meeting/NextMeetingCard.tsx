"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendarDays,
    faChevronRight,
    faPaperPlane,
    faPen,
    faXmark,
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

const DETAIL_MODAL = "next-meeting";
const EDIT_MODAL = "next-meeting-edit";
const ANNOUNCE_MODAL = "next-meeting-announce";
type ModalView = "details" | "edit" | "announce";

const canManageNextMeeting = (permission?: MemberPermission) =>
    permission === "HEAD" ||
    permission === "SUB_HEAD" ||
    permission === "ACCOUNTANT";

const getMeetingDateParts = (meeting: NextMeetingSettings | null) => {
    if (!meeting) return null;

    const date = parseDateInput(meeting.date);
    if (!date) {
        return {
            short: `${meeting.date.replaceAll("-", "/")} ${meeting.time}`,
            full: `${meeting.date.replaceAll("-", "/")} ${meeting.time}`,
        };
    }

    const weekday = ["日", "月", "火", "水", "木", "金", "土"][
        date.getDay()
    ];
    return {
        short: `${date.getMonth() + 1}/${date.getDate()}(${weekday}) ${meeting.time}`,
        full: `${meeting.date.replaceAll("-", "/")}(${weekday}) ${meeting.time}`,
    };
};

const formatNextMeeting = (meeting: NextMeetingSettings | null): string => {
    const dateParts = getMeetingDateParts(meeting);
    if (!meeting || !dateParts) return "未設定";
    return `${dateParts.full} ${NEXT_MEETING_MODE_LABELS[meeting.mode]}`;
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
    const { modal, openModal, replaceModal, closeModal } = useUrlModal();
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
    const canManage = canManageNextMeeting(permission);
    const [modalView, setModalView] = useState<ModalView>(() =>
        canManage && modal === EDIT_MODAL
            ? "edit"
            : canManage && modal === ANNOUNCE_MODAL
              ? "announce"
              : "details"
    );
    const isDetailsOpen = modal === DETAIL_MODAL;
    const isEditorOpen = canManage && modal === EDIT_MODAL;
    const isAnnounceConfirmOpen = canManage && modal === ANNOUNCE_MODAL;
    const isModalOpen =
        isDetailsOpen || isEditorOpen || isAnnounceConfirmOpen;
    const dateParts = getMeetingDateParts(meeting);

    useEffect(() => {
        if (!canManage) return;

        if (modal === EDIT_MODAL) {
            setModalView("edit");
            setDate(meeting?.date || "");
            setTime(meeting?.time || "21:00");
            setMode(meeting?.mode || "DISCORD");
        }

        if (modal === ANNOUNCE_MODAL) {
            setModalView("announce");
        }

        if (modal === EDIT_MODAL || modal === ANNOUNCE_MODAL) {
            setError(null);
            setSuccessMessage(null);
        }
    }, [canManage, meeting, modal]);

    const openDetails = () => {
        setModalView("details");
        setError(null);
        openModal(DETAIL_MODAL);
    };

    const openEditor = () => {
        setDate(meeting?.date || "");
        setTime(meeting?.time || "21:00");
        setMode(meeting?.mode || "DISCORD");
        setError(null);
        setSuccessMessage(null);
        setModalView("edit");
        replaceModal(EDIT_MODAL);
    };

    const openAnnounceConfirm = () => {
        setError(null);
        setSuccessMessage(null);
        setModalView("announce");
        replaceModal(ANNOUNCE_MODAL);
    };

    const returnToDetails = () => {
        if (isSubmitting || isAnnouncing) return;
        setError(null);
        setModalView("details");
        replaceModal(DETAIL_MODAL);
    };

    const handleClose = () => {
        if (isSubmitting || isAnnouncing) return;
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
                setError(
                    result.error ||
                        "次回部会のお知らせを送信できませんでした"
                );
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

    const modalLabel = modalView === "edit"
        ? "次回部会を編集"
        : modalView === "announce"
          ? "次回部会連絡を送信"
          : "次回部会";

    return (
        <>
            <section
                className={`card bg-base-100 shadow-xl border border-base-300 ${className}`}
            >
                <div className="card-body flex flex-col p-5 pb-4">
                    <div className="mb-3 flex h-8 items-center gap-2 shrink-0">
                        <FontAwesomeIcon
                            icon={faCalendarDays}
                            className="text-xl text-primary"
                        />
                        <h2
                            className="card-title"
                            style={{
                                fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
                            }}
                        >
                            次回部会
                        </h2>
                    </div>

                    <div className="overflow-hidden rounded-xl bg-base-100 ring-1 ring-base-300/70">
                        <button
                            type="button"
                            aria-label="次回部会の詳細を開く"
                            className="app-nav-item group flex w-full cursor-pointer items-stretch gap-4 p-5 text-left transition-colors hover:bg-base-200/50"
                            onClick={openDetails}
                        >
                            <span
                                className="w-1 shrink-0 rounded-full bg-primary"
                                aria-hidden="true"
                            />
                            <span className="flex min-w-0 flex-1 items-center gap-3">
                                <span className="min-w-0 flex-1">
                                    <span className="block font-bold text-base sm:text-lg">
                                        {dateParts?.short || "未設定"}
                                    </span>
                                    <span className="mt-1 block">
                                        <span className="badge badge-outline badge-sm">
                                            {meeting
                                                ? NEXT_MEETING_MODE_LABELS[
                                                      meeting.mode
                                                  ]
                                                : "予定なし"}
                                        </span>
                                    </span>
                                </span>
                                <FontAwesomeIcon
                                    icon={faChevronRight}
                                    className="text-sm text-base-content/35 transition-transform group-hover:translate-x-0.5"
                                />
                            </span>
                        </button>
                    </div>

                    {successMessage && (
                        <p className="mt-3 text-sm text-success">
                            {successMessage}
                        </p>
                    )}
                </div>
            </section>

            <AppModal
                open={isModalOpen}
                onClose={handleClose}
                ariaLabel={modalLabel}
                boxClassName={`max-h-[calc(100dvh-8rem)] overflow-y-auto p-6 sm:max-h-[calc(100dvh-10rem)] ${
                    modalView === "announce" ? "max-w-md" : "max-w-2xl"
                }`}
            >
                <div className="mb-5 flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold">{modalLabel}</h3>
                    <button
                        type="button"
                        aria-label="閉じる"
                        title="閉じる"
                        className="btn btn-sm btn-square btn-ghost shrink-0"
                        onClick={handleClose}
                        disabled={isSubmitting || isAnnouncing}
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {modalView === "edit" ? (
                    <>
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
                                            event.target
                                                .value as NextMeetingMode
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
                                <div className="alert alert-error">
                                    {error}
                                </div>
                            )}

                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={returnToDetails}
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
                    </>
                ) : modalView === "announce" ? (
                    <>
                        <p className="text-sm text-base-content/70">
                            Discordへ次回部会連絡を送信します。
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
                                className="btn btn-ghost"
                                onClick={returnToDetails}
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
                    </>
                ) : (
                    <>
                        {meeting && dateParts ? (
                            <div className="rounded-xl border border-base-300 bg-base-200/40 p-4">
                                <div className="flex items-start gap-3">
                                    <FontAwesomeIcon
                                        icon={faCalendarDays}
                                        className="mt-0.5 text-xl text-primary"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold">
                                            {dateParts.full}
                                        </p>
                                        <span className="badge badge-outline badge-sm mt-2">
                                            {
                                                NEXT_MEETING_MODE_LABELS[
                                                    meeting.mode
                                                ]
                                            }
                                        </span>
                                        {meeting.updatedAt && (
                                            <p className="mt-3 text-xs text-base-content/55">
                                                更新: {formatUpdatedAt(
                                                    meeting.updatedAt
                                                )}
                                                {meeting.updatedByName ||
                                                meeting.updatedBy
                                                    ? ` / ${meeting.updatedByName || meeting.updatedBy}`
                                                    : ""}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="rounded-xl border border-base-300 bg-base-200/40 p-4 text-base-content/65">
                                次回部会は未設定です。
                            </p>
                        )}

                        <div className="modal-action">
                            {canManage && (
                                <>
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-primary gap-2"
                                        onClick={openEditor}
                                    >
                                        <FontAwesomeIcon icon={faPen} />
                                        編集
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary gap-2"
                                        onClick={openAnnounceConfirm}
                                        disabled={!meeting}
                                    >
                                        <FontAwesomeIcon icon={faPaperPlane} />
                                        Discordへ即時送信
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </AppModal>
        </>
    );
}
