"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendarDays,
    faLocationDot,
} from "@fortawesome/free-solid-svg-icons";
import {
    normalizeScheduleAttendanceMode,
    SCHEDULE_ATTENDANCE_MODE_LABELS,
} from "@/src/shared/types/api";
import type {
    ApiResponse,
    Absence,
    EventAttendance,
    MembersData,
    ScheduleAttendanceMode,
} from "@/src/shared/types/api";
import {
    getEventAttendance,
    getMembers,
    updateEventAttendance,
} from "@/src/shared/api/client";
import { AppModal } from "@/src/shared/ui/AppModal";
import { useUrlModal } from "@/src/shared/lib/use-url-modal";
import {
    getAttendanceDeadlineLabel,
    isAttendanceResponseAllowed,
} from "@/src/shared/lib/schedule-deadline";

type AbsenceFormState = {
    type: string;
    reasonCategory: string;
    reasonDetail: string;
    timeStepOut: string;
    timeReturn: string;
    timeLeavingEarly: string;
};

type AbsenceRecordValues = {
    timestamp: string;
    eventId: string;
    studentNumber: string;
    name: string;
    type: string;
    reason: string;
    reasonDetail: string;
    timeLeavingEarly: string;
    timeStepOut: string;
    timeReturn: string;
};

type SessionResponse = {
    studentId?: string;
    displayName?: string;
    memberName?: string;
    user?: {
        name?: string | null;
    };
};

type AbsenceMutationData = Partial<AbsenceRecordValues>;

type AttendanceMemberOption = {
    studentNumber: string;
    displayName: string;
    name: string;
    nickname: string;
    permission: string;
};

const emptyAbsenceForm: AbsenceFormState = {
    type: "",
    reasonCategory: "",
    reasonDetail: "",
    timeStepOut: "",
    timeReturn: "",
    timeLeavingEarly: "",
};

const getAbsenceValues = (absence: Absence): AbsenceRecordValues => {
    const values = Object.values(absence);
    return {
        timestamp: String(values[0] || ""),
        eventId: String(values[1] || ""),
        studentNumber: String(values[2] || ""),
        name: String(values[3] || ""),
        type: String(values[4] || ""),
        reason: String(values[5] || ""),
        reasonDetail: String(values[6] || ""),
        timeLeavingEarly: String(values[7] || ""),
        timeStepOut: String(values[8] || ""),
        timeReturn: String(values[9] || ""),
    };
};

const buildAbsenceRecord = (values: Partial<AbsenceRecordValues>): Absence => ({
    タイムスタンプ: values.timestamp || "",
    EVENT_ID: values.eventId || "",
    学籍番号: values.studentNumber || "",
    氏名: values.name || "",
    種別: values.type || "",
    理由: values.reason || "",
    詳細: values.reasonDetail || "",
    早退時間: values.timeLeavingEarly || "",
    抜ける時間: values.timeStepOut || "",
    戻る時間: values.timeReturn || "",
});

