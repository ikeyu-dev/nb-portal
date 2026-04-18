// API共通レスポンス型
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    count?: number;
    error?: string;
    message?: string;
    timestamp?: string;
}

// Items型（スプレッドシートのヘッダーに応じて調整してください）
export interface Item {
    [key: string]: string | number | boolean | Date;
}

// Schedules型（スプレッドシートのヘッダーに応じて調整してください）
export interface Schedule {
    [key: string]: string | number | boolean | Date;
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
