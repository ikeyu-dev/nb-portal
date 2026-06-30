// API共通レスポンス型
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    count?: number;
    error?: string;
    message?: string;
    timestamp?: string;
}

export const MEMBER_PERMISSIONS = [
    "OBOG",
    "NORMAL",
    "HEAD",
    "SUB_HEAD",
    "ACCOUNTANT",
    "TMP_NORMAL",
] as const;

export type MemberPermission = (typeof MEMBER_PERMISSIONS)[number];

export const normalizeMemberPermission = (
    value: unknown
): MemberPermission | null => {
    const normalized = String(value ?? "")
        .trim()
        .toUpperCase()
        .replaceAll("＿", "_")
        .replaceAll("-", "_")
        .replace(/\s+/g, "_");

    const aliases: Record<string, MemberPermission> = {
        OBOG: "OBOG",
        NORMAL: "NORMAL",
        HEAD: "HEAD",
        SUB_HEAD: "SUB_HEAD",
        SUB__HEAD: "SUB_HEAD",
        SUBHEAD: "SUB_HEAD",
        ACCOUNTANT: "ACCOUNTANT",
        ACCOUNTNTAT: "ACCOUNTANT",
        TMP_NORMAL: "TMP_NORMAL",
        TMP__NORMAL: "TMP_NORMAL",
        TMPNORMAL: "TMP_NORMAL",
    };

    return aliases[normalized] || null;
};

export const MEMBER_PERMISSION_LABELS: Record<MemberPermission, string> = {
    OBOG: "OB・OG",
    NORMAL: "部員",
    HEAD: "部長",
    SUB_HEAD: "副部長",
    ACCOUNTANT: "会計",
    TMP_NORMAL: "仮入部",
};

export const NEXT_MEETING_MODES = ["IN_PERSON", "DISCORD"] as const;

export type NextMeetingMode = (typeof NEXT_MEETING_MODES)[number];

export const NEXT_MEETING_MODE_LABELS: Record<NextMeetingMode, string> = {
    IN_PERSON: "対面",
    DISCORD: "Discord",
};

export const SCHEDULE_ATTENDANCE_MODES = ["ABSENCE", "ATTENDANCE"] as const;

export type ScheduleAttendanceMode =
    (typeof SCHEDULE_ATTENDANCE_MODES)[number];

export const SCHEDULE_ATTENDANCE_MODE_LABELS: Record<
    ScheduleAttendanceMode,
    string
> = {
    ABSENCE: "全員参加",
    ATTENDANCE: "希望者参加",
};

export const normalizeScheduleAttendanceMode = (
    value: unknown
): ScheduleAttendanceMode => {
    const normalized = String(value ?? "")
        .trim()
        .toUpperCase()
        .replaceAll("-", "_")
        .replace(/\s+/g, "_");

    return normalized === "ATTENDANCE" ? "ATTENDANCE" : "ABSENCE";
};

export interface NextMeetingSettings {
    eventId?: string;
    date: string;
    time: string;
    mode: NextMeetingMode;
    updatedAt?: string | null;
    updatedBy?: string | null;
    updatedByName?: string | null;
}

export interface DashboardData {
    absences: Absence[];
    schedules: Schedule[];
    nextMeeting: NextMeetingSettings | null;
}

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    TODO: "未着手",
    IN_PROGRESS: "進行中",
    DONE: "完了",
};

export interface TaskAssignee {
    studentNumber: string;
    name: string;
    nickname?: string | null;
    displayName: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    dueDate?: string | null;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdAt: string;
    updatedAt: string;
    assignees: TaskAssignee[];
}

export interface EventAttendance {
    eventId: string;
    studentNumber: string;
    name: string;
    nickname?: string | null;
    displayName: string;
    permission: string;
    checkedBy?: string | null;
    checkedAt: string;
    updatedAt: string;
}

// Items型（スプレッドシートのヘッダーに応じて調整してください）
export interface Item {
    [key: string]: string | number | boolean | Date;
}

// Schedules型（スプレッドシートのヘッダーに応じて調整してください）
export interface Schedule {
    [key: string]: string | number | boolean | Date;
    IS_PAST: boolean;
}

// Absences型（スプレッドシートのヘッダーに応じて調整してください）
export interface Absence {
    [key: string]: string | number | boolean | Date;
}

export type SheetCellValue = string | number | boolean | Date | null;

// membersシートの1行分
export interface MemberRow {
    rowNumber: number;
    values: SheetCellValue[];
}

export interface MembersData {
    headers: string[];
    members: MemberRow[];
}
