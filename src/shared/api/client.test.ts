// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    announceNextMeeting,
    getAbsences,
    getEventAttendance,
    getSchedules,
    submitAbsence,
    updateEventAttendance,
    updateNextMeeting,
} from "./client";

const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

describe("クライアントAPI", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    it("予定一覧をno-storeでBackendプロキシから取得する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: [{ EVENT_ID: "EVENT-001" }] })
        );

        const result = await getSchedules();

        expect(result).toEqual({
            success: true,
            data: [{ EVENT_ID: "EVENT-001" }],
        });
        expect(fetch).toHaveBeenCalledWith("/api/backend?path=schedules", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
        });
    });

    it("欠席者一覧へ日付条件を付ける", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: [] })
        );

        await getAbsences("2026-08-28");

        expect(fetch).toHaveBeenCalledWith(
            "/api/backend?path=absences&date=2026-08-28",
            expect.any(Object)
        );
    });

    it("BackendプロキシのHTTPエラーを例外にする", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false, error: "Unavailable" }, 503)
        );
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        await expect(getSchedules()).rejects.toThrow("HTTP error! status: 503");
    });

    it("イベント出席者をeventId付きで取得する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: [{ studentNumber: "a123456" }] })
        );

        const result = await getEventAttendance("EVENT 001");

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
            "/api/event-attendance?eventId=EVENT+001",
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            }
        );
    });

    it("HTTP 200でも出席者取得が失敗ならAPI本文のエラーを投げる", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false, error: "対象がありません" })
        );
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        await expect(getEventAttendance("UNKNOWN")).rejects.toThrow(
            "対象がありません"
        );
    });

    it("出席者一覧をPUTで保存する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: { updatedAt: "timestamp" } })
        );
        const data = {
            eventId: "EVENT-001",
            studentNumbers: ["a123456", "b234567"],
        };

        await updateEventAttendance(data);

        expect(fetch).toHaveBeenCalledWith("/api/event-attendance", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });

    it("次回部会の更新と告知をそれぞれのAPIへ送る", async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(jsonResponse({ success: true, data: {} }))
            .mockResolvedValueOnce(jsonResponse({ success: true }));
        const meeting = {
            date: "2026-09-01",
            time: "18:00",
            mode: "IN_PERSON" as const,
        };

        await updateNextMeeting(meeting);
        await announceNextMeeting();

        expect(fetch).toHaveBeenNthCalledWith(1, "/api/next-meeting", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(meeting),
        });
        expect(fetch).toHaveBeenNthCalledWith(
            2,
            "/api/next-meeting/announce",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            }
        );
    });

    it("欠席連絡をPOSTし、HTTPエラーを例外にする", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false, error: "期限切れ" }, 403)
        );
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        const data = {
            eventId: "EVENT-001",
            studentNumber: "a123456",
            name: "放研 太郎",
            type: "欠席",
            reason: "授業",
        };

        await expect(submitAbsence(data)).rejects.toThrow(
            "HTTP error! status: 403"
        );
        expect(fetch).toHaveBeenCalledWith(
            "/api/absence",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify(data),
            })
        );
    });
});
