import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Schedule } from "@/src/shared/types/api";

const mocks = vi.hoisted(() => ({
    getDashboardDataServer: vi.fn(),
}));

vi.mock("@/src/auth", () => ({
    auth: async () => ({ studentId: "member1", memberName: "部員" }),
}));
vi.mock("@/src/shared/api/server", () => ({
    getDashboardDataServer: mocks.getDashboardDataServer,
}));
vi.mock("next/link", () => ({
    default: ({ href, children }: { href: string; children: ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));
vi.mock("@/features/schedule-card", () => ({
    ScheduleCard: ({ eventId, title }: { eventId: string; title: string }) => (
        <article aria-label={eventId}>{title}</article>
    ),
}));
vi.mock("@/features/digital-clock", () => ({ DigitalClock: () => null }));
vi.mock("@/features/weather", () => ({ WeatherWidget: () => null }));
vi.mock("@/features/date-display", () => ({ DateDisplay: () => null }));
vi.mock("@/src/features/next-meeting", () => ({ NextMeetingCard: () => null }));
vi.mock("@/src/features/pwa-install", () => ({
    MobilePWAInstallBanner: () => null,
}));

import HomePage from "./page";

function makeSchedule(day: number, title = `予定${day}`): Schedule {
    return {
        EVENT_ID: `EVENT-${day}`,
        YYYY: 2026,
        MM: 10,
        DD: day,
        TIME_HH: 18,
        TIME_MM: 0,
        TITLE: title,
        WHERE: "部室",
        DETAIL: "",
        END_YYYY: 2026,
        END_MM: 10,
        END_DD: day,
        END_TIME_HH: 19,
        END_TIME_MM: 0,
        ATTENDANCE_MODE: "ABSENCE",
        IS_PAST: false,
    };
}

function setSchedules(schedules: Schedule[]) {
    mocks.getDashboardDataServer.mockResolvedValue({
        success: true,
        data: { schedules, absences: [], nextMeeting: null },
    });
}

describe("ダッシュボードの今後の予定", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-10-17T03:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it.each([1, 7, 8, 9])(
        "%i件ある場合、最大7件を表示し、続きがある場合だけリンクを出す",
        async (count) => {
            const schedules = Array.from({ length: count }, (_, index) =>
                makeSchedule(18 + index)
            );
            setSchedules(schedules);

            render(await HomePage());

            expect(screen.getAllByRole("article")).toHaveLength(
                Math.min(count, 7)
            );
            expect(
                screen.getByText(String(count), { selector: ".badge" })
            ).toBeInTheDocument();

            const link = screen.queryByRole("link", {
                name: "すべての予定を見る",
            });
            if (count > 7) {
                expect(link).toHaveAttribute("href", "/calendar");
            } else {
                expect(link).toBeNull();
            }
        }
    );

    it("過去の予定を除き、開始日順に並べてから先頭7件を表示する", async () => {
        const future = Array.from({ length: 9 }, (_, index) =>
            makeSchedule(18 + index)
        );
        setSchedules([makeSchedule(16), ...future.reverse()]);

        render(await HomePage());

        expect(
            screen
                .getAllByRole("article")
                .map((row) => row.getAttribute("aria-label"))
        ).toEqual([
            "EVENT-18",
            "EVENT-19",
            "EVENT-20",
            "EVENT-21",
            "EVENT-22",
            "EVENT-23",
            "EVENT-24",
        ]);
        expect(
            screen.getByText("9", { selector: ".badge" })
        ).toBeInTheDocument();
    });

    it("長いタイトルも1件として数え、全文をScheduleCardへ渡す", async () => {
        const title = Array.from(
            { length: 10 },
            (_, index) => `タイトル${index + 1}行目`
        ).join("\n");
        const schedules = Array.from({ length: 8 }, (_, index) =>
            makeSchedule(18 + index)
        );
        schedules[0] = makeSchedule(18, title);
        setSchedules(schedules);

        render(await HomePage());

        expect(screen.getAllByRole("article")).toHaveLength(7);
        expect(
            screen.getByRole("article", { name: "EVENT-18" }).textContent
        ).toBe(title);
    });

    it("0件の場合は空の表示になり、一覧へのリンクを出さない", async () => {
        setSchedules([]);

        render(await HomePage());

        expect(screen.getByText("予定はありません")).toBeInTheDocument();
        expect(screen.queryAllByRole("article")).toHaveLength(0);
        expect(
            screen.queryByRole("link", { name: "すべての予定を見る" })
        ).toBeNull();
    });
});
