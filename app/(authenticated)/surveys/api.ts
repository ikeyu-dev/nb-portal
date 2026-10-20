import type { Survey, SurveySummary } from "./types";

type Result<T> = { success: boolean; data?: T; error?: string };

async function request<T>(
    url: string,
    body?: Record<string, unknown>
): Promise<T> {
    const response = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
    });
    const result = (await response.json()) as Result<T>;
    if (!response.ok || !result.success) {
        throw new Error(result.error || "アンケートを取得できませんでした");
    }
    return result.data as T;
}

export const listSurveys = () => request<SurveySummary[]>("/api/surveys");
export const getSurvey = (id: string) =>
    request<Survey>(`/api/surveys?id=${encodeURIComponent(id)}`);
export const updateSurvey = (body: Record<string, unknown>) =>
    request<{ id: string } | undefined>("/api/surveys", body);
