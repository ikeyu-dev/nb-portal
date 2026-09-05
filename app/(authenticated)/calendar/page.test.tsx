// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getCalendarDataServer: vi.fn(),
}));

vi.mock("@/src/shared/api/server", () => ({
    getCalendarDataServer: mocks.getCalendarDataServer,
}));
vi.mock("./CalendarClient", () => ({
    default: () => null,
}));

import CalendarPage from "./page";

describe("予定ページ", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("サーバーで取得した予定と欠席情報を初期データとして渡す", async () => {
        mocks.getCalendarDataServer.mockResolvedValue({
            schedules: {
                success: true,
                data: [{ EVENT_ID: "EVENT-001", TITLE: "部会" }],
            },
            absences: {
                success: true,
                data: [{ eventId: "EVENT-001", studentId: "a123456" }],
            },
        });

        const element = await CalendarPage();

        expect(element.props.initialData).toEqual({
            schedules: [{ EVENT_ID: "EVENT-001", TITLE: "部会" }],
            absences: [{ eventId: "EVENT-001", studentId: "a123456" }],
        });
    });

    it("サーバー取得に失敗した場合はクライアント取得へフォールバックする", async () => {
        mocks.getCalendarDataServer.mockRejectedValue(
            new Error("backend unavailable")
        );
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        const element = await CalendarPage();

        expect(element.props.initialData).toBeNull();
    });
});
