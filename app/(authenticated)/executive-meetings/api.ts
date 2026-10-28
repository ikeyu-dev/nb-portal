import type { ApiResult, MeetingRecord, MeetingSummary } from "./types";

async function request<T>(url: string, body?: Record<string, unknown>) {
    const response = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
    });
    const result = (await response.json()) as ApiResult<T>;
    if (!response.ok || !result.success)
        throw new Error(result.error || "議事録を取得できませんでした");
    return result.data as T;
}

export const listMeetings = (query = "") =>
    request<MeetingSummary[]>(
        `/api/executive-meetings?q=${encodeURIComponent(query)}`
    );
export const getMeeting = (id: string, since?: string) => {
    const params = new URLSearchParams({ id });
    if (since) params.set("since", since);
    return request<MeetingRecord | { unchanged: true; updatedAt: string }>(
        `/api/executive-meetings?${params}`
    );
};
export const updateMeeting = (body: Record<string, unknown>) =>
    request<MeetingRecord | { id: string }>("/api/executive-meetings", body);
