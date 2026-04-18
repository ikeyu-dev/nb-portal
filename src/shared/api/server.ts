import type {
    ApiResponse,
    Item,
    Schedule,
    Absence,
    MembersData,
} from "../types/api";
import { auth } from "@/src/auth";
import { gasApiPathSchema, type GasApiPath } from "../lib/validation";
import { unstable_cache } from "next/cache";

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

/**
 * 認証済みセッションを要求する
 */
async function requireAuthenticatedSession() {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    return session;
}

/**
 * サーバーサイドからGAS APIを直接呼び出す
 * Server Componentsで使用する
 */
async function fetchFromGASServer<T>(
    path: GasApiPath,
    params?: Record<string, string>
): Promise<ApiResponse<T>> {
    if (!GAS_API_URL) {
        throw new Error("GAS API URL not configured");
    }

    // パスのバリデーション
    const pathValidation = gasApiPathSchema.safeParse(path);
    if (!pathValidation.success) {
        throw new Error("Invalid path");
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

const getItemsCached = unstable_cache(
    async () => fetchFromGASServer<Item[]>("items"),
    ["gas-items"],
    { tags: ["items"] }
);

const getSchedulesCached = unstable_cache(
    async () => fetchFromGASServer<Schedule[]>("schedules"),
    ["gas-schedules"],
    { tags: ["schedules"] }
);

const getMembersCached = unstable_cache(
    async () => fetchFromGASServer<MembersData>("members"),
    ["gas-members"],
    { tags: ["members"] }
);

const getAbsencesCached = unstable_cache(
    async (date?: string) =>
        fetchFromGASServer<Absence[]>(
            "absences",
            date ? { date } : undefined
        ),
    ["gas-absences"],
    { tags: ["absences"] }
);

const getEventAbsencesCached = unstable_cache(
    async (eventId: string) =>
        fetchFromGASServer<Absence[]>("event-absences", { eventId }),
    ["gas-event-absences"],
    { tags: ["absences"] }
);

/**
 * Items取得API（サーバーサイド用）
 */
export async function getItemsServer(): Promise<ApiResponse<Item[]>> {
    await requireAuthenticatedSession();
    return getItemsCached();
}

/**
 * Schedules取得API（サーバーサイド用）
 */
export async function getSchedulesServer(): Promise<ApiResponse<Schedule[]>> {
    await requireAuthenticatedSession();
    return getSchedulesCached();
}

/**
 * Members取得API（サーバーサイド用）
 */
export async function getMembersServer(): Promise<ApiResponse<MembersData>> {
    await requireAuthenticatedSession();
    return getMembersCached();
}

/**
 * Absences取得API（サーバーサイド用）
 */
export async function getAbsencesServer(
    date?: string
): Promise<ApiResponse<Absence[]>> {
    await requireAuthenticatedSession();
    return getAbsencesCached(date);
}

/**
 * 特定イベントの欠席者取得API（サーバーサイド用）
 */
export async function getEventAbsencesServer(
    eventId: string
): Promise<ApiResponse<Absence[]>> {
    await requireAuthenticatedSession();
    return getEventAbsencesCached(eventId);
}
