import type {
    ApiResponse,
    Item,
    Schedule,
    Absence,
    MembersData,
    NextMeetingSettings,
    DashboardData,
} from "../types/api";
import { auth } from "@/src/auth";
import { gasApiPathSchema, type GasApiPath } from "../lib/validation";
import { unstable_cache } from "next/cache";
import { CACHE_SECONDS, CACHE_TAGS } from "../lib/cache-policy";

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
    { tags: [CACHE_TAGS.items], revalidate: CACHE_SECONDS.gasData }
);

const getSchedulesCached = unstable_cache(
    async () => fetchFromGASServer<Schedule[]>("schedules"),
    ["gas-schedules"],
    { tags: [CACHE_TAGS.schedules], revalidate: CACHE_SECONDS.gasData }
);

const getMembersCached = unstable_cache(
    async () => fetchFromGASServer<MembersData>("members"),
    ["gas-members"],
    { tags: [CACHE_TAGS.members], revalidate: CACHE_SECONDS.gasData }
);

const getAbsencesCached = unstable_cache(
    async (date?: string) =>
        fetchFromGASServer<Absence[]>(
            "absences",
            date ? { date } : undefined
        ),
    ["gas-absences"],
    { tags: [CACHE_TAGS.absences], revalidate: CACHE_SECONDS.gasData }
);

const getEventAbsencesCached = unstable_cache(
    async (eventId: string) =>
        fetchFromGASServer<Absence[]>("event-absences", { eventId }),
    ["gas-event-absences"],
    { tags: [CACHE_TAGS.absences], revalidate: CACHE_SECONDS.gasData }
);

const getNextMeetingCached = unstable_cache(
    async () => fetchFromGASServer<NextMeetingSettings | null>("next-meeting"),
    ["gas-next-meeting"],
    { tags: [CACHE_TAGS.nextMeeting], revalidate: CACHE_SECONDS.gasData }
);

const getDashboardDataCached = unstable_cache(
    async () => fetchFromGASServer<DashboardData>("dashboard-data"),
    ["gas-dashboard-data"],
    {
        tags: [
            CACHE_TAGS.absences,
            CACHE_TAGS.schedules,
            CACHE_TAGS.nextMeeting,
            CACHE_TAGS.members,
        ],
        revalidate: CACHE_SECONDS.dashboardData,
    }
);

const getHeaderIndex = (
    headers: string[],
    headerName: string,
    fallbackIndex: number
) => {
    const index = headers.findIndex(
        (header) => header.trim().toLowerCase() === headerName
    );
    return index >= 0 ? index : fallbackIndex;
};

const getMemberDisplayNameMap = (membersData: MembersData | undefined) => {
    const displayNameMap = new Map<string, string>();
    if (!membersData) return displayNameMap;

    const headers = membersData.headers.map((header) =>
        String(header || "").trim().toLowerCase()
    );
    const studentNumberIndex = getHeaderIndex(headers, "studentnumber", 0);
    const nameIndex = getHeaderIndex(headers, "name", 2);
    const nicknameIndex = getHeaderIndex(headers, "nickname", -1);

    membersData.members.forEach((member) => {
        const studentId = String(member.values[studentNumberIndex] || "")
            .trim()
            .toLowerCase();
        if (!studentId) return;

        const nickname =
            nicknameIndex >= 0
                ? String(member.values[nicknameIndex] || "").trim()
                : "";
        const name = String(member.values[nameIndex] || "").trim();
        const displayName = nickname && nickname !== "---" ? nickname : name;

        if (displayName) {
            displayNameMap.set(studentId, displayName);
        }
    });

    return displayNameMap;
};

const enrichNextMeeting = (
    meeting: NextMeetingSettings | null,
    membersData: MembersData | undefined
) => {
    if (!meeting?.updatedBy) return meeting;

    const displayNameMap = getMemberDisplayNameMap(membersData);
    const updatedByName =
        displayNameMap.get(meeting.updatedBy.trim().toLowerCase()) || null;

    return {
        ...meeting,
        updatedByName,
    };
};

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

export async function getNextMeetingServer(): Promise<
    ApiResponse<NextMeetingSettings | null>
> {
    await requireAuthenticatedSession();
    const nextMeetingRes = await getNextMeetingCached();
    let membersData: MembersData | undefined;

    try {
        const membersRes = await getMembersCached();
        membersData = membersRes.data;
    } catch (error) {
        console.error("Members fetch for next meeting display failed:", error);
    }

    return {
        ...nextMeetingRes,
        data: enrichNextMeeting(nextMeetingRes.data || null, membersData),
    };
}

export async function getDashboardDataServer(): Promise<
    ApiResponse<DashboardData>
> {
    await requireAuthenticatedSession();
    return getDashboardDataCached();
}
