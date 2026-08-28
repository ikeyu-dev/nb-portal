// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
    formatDateInput,
    getAttendanceDeadlineLabel,
    getAttendanceResponseWindow,
    getDefaultAttendanceDeadline,
    isAttendanceResponseAllowed,
} from "./schedule-deadline";

describe("出欠連絡期限", () => {
    it("開始日を既定の期限日にする", () => {
        expect(getDefaultAttendanceDeadline("2026-08-28")).toBe("2026-08-28");
        expect(getDefaultAttendanceDeadline("2026/08/28")).toBe("");
    });

    it("期限日のJST 08:00を期限終了時刻にする", () => {
        const window = getAttendanceResponseWindow({
            startDate: "2026-08-30",
            deadlineDate: "2026-08-29",
        });

        expect(window).toEqual({
            deadlineDate: "2026-08-29",
            deadlineEnd: new Date("2026-08-29T08:00:00+09:00"),
        });
        expect(getAttendanceDeadlineLabel({
            startDate: "2026-08-30",
            deadlineDate: "2026-08-29",
        })).toBe("2026/08/29 08:00");
    });

    it("期限直前は受理し、期限時刻ちょうどから拒否する", () => {
        const input = {
            startDate: "2026-08-30",
            deadlineDate: "2026-08-29",
        };

        expect(
            isAttendanceResponseAllowed(
                input,
                new Date("2026-08-29T07:59:59.999+09:00")
            )
        ).toBe(true);
        expect(
            isAttendanceResponseAllowed(
                input,
                new Date("2026-08-29T08:00:00+09:00")
            )
        ).toBe(false);
    });

    it("開始日が不正な場合は期限なしとして受理する", () => {
        expect(getAttendanceResponseWindow({ startDate: "" })).toBeNull();
        expect(
            isAttendanceResponseAllowed(
                { startDate: "invalid" },
                new Date("2099-01-01T00:00:00+09:00")
            )
        ).toBe(true);
        expect(getAttendanceDeadlineLabel({ startDate: "invalid" })).toBe("");
    });

    it("ローカル日付を日付入力形式へ整形する", () => {
        expect(formatDateInput(new Date(2026, 0, 2))).toBe("2026-01-02");
    });
});
