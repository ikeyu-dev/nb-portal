"use client";

import { FormEvent, useEffect, useState } from "react";
import {
    normalizeScheduleAttendanceMode,
    SCHEDULE_ATTENDANCE_MODE_LABELS,
} from "@/src/shared/types/api";
import type {
    Absence,
    ScheduleAttendanceMode,
} from "@/src/shared/types/api";

interface ScheduleCardProps {
    eventId: string;
    title: string;
    where?: string;
    detail?: string;
    absences: Absence[];
    attendanceMode?: ScheduleAttendanceMode;
    currentStudentNumber?: string | null;
    currentDisplayName?: string | null;
    dateLabel?: string;
    timeLabel?: string;
    defaultOpen?: boolean;
    onClose?: () => void;
    onEdit?: () => void;
    hideCard?: boolean;
    color?: string;
}

export default function ScheduleCard({
    eventId,
    title,
    where,
    detail,
    absences,
    attendanceMode = "ABSENCE",
    currentStudentNumber,
    currentDisplayName,
    dateLabel,
    timeLabel,
    defaultOpen = false,
    onClose,
    onEdit,
    hideCard = false,
    color = "#2a83a2",
}: ScheduleCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(defaultOpen);
    const [isAttendanceConfirmOpen, setIsAttendanceConfirmOpen] =
        useState(false);
    const [isAbsenceFormOpen, setIsAbsenceFormOpen] = useState(false);
    const [isAttendanceSubmitting, setIsAttendanceSubmitting] = useState(false);
    const [isAbsenceSubmitting, setIsAbsenceSubmitting] = useState(false);
    const [attendanceSubmitMessage, setAttendanceSubmitMessage] = useState<
        string | null
    >(null);
    const [absenceSubmitMessage, setAbsenceSubmitMessage] = useState<
        string | null
    >(null);
    const [attendanceNote, setAttendanceNote] = useState("");
    const [profile, setProfile] = useState({
        studentNumber: currentStudentNumber || "",
        name: currentDisplayName || "",
    });
    const [absenceForm, setAbsenceForm] = useState({
        type: "",
        reasonCategory: "",
        reasonDetail: "",
        timeStepOut: "",
        timeReturn: "",
        timeLeavingEarly: "",
    });
    const normalizedAttendanceMode =
        normalizeScheduleAttendanceMode(attendanceMode);
    const isAttendanceEvent = normalizedAttendanceMode === "ATTENDANCE";
    const responseSectionTitle = isAttendanceEvent ? "出席申告" : "欠席申請";
    const emptyResponseText = isAttendanceEvent
        ? "出席申告者はいません"
        : "欠席者はいません";
    const actionLabel = isAttendanceEvent ? "出席申告" : "欠席連絡";
    const attendanceModeBadgeClass =
        "border-base-content/35 bg-base-200/70 text-base-content/70";
    const attendanceDateTimeLabel = [dateLabel, timeLabel]
        .filter(Boolean)
        .join(" ");

    useEffect(() => {
        if (currentStudentNumber || currentDisplayName) {
            setProfile({
                studentNumber: currentStudentNumber || "",
                name: currentDisplayName || "",
            });
            return;
        }

        const loadSession = async () => {
            try {
                const response = await fetch("/api/auth/session");
                if (!response.ok) return;
                const session = await response.json();
                setProfile({
                    studentNumber: session?.studentId || "",
                    name:
                        session?.displayName ||
                        session?.memberName ||
                        session?.user?.name ||
                        "",
                });
            } catch {
                // セッション取得に失敗しても、送信API側で補完する
            }
        };

        void loadSession();
    }, [currentDisplayName, currentStudentNumber]);

    const handleClose = () => {
        setIsModalOpen(false);
        setIsAttendanceConfirmOpen(false);
        setIsAbsenceFormOpen(false);
        setAttendanceSubmitMessage(null);
        setAbsenceSubmitMessage(null);
        setAttendanceNote("");
        onClose?.();
    };

    const closeAttendanceConfirm = () => {
        if (isAttendanceSubmitting) return;
        setIsAttendanceConfirmOpen(false);
        setAttendanceSubmitMessage(null);
        setAttendanceNote("");
    };

    const closeAbsenceForm = () => {
        if (isAbsenceSubmitting) return;
        setIsAbsenceFormOpen(false);
        setAbsenceSubmitMessage(null);
        setAbsenceForm({
            type: "",
            reasonCategory: "",
            reasonDetail: "",
            timeStepOut: "",
            timeReturn: "",
            timeLeavingEarly: "",
        });
    };

    const submitAttendance = async () => {
        setIsAttendanceSubmitting(true);
        setAttendanceSubmitMessage(null);

        try {
            const response = await fetch("/api/absence", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventId,
                    type: "出席",
                    reasonDetail: attendanceNote.trim() || undefined,
                }),
            });
            const result = await response.json();

            if (!response.ok || result?.success !== true) {
                throw new Error(result?.error || "出席申告に失敗しました");
            }

            setAttendanceSubmitMessage("出席申告を送信しました");
            setIsAttendanceConfirmOpen(false);
            setAttendanceNote("");
        } catch (error) {
            setAttendanceSubmitMessage(
                error instanceof Error
                    ? error.message
                    : "出席申告に失敗しました"
            );
        } finally {
            setIsAttendanceSubmitting(false);
        }
    };

    const submitAbsence = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsAbsenceSubmitting(true);
        setAbsenceSubmitMessage(null);

        try {
            const response = await fetch("/api/absence", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventId,
                    studentNumber: profile.studentNumber,
                    name: profile.name,
                    type: absenceForm.type,
                    reason: absenceForm.reasonCategory,
                    reasonDetail: absenceForm.reasonDetail || undefined,
                    timeStepOut: absenceForm.timeStepOut || undefined,
                    timeReturn: absenceForm.timeReturn || undefined,
                    timeLeavingEarly:
                        absenceForm.timeLeavingEarly || undefined,
                }),
            });
            const result = await response.json();

            if (!response.ok || result?.success !== true) {
                throw new Error(result?.error || "欠席連絡に失敗しました");
            }

            setAbsenceSubmitMessage("欠席連絡を送信しました");
            setIsAbsenceFormOpen(false);
            setAbsenceForm({
                type: "",
                reasonCategory: "",
                reasonDetail: "",
                timeStepOut: "",
                timeReturn: "",
                timeLeavingEarly: "",
            });
        } catch (error) {
            setAbsenceSubmitMessage(
                error instanceof Error
                    ? error.message
                    : "欠席連絡に失敗しました"
            );
        } finally {
            setIsAbsenceSubmitting(false);
        }
    };

    return (
        <>
            {!hideCard && (
                <div
                    onClick={() => setIsModalOpen(true)}
                    className="group bg-base-100 p-5 transition-colors cursor-pointer hover:bg-base-200/50"
                >
                    <div className="flex items-stretch gap-4">
                        <div
                            className="w-1 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        <div className="flex items-start gap-3 flex-1">
                            <div className="flex-1">
                                <div
                                    className="font-bold"
                                    style={{
                                        fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
                                    }}
                                >
                                    {title}
                                </div>
                                <div className="mt-0">
                                    <span
                                        className={`badge badge-outline badge-sm ${attendanceModeBadgeClass}`}
                                    >
                                        {
                                            SCHEDULE_ATTENDANCE_MODE_LABELS[
                                                normalizedAttendanceMode
                                            ]
                                        }
                                    </span>
                                </div>
                                {(where || dateLabel || timeLabel) && (
                                    <div
                                        className="mt-2 flex items-center gap-4 text-base-content/80"
                                        style={{
                                            fontSize:
                                                "clamp(0.75rem, 1.5vw, 1rem)",
                                        }}
                                    >
                                        {(dateLabel || timeLabel) && (
                                            <div className="flex items-center gap-1">
                                                {dateLabel && (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-4 w-4 text-primary"
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
                                                )}
                                                <span className="font-medium">
                                                    {[dateLabel, timeLabel]
                                                        .filter(Boolean)
                                                        .join(" ")}
                                                </span>
                                            </div>
                                        )}
                                        {where && (
                                            <div className="flex items-center gap-1">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4 text-primary"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                    />
                                                </svg>
                                                <span className="font-medium">
                                                    {where}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <dialog className="modal modal-open">
                    <div
                        className={`modal-box bg-base-100 ${
                            isAttendanceConfirmOpen
                                ? "w-[min(calc(100vw-2rem),34rem)] max-w-none"
                                : "max-w-2xl"
                        }`}
                    >
                        <button
                            onClick={handleClose}
                            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        >
                            ✕
                        </button>
                        <h3
                            className="font-bold mb-4 flex items-center gap-3"
                            style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
                        >
                            {isAttendanceConfirmOpen
                                ? "出席申告"
                                : isAbsenceFormOpen
                                  ? "欠席連絡"
                                  : title}
                            {!isAttendanceConfirmOpen &&
                                !isAbsenceFormOpen &&
                                timeLabel && (
                                <span
                                    className="font-normal text-base-content/70"
                                    style={{
                                        fontSize:
                                            "clamp(1rem, 2.5vw, 1.125rem)",
                                    }}
                                >
                                    {timeLabel}
                                </span>
                            )}
                        </h3>
                        {isAttendanceConfirmOpen ? (
                            <>
                                <div className="mb-5">
                                    <p className="text-base font-medium">
                                        {title}に出席します。
                                    </p>
                                    {attendanceDateTimeLabel && (
                                        <p className="mt-1 text-sm text-base-content/70">
                                            {attendanceDateTimeLabel}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <span className="label-text">
                                        備考（任意）
                                    </span>
                                    <textarea
                                        className="textarea textarea-bordered min-h-24 w-full"
                                        value={attendanceNote}
                                        onChange={(event) =>
                                            setAttendanceNote(
                                                event.target.value
                                            )
                                        }
                                        placeholder="補足があれば入力してください"
                                        maxLength={500}
                                        disabled={isAttendanceSubmitting}
                                    />
                                </div>
                                {attendanceSubmitMessage && (
                                    <div className="alert alert-error mt-4">
                                        <span>{attendanceSubmitMessage}</span>
                                    </div>
                                )}
                                <div className="modal-action">
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={closeAttendanceConfirm}
                                        disabled={isAttendanceSubmitting}
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => void submitAttendance()}
                                        disabled={isAttendanceSubmitting}
                                    >
                                        {isAttendanceSubmitting && (
                                            <span className="loading loading-spinner loading-sm" />
                                        )}
                                        送信
                                    </button>
                                </div>
                            </>
                        ) : isAbsenceFormOpen ? (
                            <form
                                onSubmit={(event) => void submitAbsence(event)}
                                className="space-y-5"
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold">
                                                学籍番号
                                                <span className="text-error">
                                                    *
                                                </span>
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-bordered w-full"
                                            value={profile.studentNumber}
                                            onChange={(event) =>
                                                setProfile({
                                                    ...profile,
                                                    studentNumber:
                                                        event.target.value,
                                                })
                                            }
                                            required
                                            disabled={isAbsenceSubmitting}
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold">
                                                氏名 または あだ名
                                                <span className="text-error">
                                                    *
                                                </span>
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-bordered w-full"
                                            value={profile.name}
                                            onChange={(event) =>
                                                setProfile({
                                                    ...profile,
                                                    name: event.target.value,
                                                })
                                            }
                                            required
                                            disabled={isAbsenceSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold">
                                                種別
                                                <span className="text-error">
                                                    *
                                                </span>
                                            </span>
                                        </label>
                                        <select
                                            className="select select-bordered w-full"
                                            value={absenceForm.type}
                                            onChange={(event) =>
                                                setAbsenceForm({
                                                    ...absenceForm,
                                                    type: event.target.value,
                                                })
                                            }
                                            required
                                            disabled={isAbsenceSubmitting}
                                        >
                                            <option value="">
                                                選択してください
                                            </option>
                                            <option value="欠席">欠席</option>
                                            <option value="遅刻">遅刻</option>
                                            <option value="中抜け">
                                                中抜け
                                            </option>
                                            <option value="早退">早退</option>
                                        </select>
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold">
                                                理由
                                                <span className="text-error">
                                                    *
                                                </span>
                                            </span>
                                        </label>
                                        <select
                                            className="select select-bordered w-full"
                                            value={absenceForm.reasonCategory}
                                            onChange={(event) =>
                                                setAbsenceForm({
                                                    ...absenceForm,
                                                    reasonCategory:
                                                        event.target.value,
                                                })
                                            }
                                            required
                                            disabled={isAbsenceSubmitting}
                                        >
                                            <option value="">
                                                選択してください
                                            </option>
                                            <option value="体調不良">
                                                体調不良
                                            </option>
                                            <option value="授業">授業</option>
                                            <option value="家庭の都合">
                                                家庭の都合
                                            </option>
                                            <option value="その他">
                                                その他
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold">
                                            詳細
                                            <span className="text-base-content/50 font-normal ml-2">
                                                任意
                                            </span>
                                        </span>
                                    </label>
                                    <textarea
                                        className="textarea textarea-bordered h-24 w-full"
                                        value={absenceForm.reasonDetail}
                                        onChange={(event) =>
                                            setAbsenceForm({
                                                ...absenceForm,
                                                reasonDetail:
                                                    event.target.value,
                                            })
                                        }
                                        placeholder="補足があれば入力してください"
                                        maxLength={500}
                                        disabled={isAbsenceSubmitting}
                                    />
                                </div>

                                {absenceForm.type === "中抜け" && (
                                    <div className="grid gap-4 rounded-lg border border-base-300 bg-base-200/50 p-4 sm:grid-cols-2">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">
                                                    抜ける時間
                                                </span>
                                            </label>
                                            <input
                                                type="time"
                                                className="input input-bordered w-full"
                                                value={
                                                    absenceForm.timeStepOut
                                                }
                                                onChange={(event) =>
                                                    setAbsenceForm({
                                                        ...absenceForm,
                                                        timeStepOut:
                                                            event.target.value,
                                                    })
                                                }
                                                disabled={isAbsenceSubmitting}
                                            />
                                        </div>
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">
                                                    活動に戻る時間
                                                </span>
                                            </label>
                                            <input
                                                type="time"
                                                className="input input-bordered w-full"
                                                value={absenceForm.timeReturn}
                                                onChange={(event) =>
                                                    setAbsenceForm({
                                                        ...absenceForm,
                                                        timeReturn:
                                                            event.target.value,
                                                    })
                                                }
                                                disabled={isAbsenceSubmitting}
                                            />
                                        </div>
                                    </div>
                                )}

                                {absenceForm.type === "早退" && (
                                    <div className="rounded-lg border border-base-300 bg-base-200/50 p-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">
                                                    早退する時間
                                                </span>
                                            </label>
                                            <input
                                                type="time"
                                                className="input input-bordered w-full"
                                                value={
                                                    absenceForm.timeLeavingEarly
                                                }
                                                onChange={(event) =>
                                                    setAbsenceForm({
                                                        ...absenceForm,
                                                        timeLeavingEarly:
                                                            event.target.value,
                                                    })
                                                }
                                                disabled={isAbsenceSubmitting}
                                            />
                                        </div>
                                    </div>
                                )}

                                {absenceSubmitMessage && (
                                    <div className="alert alert-error">
                                        <span>{absenceSubmitMessage}</span>
                                    </div>
                                )}

                                <div className="modal-action">
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={closeAbsenceForm}
                                        disabled={isAbsenceSubmitting}
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isAbsenceSubmitting}
                                    >
                                        {isAbsenceSubmitting && (
                                            <span className="loading loading-spinner loading-sm" />
                                        )}
                                        送信
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                {(where || dateLabel) && (
                                    <div
                                        className="flex items-center gap-4 text-base-content/80 mb-4"
                                        style={{
                                            fontSize:
                                                "clamp(0.875rem, 2vw, 1.125rem)",
                                        }}
                                    >
                                        {dateLabel && (
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
                                                <span className="font-medium">
                                                    {dateLabel}
                                                </span>
                                            </div>
                                        )}
                                        {where && (
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
                                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                    />
                                                </svg>
                                                <span className="font-medium">
                                                    {where}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {detail && (
                                    <div className="py-4">
                                        <h4
                                            className="font-semibold mb-2"
                                            style={{
                                                fontSize:
                                                    "clamp(1rem, 2.5vw, 1.125rem)",
                                            }}
                                        >
                                            詳細
                                        </h4>
                                        <p
                                            className="text-base-content/80 leading-relaxed whitespace-pre-wrap break-words"
                                            style={{
                                                fontSize:
                                                    "clamp(0.875rem, 2vw, 1rem)",
                                            }}
                                        >
                                            {detail}
                                        </p>
                                    </div>
                                )}

                                <div className="py-4 border-t border-base-300">
                                    <h4
                                        className="font-semibold mb-2"
                                        style={{
                                            fontSize:
                                                "clamp(1rem, 2.5vw, 1.125rem)",
                                        }}
                                    >
                                        {responseSectionTitle}
                                    </h4>
                                    {absences.length > 0 ? (
                                        <div className="space-y-2">
                                            {absences.map((absence, index) => {
                                                const values =
                                                    Object.values(absence);
                                                const name = String(
                                                    values[3] || ""
                                                );
                                                const type = String(
                                                    values[4] || ""
                                                );

                                                return (
                                                    <div
                                                        key={index}
                                                        className="p-3 bg-base-200/50 rounded-lg border border-base-300"
                                                    >
                                                        <div
                                                            className="font-medium text-base-content"
                                                            style={{
                                                                fontSize:
                                                                    "clamp(0.875rem, 2vw, 1rem)",
                                                            }}
                                                        >
                                                            {name}{" "}
                                                            <span className="badge badge-primary badge-sm ml-2">
                                                                {type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p
                                            className="text-base-content/60"
                                            style={{
                                                fontSize:
                                                    "clamp(0.875rem, 2vw, 1rem)",
                                            }}
                                        >
                                            {emptyResponseText}
                                        </p>
                                    )}
                                </div>

                                <div className="modal-action">
                                    {onEdit && (
                                        <button
                                            onClick={onEdit}
                                            className="btn btn-outline btn-primary"
                                        >
                                            編集
                                        </button>
                                    )}
                                    {isAttendanceEvent ? (
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => {
                                                setAttendanceSubmitMessage(
                                                    null
                                                );
                                                setIsAttendanceConfirmOpen(
                                                    true
                                                );
                                            }}
                                        >
                                            {actionLabel}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => {
                                                setAbsenceSubmitMessage(null);
                                                setIsAbsenceFormOpen(true);
                                            }}
                                        >
                                            {actionLabel}
                                        </button>
                                    )}
                                </div>
                                {attendanceSubmitMessage && (
                                    <div className="alert alert-success mt-4">
                                        <span>{attendanceSubmitMessage}</span>
                                    </div>
                                )}
                                {absenceSubmitMessage && (
                                    <div className="alert alert-success mt-4">
                                        <span>{absenceSubmitMessage}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <form
                        method="dialog"
                        className="modal-backdrop"
                    >
                        <button onClick={handleClose}>閉じる</button>
                    </form>
                </dialog>
            )}
        </>
    );
}
