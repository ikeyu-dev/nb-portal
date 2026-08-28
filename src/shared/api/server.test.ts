// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    getBackendApiHeaders: vi.fn(() => ({
        "x-nb-portal-api-key": "test-api-key",
    })),
    getBackendApiUrl: vi.fn(() => "https://backend.example.test/api"),
}));

vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({
    unstable_cache: (callback: (...args: never[]) => unknown) => callback,
}));
vi.mock("@/src/shared/lib/server-env", () => ({
    getBackendApiHeaders: mocks.getBackendApiHeaders,
    getBackendApiUrl: mocks.getBackendApiUrl,
}));

import {
    getAbsencesServer,
    getDashboardDataServer,
    getNextMeetingServer,
    getSchedulesServer,
} from "./server";

const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

describe("サーバーAPI", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({ user: { email: "a123456@example.com" } });
        vi.stubGlobal("fetch", vi.fn());
    });

    it("認証されていなければBackendへアクセスしない", async () => {
        mocks.auth.mockResolvedValue(null);

        await expect(getSchedulesServer()).rejects.toThrow("Unauthorized");
        expect(fetch).not.toHaveBeenCalled();
    });

    it("APIキー付きで予定一覧を取得する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: [{ EVENT_ID: "EVENT-001" }] })
        );

        const result = await getSchedulesServer();

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=schedules",
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-nb-portal-api-key": "test-api-key",
                },
            }
        );
    });

    it("欠席者一覧へ日付条件を付ける", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: [] })
        );

        await getAbsencesServer("2026-08-28");

        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=absences&date=2026-08-28",
            expect.any(Object)
        );
    });

    it("BackendのHTTPエラーを例外として伝える", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: false }, 503)
        );
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        await expect(getSchedulesServer()).rejects.toThrow(
            "HTTP error! status: 503"
        );
    });

    it("次回部会の更新者を名簿のニックネームで補う", async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(
                jsonResponse({
                    success: true,
                    data: {
                        date: "2026-09-01",
                        time: "18:00",
                        mode: "IN_PERSON",
                        updatedBy: "A123456",
                    },
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    success: true,
                    data: {
                        headers: ["studentNumber", "permission", "name", "nickname"],
                        members: [
                            {
                                rowNumber: 2,
                                values: ["a123456", "HEAD", "放研 太郎", "たろう"],
                            },
                        ],
                    },
                })
            );

        const result = await getNextMeetingServer();

        expect(result.data).toMatchObject({
            updatedBy: "A123456",
            updatedByName: "たろう",
        });
    });

    it("名簿取得だけ失敗しても次回部会は返す", async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(
                jsonResponse({
                    success: true,
                    data: {
                        date: "2026-09-01",
                        time: "18:00",
                        mode: "IN_PERSON",
                        updatedBy: "a123456",
                    },
                })
            )
            .mockRejectedValueOnce(new Error("members unavailable"));
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        const result = await getNextMeetingServer();

        expect(result.data).toMatchObject({
            updatedBy: "a123456",
            updatedByName: null,
        });
    });

    it("ダッシュボードデータを専用パスから取得する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                success: true,
                data: { schedules: [], absences: [], nextMeeting: null },
            })
        );

        await getDashboardDataServer();

        expect(fetch).toHaveBeenCalledWith(
            "https://backend.example.test/api?path=dashboard-data",
            expect.any(Object)
        );
    });
});