const formatAbsenceTime = (time: string) => {
    if (!time) return "";

    if (time.includes("T")) {
        const date = new Date(time);
        if (Number.isNaN(date.getTime())) return time;

        const hours = String((date.getUTCHours() + 9) % 24).padStart(2, "0");
        const minutes = String(date.getUTCMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    return time;
};

const getAbsenceTimeLabel = (values: AbsenceRecordValues) => {
    if (values.type === "早退" && values.timeLeavingEarly) {
        return formatAbsenceTime(values.timeLeavingEarly);
    }

    if (values.type === "中抜け") {
        const timeStepOut = formatAbsenceTime(values.timeStepOut);
        const timeReturn = formatAbsenceTime(values.timeReturn);

        if (timeStepOut && timeReturn) return `${timeStepOut} 〜 ${timeReturn}`;
        return timeStepOut || timeReturn;
    }

    return "";
};

const dedupeAbsencesByStudent = (records: Absence[]) => {
    const recordMap = new Map<string, Absence>();
    records.forEach((record, index) => {
        const values = getAbsenceValues(record);
        const key = `${values.eventId}:${values.studentNumber.trim().toLowerCase() || index}`;
        recordMap.set(key, record);
    });
    return Array.from(recordMap.values());
};

const resolveAttendanceMembers = (
    data: MembersData | undefined
): AttendanceMemberOption[] => {
    if (!data) return [];

    return data.members
        .map((member) => {
            const studentNumber = String(member.values[0] ?? "")
                .trim()
                .toLowerCase();
            const name = String(member.values[1] ?? "").trim();
            const nickname = String(member.values[2] ?? "").trim();
            const permission = String(member.values[7] ?? "").trim();
            const displayName =
                nickname && nickname !== "---" ? nickname : name || studentNumber;

            return {
                studentNumber,
                displayName,
                name,
                nickname,
                permission,
            };
        })
        .filter(
            (member) =>
                member.studentNumber &&
                member.displayName &&
                member.permission.toUpperCase() !== "OBOG"
        );
};

interface ScheduleCardProps {
    eventId: string;
    title: string;
    where?: string;
    detail?: string;
    absences: Absence[];
    attendanceMode?: ScheduleAttendanceMode;
    currentStudentNumber?: string | null;
    currentDisplayName?: string | null;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    attendanceDeadline?: string;
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
    startDate,
    endDate,
    startTime,
    endTime,
    attendanceDeadline,
    dateLabel,
    timeLabel,
    defaultOpen = false,
    onClose,
    onEdit,
    hideCard = false,
    color = "#2a83a2",
}: ScheduleCardProps) {
    const { searchParams, updateUrlModal, clearUrlModal } = useUrlModal();
    const urlModalQuery = searchParams.toString();
    const [isModalOpen, setIsModalOpen] = useState(defaultOpen);
    const [isAttendanceConfirmOpen, setIsAttendanceConfirmOpen] =
        useState(false);
    const [isAbsenceFormOpen, setIsAbsenceFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isEventAttendanceOpen, setIsEventAttendanceOpen] = useState(false);
    const [isAttendanceSubmitting, setIsAttendanceSubmitting] = useState(false);
    const [isAbsenceSubmitting, setIsAbsenceSubmitting] = useState(false);
    const [isDeletingResponse, setIsDeletingResponse] = useState(false);
    const [isEventAttendanceLoading, setIsEventAttendanceLoading] =
        useState(false);
    const [isEventAttendanceSaving, setIsEventAttendanceSaving] =
        useState(false);
    const [attendanceSubmitMessage, setAttendanceSubmitMessage] = useState<
        string | null
    >(null);
    const [absenceSubmitMessage, setAbsenceSubmitMessage] = useState<
        string | null
    >(null);
    const [eventAttendanceMessage, setEventAttendanceMessage] = useState<
        string | null
    >(null);
    const [eventAttendanceMembers, setEventAttendanceMembers] = useState<
        AttendanceMemberOption[]
    >([]);
    const [eventAttendanceRecords, setEventAttendanceRecords] = useState<
        EventAttendance[]
    >([]);
    const [checkedAttendanceMembers, setCheckedAttendanceMembers] = useState<
        Set<string>
    >(() => new Set());
    const [eventAttendanceSearch, setEventAttendanceSearch] = useState("");
    const [canSaveEventAttendance, setCanSaveEventAttendance] = useState(true);
    const [attendanceNote, setAttendanceNote] = useState("");
    const [localAbsences, setLocalAbsences] = useState(absences);
    const [profile, setProfile] = useState({
        studentNumber: currentStudentNumber || "",
        name: currentDisplayName || "",
    });
    const [absenceForm, setAbsenceForm] =
        useState<AbsenceFormState>(emptyAbsenceForm);
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
    const canSubmitResponse = isAttendanceResponseAllowed({
        startDate,
        endDate,
        startTime,
        endTime,
        deadlineDate: attendanceDeadline,
    });
    const attendanceDeadlineLabel = getAttendanceDeadlineLabel({
        startDate,
        endDate,
        startTime,
        endTime,
        deadlineDate: attendanceDeadline,
    });
    const responseClosedMessage = attendanceDeadlineLabel
        ? isAttendanceEvent
            ? `出席申告の期限は${attendanceDeadlineLabel}です。`
            : `出欠入力期限は${attendanceDeadlineLabel}です。期限後は当日5:00からイベント終了まで入力できます。`
        : "現在は出欠入力の受付時間外です。";
    const normalizedStudentNumber = profile.studentNumber.trim().toLowerCase();
    const displayedAbsences = dedupeAbsencesByStudent(localAbsences);
    const checkedAttendanceCount = checkedAttendanceMembers.size;
    const checkedAttendanceRecordsCount = eventAttendanceRecords.length;
    const attendanceMembersById = useMemo(
        () =>
            new Map(
                eventAttendanceMembers.map((member) => [
                    member.studentNumber,
                    member,
                ])
            ),
        [eventAttendanceMembers]
    );
    const checkedAttendanceOnlyMembers = useMemo(
        () =>
            eventAttendanceRecords.map((record) => {
                const studentNumber = record.studentNumber
                    .trim()
                    .toLowerCase();
                const member = attendanceMembersById.get(studentNumber);
                return {
                    studentNumber,
                    displayName:
                        member?.displayName ||
                        record.displayName ||
                        record.name ||
                        studentNumber,
                };
            }),
        [attendanceMembersById, eventAttendanceRecords]
    );
    const filteredAttendanceMembers = useMemo(() => {
        const query = eventAttendanceSearch.trim().toLowerCase();
        if (!query) return eventAttendanceMembers;

        return eventAttendanceMembers.filter((member) =>
            [
                member.studentNumber,
                member.displayName,
                member.name,
                member.nickname,
            ]
                .join(" ")
                .toLowerCase()
                .includes(query)
        );
    }, [eventAttendanceMembers, eventAttendanceSearch]);
    const ownResponse =
        normalizedStudentNumber
            ? displayedAbsences
                  .map(getAbsenceValues)
                  .filter(
                      (absence) =>
                          absence.eventId === eventId &&
                          absence.studentNumber.trim().toLowerCase() ===
                              normalizedStudentNumber
                  )
                  .at(-1) || null
            : null;

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
                const session = (await response.json()) as SessionResponse;
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

    useEffect(() => {
        setLocalAbsences(absences);
    }, [absences]);

    useEffect(() => {
        const params = new URLSearchParams(urlModalQuery);
        if (params.get("event") !== eventId) return;

        const modal = params.get("modal");
        if (modal === "schedule-response") {
            setIsModalOpen(true);
            setIsAttendanceConfirmOpen(false);
            setIsAbsenceFormOpen(false);
            setIsDeleteConfirmOpen(false);
            setIsEventAttendanceOpen(false);
        }
        if (modal === "response-confirm") {
            setIsModalOpen(true);
            setIsAttendanceConfirmOpen(true);
            setIsAbsenceFormOpen(false);
            setIsDeleteConfirmOpen(false);
            setIsEventAttendanceOpen(false);
        }
        if (modal === "response-form") {
            setIsModalOpen(true);
            setIsAttendanceConfirmOpen(false);
            setIsAbsenceFormOpen(true);
            setIsDeleteConfirmOpen(false);
            setIsEventAttendanceOpen(false);
        }
        if (modal === "response-delete") {
            setIsModalOpen(true);
            setIsAttendanceConfirmOpen(false);
            setIsAbsenceFormOpen(false);
            setIsDeleteConfirmOpen(true);
            setIsEventAttendanceOpen(false);
        }
        if (modal === "event-attendance") {
            setIsModalOpen(true);
            setIsAttendanceConfirmOpen(false);
            setIsAbsenceFormOpen(false);
            setIsDeleteConfirmOpen(false);
            setIsEventAttendanceOpen(true);
        }
    }, [eventId, urlModalQuery]);

    useEffect(() => {
        if (!isEventAttendanceOpen) return;

        const loadEventAttendance = async () => {
            setIsEventAttendanceLoading(true);
            setEventAttendanceMessage(null);
            setCanSaveEventAttendance(true);

            try {
                const [membersResult, attendanceResult] =
                    await Promise.allSettled([
                        getMembers(),
                        getEventAttendance(eventId),
                    ]);

                if (membersResult.status === "rejected") {
                    throw membersResult.reason;
                }

                const membersResponse = membersResult.value;
                if (!membersResponse.success || !membersResponse.data) {
                    throw new Error(
                        membersResponse.error || "名簿の取得に失敗しました"
                    );
                }

                const members = resolveAttendanceMembers(membersResponse.data);
                const attendanceRecords =
                    attendanceResult.status === "fulfilled"
                        ? attendanceResult.value.data || []
                        : [];
                const checked = new Set(
                    attendanceRecords.map((record) =>
                        record.studentNumber.trim().toLowerCase()
                    )
                );

                setEventAttendanceMembers(members);
                setEventAttendanceRecords(attendanceRecords);
                setCheckedAttendanceMembers(checked);

                if (attendanceResult.status === "rejected") {
                    setCanSaveEventAttendance(false);
                    setEventAttendanceMessage(
                        "出席チェックAPIが未反映です。Backend APIの更新とD1マイグレーション後に保存できます。"
                    );
                }
            } catch (error) {
                setEventAttendanceMessage(
                    error instanceof Error
                        ? error.message
                        : "出席チェックの取得に失敗しました"
                );
            } finally {
                setIsEventAttendanceLoading(false);
            }
        };

        void loadEventAttendance();
    }, [eventId, isEventAttendanceOpen]);

    const handleClose = () => {
        setIsModalOpen(false);
        setIsAttendanceConfirmOpen(false);
        setIsAbsenceFormOpen(false);
        setIsDeleteConfirmOpen(false);
        setIsEventAttendanceOpen(false);
        setAttendanceSubmitMessage(null);
        setAbsenceSubmitMessage(null);
        setEventAttendanceMessage(null);
        setEventAttendanceSearch("");
        setAttendanceNote("");
        onClose?.();
        clearUrlModal(["event"]);
    };

    const resetAbsenceForm = () => {
        setAbsenceForm(emptyAbsenceForm);
    };

    const updateLocalResponse = (response: Partial<AbsenceRecordValues>) => {
        const nextResponse = buildAbsenceRecord({
            eventId,
            studentNumber: profile.studentNumber,
            name: profile.name,
            ...response,
        });
        const nextValues = getAbsenceValues(nextResponse);

        setLocalAbsences((currentAbsences) => [
            ...currentAbsences.filter((absence) => {
                const values = getAbsenceValues(absence);
                return !(
                    values.eventId === eventId &&
                    values.studentNumber.trim().toLowerCase() ===
                        nextValues.studentNumber.trim().toLowerCase()
                );
            }),
            nextResponse,
        ]);
    };

    const removeLocalResponse = () => {
        setLocalAbsences((currentAbsences) =>
            currentAbsences.filter((absence) => {
                const values = getAbsenceValues(absence);
                return !(
                    values.eventId === eventId &&
                    values.studentNumber.trim().toLowerCase() ===
                        normalizedStudentNumber
                );
            })
        );
    };

    const closeAttendanceConfirm = () => {
        if (isAttendanceSubmitting) return;
        setIsAttendanceConfirmOpen(false);
        setAttendanceSubmitMessage(null);
        setAttendanceNote("");
        updateUrlModal({ modal: "schedule-response", event: eventId });
    };

    const closeAbsenceForm = () => {
        if (isAbsenceSubmitting) return;
        setIsAbsenceFormOpen(false);
        setAbsenceSubmitMessage(null);
        resetAbsenceForm();
        updateUrlModal({ modal: "schedule-response", event: eventId });
    };

    const closeDeleteConfirm = () => {
        if (isDeletingResponse) return;
        setIsDeleteConfirmOpen(false);
        updateUrlModal({ modal: "schedule-response", event: eventId });
    };

    const openEventAttendance = () => {
        setEventAttendanceMessage(null);
        setIsEventAttendanceOpen(true);
        updateUrlModal({ modal: "event-attendance", event: eventId });
    };

    const closeEventAttendance = () => {
        if (isEventAttendanceSaving) return;
        setIsEventAttendanceOpen(false);
        setEventAttendanceMessage(null);
        setEventAttendanceSearch("");
        updateUrlModal({ modal: "schedule-response", event: eventId });
    };

    const toggleEventAttendanceMember = (studentNumber: string) => {
        setCheckedAttendanceMembers((current) => {
            const next = new Set(current);
            if (next.has(studentNumber)) {
                next.delete(studentNumber);
            } else {
                next.add(studentNumber);
            }
            return next;
        });
    };

    const checkFilteredAttendanceMembers = () => {
        setCheckedAttendanceMembers((current) => {
            const next = new Set(current);
            filteredAttendanceMembers.forEach((member) =>
                next.add(member.studentNumber)
            );
            return next;
        });
    };

    const uncheckFilteredAttendanceMembers = () => {
        setCheckedAttendanceMembers((current) => {
            const next = new Set(current);
            filteredAttendanceMembers.forEach((member) =>
                next.delete(member.studentNumber)
            );
            return next;
        });
    };

    const saveEventAttendance = async () => {
        if (!canSaveEventAttendance) {
            setEventAttendanceMessage(
                "出席チェックAPIが未反映です。Backend APIの更新とD1マイグレーション後に保存できます。"
            );
            return;
        }

        setIsEventAttendanceSaving(true);
        setEventAttendanceMessage(null);

        try {
            const studentNumbers = Array.from(checkedAttendanceMembers).sort();
            await updateEventAttendance({ eventId, studentNumbers });

            const membersMap = new Map(
                eventAttendanceMembers.map((member) => [
                    member.studentNumber,
                    member,
                ])
            );
            setEventAttendanceRecords(
                studentNumbers.map((studentNumber) => {
                    const member = membersMap.get(studentNumber);
                    const now = new Date().toISOString();
                    return {
                        eventId,
                        studentNumber,
                        name: member?.name || member?.displayName || studentNumber,
                        nickname: member?.nickname || null,
                        displayName:
                            member?.displayName || member?.name || studentNumber,
                        permission: member?.permission || "",
                        checkedBy: normalizedStudentNumber || null,
                        checkedAt: now,
                        updatedAt: now,
                    };
                })
            );
            setEventAttendanceMessage("出席チェックを保存しました");
        } catch (error) {
            setEventAttendanceMessage(
                error instanceof Error
                    ? error.message
                    : "出席チェックの保存に失敗しました"
            );
        } finally {
            setIsEventAttendanceSaving(false);
        }
    };

    const openAttendanceForm = () => {
        if (!canSubmitResponse) {
            setAttendanceSubmitMessage(responseClosedMessage);
            return;
        }
        setAttendanceSubmitMessage(null);
        setAttendanceNote(ownResponse?.reasonDetail || "");
        setIsAttendanceConfirmOpen(true);
        updateUrlModal({ modal: "response-confirm", event: eventId });
    };

    const openAbsenceForm = () => {
        if (!canSubmitResponse) {
            setAbsenceSubmitMessage(responseClosedMessage);
            return;
        }
        setAbsenceSubmitMessage(null);
        setAbsenceForm(
            ownResponse
                ? {
                      type: ownResponse.type,
                      reasonCategory: ownResponse.reason,
                      reasonDetail: ownResponse.reasonDetail,
                      timeStepOut: ownResponse.timeStepOut,
                      timeReturn: ownResponse.timeReturn,
                      timeLeavingEarly: ownResponse.timeLeavingEarly,
                  }
                : emptyAbsenceForm
        );
        setIsAbsenceFormOpen(true);
        updateUrlModal({ modal: "response-form", event: eventId });
    };

    const submitAttendance = async () => {
        if (!canSubmitResponse) {
            setAttendanceSubmitMessage(responseClosedMessage);
            return;
        }
        setIsAttendanceSubmitting(true);
        setAttendanceSubmitMessage(null);

        try {
            const response = await fetch("/api/absence", {
                method: ownResponse ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventId,
                    eventTitle: title,
                    eventDateLabel: dateLabel,
                    eventTimeLabel: timeLabel,
                    eventWhere: where,
                    type: "出席",
                    reasonDetail: attendanceNote.trim() || undefined,
                }),
            });
            const result =
                (await response.json()) as ApiResponse<AbsenceMutationData>;

            if (!response.ok || result?.success !== true) {
                throw new Error(result?.error || "出席申告に失敗しました");
            }

            updateLocalResponse({
                timestamp: result.data?.timestamp,
                studentNumber: result.data?.studentNumber,
                name: result.data?.name,
                type: "出席",
                reason: "",
                reasonDetail: result.data?.reasonDetail || "",
                timeLeavingEarly: "",
                timeStepOut: "",
                timeReturn: "",
            });
            setAttendanceSubmitMessage(
                ownResponse ? "出席申告を更新しました" : "出席申告を送信しました"
            );
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
        if (!canSubmitResponse) {
            setAbsenceSubmitMessage(responseClosedMessage);
            return;
        }
        setIsAbsenceSubmitting(true);
        setAbsenceSubmitMessage(null);

        try {
            const response = await fetch("/api/absence", {
                method: ownResponse ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventId,
                    eventTitle: title,
                    eventDateLabel: dateLabel,
                    eventTimeLabel: timeLabel,
                    eventWhere: where,
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
            const result =
                (await response.json()) as ApiResponse<AbsenceMutationData>;

            if (!response.ok || result?.success !== true) {
                throw new Error(result?.error || "欠席連絡に失敗しました");
            }

            updateLocalResponse({
                timestamp: result.data?.timestamp,
                studentNumber: result.data?.studentNumber,
                name: result.data?.name,
                type: result.data?.type || absenceForm.type,
                reason: result.data?.reason || absenceForm.reasonCategory,
                reasonDetail:
                    result.data?.reasonDetail || absenceForm.reasonDetail || "",
                timeStepOut: result.data?.timeStepOut || absenceForm.timeStepOut,
                timeReturn: result.data?.timeReturn || absenceForm.timeReturn,
                timeLeavingEarly:
                    result.data?.timeLeavingEarly ||
                    absenceForm.timeLeavingEarly,
            });
            setAbsenceSubmitMessage(
                ownResponse ? "欠席連絡を更新しました" : "欠席連絡を送信しました"
            );
            setIsAbsenceFormOpen(false);
            resetAbsenceForm();
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

    const deleteResponse = async () => {
        if (!ownResponse || isDeletingResponse) return;

        setIsDeletingResponse(true);
        setAttendanceSubmitMessage(null);
        setAbsenceSubmitMessage(null);

        try {
            const response = await fetch("/api/absence", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ eventId }),
            });
            const result = (await response.json()) as ApiResponse<null>;

            if (!response.ok || result?.success !== true) {
                throw new Error(result?.error || "出欠連絡の削除に失敗しました");
            }

            removeLocalResponse();
            setIsDeleteConfirmOpen(false);
            if (isAttendanceEvent) {
                setAttendanceSubmitMessage("出席申告を削除しました");
            } else {
                setAbsenceSubmitMessage("欠席連絡を削除しました");
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "出欠連絡の削除に失敗しました";
            if (isAttendanceEvent) {
                setAttendanceSubmitMessage(message);
            } else {
                setAbsenceSubmitMessage(message);
            }
        } finally {
            setIsDeletingResponse(false);
        }
    };

    return (
        <>
            {!hideCard && (
                <div
                    onClick={() => {
                        setIsModalOpen(true);
                        updateUrlModal({
                            modal: "schedule-response",
                            event: eventId,
                        });
                    }}
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
                                                    <FontAwesomeIcon
                                                        icon={faCalendarDays}
                                                        className="text-base text-primary"
                                                    />
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
                                                <FontAwesomeIcon
                                                    icon={faLocationDot}
                                                    className="text-base text-primary"
                                                />
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
                <AppModal
                    onClose={handleClose}
                    ariaLabel={title}
                    boxClassName={`max-h-[calc(100dvh-8rem)] overflow-y-auto p-6 sm:max-h-[calc(100dvh-10rem)] ${
                            isEventAttendanceOpen
                                ? "w-[min(calc(100vw-2rem),46rem)] max-w-none"
                            : isAttendanceConfirmOpen || isDeleteConfirmOpen
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
                                : isDeleteConfirmOpen
                                  ? "出欠連絡の削除"
                                : isAbsenceFormOpen
                                  ? "欠席連絡"
                                : isEventAttendanceOpen
                                  ? "出席チェック"
                                  : title}
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
                        ) : isDeleteConfirmOpen ? (
                            <>
                                <div className="space-y-3">
                                    <p className="text-base font-medium">
                                        自分の出欠連絡を削除しますか？
                                    </p>
                                    <p className="text-sm text-base-content/70">
                                        この操作は取り消せません。
                                    </p>
                                </div>
                                <div className="modal-action">
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={closeDeleteConfirm}
                                        disabled={isDeletingResponse}
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-error"
                                        onClick={() => void deleteResponse()}
                                        disabled={isDeletingResponse}
                                    >
                                        {isDeletingResponse && (
                                            <span className="loading loading-spinner loading-sm" />
                                        )}
                                        削除
                                    </button>
                                </div>
                            </>
                        ) : isEventAttendanceOpen ? (
                            <div className="space-y-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="font-semibold text-base-content">
                                            {title}
                                        </p>
                                        {attendanceDateTimeLabel && (
                                            <p className="mt-1 text-sm text-base-content/70">
                                                {attendanceDateTimeLabel}
                                            </p>
                                        )}
                                    </div>
                                    <div className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm">
                                        <span className="text-base-content/60">
                                            出席者
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            {checkedAttendanceCount}
                                        </span>
                                    </div>
                                </div>

                                {eventAttendanceMessage && (
                                    <div
                                        className={`alert ${
                                            eventAttendanceMessage.includes(
                                                "保存しました"
                                            )
                                                ? "alert-success"
                                                : eventAttendanceMessage.includes(
                                                        "未反映"
                                                    )
                                                  ? "alert-warning"
                                                : "alert-error"
                                        }`}
                                    >
                                        <span>{eventAttendanceMessage}</span>
                                    </div>
                                )}

                                {isEventAttendanceLoading ? (
                                    <div className="flex items-center justify-center py-12 text-base-content/70">
                                        <span className="loading loading-spinner loading-md mr-3" />
                                        読み込み中
                                    </div>
                                ) : eventAttendanceMembers.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <input
                                                type="search"
                                                className="input input-bordered w-full"
                                                value={eventAttendanceSearch}
                                                onChange={(event) =>
                                                    setEventAttendanceSearch(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="名前・学籍番号で検索"
                                                disabled={
                                                    isEventAttendanceSaving
                                                }
                                            />
                                            <div className="flex shrink-0 gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline"
                                                    onClick={
                                                        checkFilteredAttendanceMembers
                                                    }
                                                    disabled={
                                                        filteredAttendanceMembers.length ===
                                                            0 ||
                                                        isEventAttendanceSaving
                                                    }
                                                >
                                                    表示中を全選択
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost"
                                                    onClick={
                                                        uncheckFilteredAttendanceMembers
                                                    }
                                                    disabled={
                                                        filteredAttendanceMembers.length ===
                                                            0 ||
                                                        isEventAttendanceSaving
                                                    }
                                                >
                                                    解除
                                                </button>
                                            </div>
                                        </div>

                                        {filteredAttendanceMembers.length >
                                        0 ? (
                                            <div className="max-h-[42dvh] overflow-y-auto rounded-lg border border-base-300">
                                                <div className="divide-y divide-base-300">
                                                    {filteredAttendanceMembers.map(
                                                        (member) => {
                                                            const checked =
                                                                checkedAttendanceMembers.has(
                                                                    member.studentNumber
                                                                );

                                                            return (
                                                                <label
                                                                    key={
                                                                        member.studentNumber
                                                                    }
                                                                    className="flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-base-200/60 sm:px-4"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        className="checkbox checkbox-primary"
                                                                        checked={
                                                                            checked
                                                                        }
                                                                        onChange={() =>
                                                                            toggleEventAttendanceMember(
                                                                                member.studentNumber
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            isEventAttendanceSaving
                                                                        }
                                                                    />
                                                                    <span className="min-w-0 flex-1">
                                                                        <span className="block truncate font-medium">
                                                                            {
                                                                                member.displayName
                                                                            }
                                                                        </span>
                                                                        <span className="block truncate text-sm text-base-content/60">
                                                                            {
                                                                                member.studentNumber
                                                                            }
                                                                        </span>
                                                                    </span>
                                                                </label>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="rounded-lg border border-base-300 bg-base-200/40 p-4 text-base-content/70">
                                                条件に一致する部員が見つかりません。
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="rounded-lg border border-base-300 bg-base-200/40 p-4 text-base-content/70">
                                        出席チェック対象の部員が見つかりません。
                                    </p>
                                )}

                                <div className="modal-action">
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={closeEventAttendance}
                                        disabled={isEventAttendanceSaving}
                                    >
                                        閉じる
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() =>
                                            void saveEventAttendance()
                                        }
                                        disabled={
                                            isEventAttendanceLoading ||
                                            isEventAttendanceSaving ||
                                            !canSaveEventAttendance
                                        }
                                    >
                                        {isEventAttendanceSaving && (
                                            <span className="loading loading-spinner loading-sm" />
                                        )}
                                        保存
                                    </button>
                                </div>
                            </div>
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
                                {(where || dateLabel || timeLabel) && (
                                    <div
                                        className="flex items-center gap-4 text-base-content/80 mb-4"
                                        style={{
                                            fontSize:
                                                "clamp(0.875rem, 2vw, 1.125rem)",
                                        }}
                                    >
                                        {(dateLabel || timeLabel) && (
                                            <div className="flex items-center gap-2">
                                                {dateLabel && (
                                                    <FontAwesomeIcon
                                                        icon={faCalendarDays}
                                                        className="text-xl text-primary"
                                                    />
                                                )}
                                                <span className="font-medium">
                                                    {[dateLabel, timeLabel]
                                                        .filter(Boolean)
                                                        .join(" ")}
                                                </span>
                                            </div>
                                        )}
                                        {where && (
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon
                                                    icon={faLocationDot}
                                                    className="text-xl text-primary"
                                                />
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
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h4
                                                className="font-semibold"
                                                style={{
                                                    fontSize:
                                                        "clamp(1rem, 2.5vw, 1.125rem)",
                                                }}
                                            >
                                                出席チェック
                                            </h4>
                                            <p className="mt-1 text-sm text-base-content/70">
                                                イベント当日の出席者をチェックして集計します。
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-primary"
                                            onClick={openEventAttendance}
                                        >
                                            閲覧・編集
                                        </button>
                                    </div>
                                    {checkedAttendanceRecordsCount > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {checkedAttendanceOnlyMembers
                                                .slice(0, 6)
                                                .map((member) => (
                                                    <span
                                                        key={
                                                            member.studentNumber
                                                        }
                                                        className="badge badge-outline"
                                                    >
                                                        {member.displayName}
                                                    </span>
                                                ))}
                                            {checkedAttendanceRecordsCount >
                                                6 && (
                                                <span className="badge badge-ghost">
                                                    他
                                                    {checkedAttendanceRecordsCount -
                                                        6}
                                                    人
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

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
                                    {!canSubmitResponse && (
                                        <div className="alert alert-warning mb-3">
                                            <span>{responseClosedMessage}</span>
                                        </div>
                                    )}
                                    {displayedAbsences.length > 0 ? (
                                        <div className="space-y-2">
                                            {displayedAbsences.map(
                                                (absence, index) => {
                                                    const values =
                                                        getAbsenceValues(absence);
                                                    const absenceTimeLabel =
                                                        getAbsenceTimeLabel(values);
                                                    const isOwnResponse =
                                                        normalizedStudentNumber &&
                                                        values.studentNumber
                                                            .trim()
                                                            .toLowerCase() ===
                                                            normalizedStudentNumber;

                                                    return (
                                                        <div
                                                            key={`${values.eventId}-${values.studentNumber}-${index}`}
                                                            className="p-3 bg-base-200/50 rounded-lg border border-base-300"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0 flex-1">
                                                                    <div
                                                                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base-content"
                                                                        style={{
                                                                            fontSize:
                                                                                "clamp(0.875rem, 2vw, 1rem)",
                                                                        }}
                                                                    >
                                                                        <span className="font-medium break-words">
                                                                            {
                                                                                values.name
                                                                            }
                                                                        </span>
                                                                        <span className="flex flex-wrap items-center gap-1.5">
                                                                            <span className="badge badge-primary badge-sm">
                                                                                {
                                                                                    values.type
                                                                                }
                                                                            </span>
                                                                            {absenceTimeLabel && (
                                                                                <span className="badge badge-sm whitespace-nowrap border border-base-content/20 bg-base-100 text-base-content/70">
                                                                                    {
                                                                                        absenceTimeLabel
                                                                                    }
                                                                                </span>
                                                                            )}
                                                                            {isOwnResponse && (
                                                                                <span className="badge badge-outline badge-sm">
                                                                                    自分
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    {values.reasonDetail && (
                                                                        <p className="mt-1 text-sm text-base-content/70 whitespace-pre-wrap break-words">
                                                                            {
                                                                                values.reasonDetail
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                {isOwnResponse && (
                                                                    <div className="flex shrink-0 gap-2">
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-ghost btn-xs"
                                                                            onClick={
                                                                                isAttendanceEvent
                                                                                    ? openAttendanceForm
                                                                                    : openAbsenceForm
                                                                            }
                                                                            disabled={
                                                                                isAttendanceSubmitting ||
                                                                                isAbsenceSubmitting ||
                                                                                isDeletingResponse ||
                                                                                !canSubmitResponse
                                                                            }
                                                                        >
                                                                            編集
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-ghost btn-xs text-error"
                                                                            onClick={() => {
                                                                                setIsDeleteConfirmOpen(
                                                                                    true
                                                                                );
                                                                                updateUrlModal(
                                                                                    {
                                                                                        modal: "response-delete",
                                                                                        event: eventId,
                                                                                    }
                                                                                );
                                                                            }}
                                                                            disabled={
                                                                                isAttendanceSubmitting ||
                                                                                isAbsenceSubmitting ||
                                                                                isDeletingResponse
                                                                            }
                                                                        >
                                                                            削除
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            )}
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
                                            onClick={openAttendanceForm}
                                            disabled={
                                                !!ownResponse ||
                                                !canSubmitResponse
                                            }
                                        >
                                            {ownResponse
                                                ? "申告済み"
                                                : canSubmitResponse
                                                  ? actionLabel
                                                  : "受付時間外"}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={openAbsenceForm}
                                            disabled={!canSubmitResponse}
                                        >
                                            {ownResponse
                                                ? "連絡を編集"
                                                : canSubmitResponse
                                                  ? actionLabel
                                                  : "受付時間外"}
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
                </AppModal>
            )}
        </>
    );
}
