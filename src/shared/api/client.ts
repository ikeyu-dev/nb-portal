import type { ApiResponse, Item, Schedule, Absence } from "../types/api";

const API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

if (!API_URL) {
    throw new Error("NEXT_PUBLIC_GAS_API_URL is not defined");
}

// 共通のfetch関数
async function fetchFromGAS<T>(
    path: string,
    params?: Record<string, string>
): Promise<ApiResponse<T>> {
    const url = new URL(API_URL as string);
    url.searchParams.append("path", path);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    try {
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            cache: "no-store", // 常に最新のデータを取得
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("API fetch error:", error);
        throw error;
    }
}

// Items取得API
export async function getItems(): Promise<ApiResponse<Item[]>> {
    return fetchFromGAS<Item[]>("items");
}

// Schedules取得API
export async function getSchedules(): Promise<ApiResponse<Schedule[]>> {
    return fetchFromGAS<Schedule[]>("schedules");
}

// Absences取得API
export async function getAbsences(
    date?: string
): Promise<ApiResponse<Absence[]>> {
    const params = date ? { date } : undefined;
    return fetchFromGAS<Absence[]>("absences", params);
}

// 特定イベントの欠席者取得API
export async function getEventAbsences(
    eventId: string
): Promise<ApiResponse<Absence[]>> {
    return fetchFromGAS<Absence[]>("event-absences", { eventId });
}

// Health check API
export async function checkHealth(): Promise<
    ApiResponse<{ message: string; timestamp: string }>
> {
    return fetchFromGAS("health");
}

// 欠席連絡送信データの型
export interface AbsenceSubmitData {
    eventId: string;
    studentNumber: string;
    name: string;
    type: string;
    reason: string;
    timeStepOut?: string;
    timeReturn?: string;
    timeLeavingEarly?: string;
}

// 欠席連絡送信API（Next.js API Route経由）
export async function submitAbsence(data: AbsenceSubmitData): Promise<
    ApiResponse<{
        timestamp: string;
        eventId: string;
        studentNumber: string;
        name: string;
        type: string;
    }>
> {
    try {
        const response = await fetch("/api/absence", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("API submit error:", error);
        throw error;
    }
}
