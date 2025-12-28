import type { ApiResponse, Item, Schedule, Absence } from "../types/api";

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

/**
 * サーバーサイドからGAS APIを直接呼び出す
 * Server Componentsで使用する
 */
async function fetchFromGASServer<T>(
    path: string,
    params?: Record<string, string>
): Promise<ApiResponse<T>> {
    if (!GAS_API_URL) {
        throw new Error("GAS API URL not configured");
    }

    const gasUrl = new URL(GAS_API_URL);
    gasUrl.searchParams.set("path", path);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            gasUrl.searchParams.set(key, value);
        });
    }

    try {
        const response = await fetch(gasUrl.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("GAS API server fetch error:", error);
        throw error;
    }
}

/**
 * Items取得API（サーバーサイド用）
 */
export async function getItemsServer(): Promise<ApiResponse<Item[]>> {
    return fetchFromGASServer<Item[]>("items");
}

/**
 * Schedules取得API（サーバーサイド用）
 */
export async function getSchedulesServer(): Promise<ApiResponse<Schedule[]>> {
    return fetchFromGASServer<Schedule[]>("schedules");
}

/**
 * Absences取得API（サーバーサイド用）
 */
export async function getAbsencesServer(
    date?: string
): Promise<ApiResponse<Absence[]>> {
    const params = date ? { date } : undefined;
    return fetchFromGASServer<Absence[]>("absences", params);
}

/**
 * 特定イベントの欠席者取得API（サーバーサイド用）
 */
export async function getEventAbsencesServer(
    eventId: string
): Promise<ApiResponse<Absence[]>> {
    return fetchFromGASServer<Absence[]>("event-absences", { eventId });
}
