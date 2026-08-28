// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
    normalizeMemberPermission,
    normalizeScheduleAttendanceMode,
} from "./api";

describe("権限の正規化", () => {
    it.each([
        ["head", "HEAD"],
        [" sub-head ", "SUB_HEAD"],
        ["SUB__HEAD", "SUB_HEAD"],
        ["subhead", "SUB_HEAD"],
        ["accountntat", "ACCOUNTANT"],
        ["tmp normal", "TMP_NORMAL"],
        ["TMP＿NORMAL", "TMP_NORMAL"],
    ])("%sを%sへ正規化する", (input, expected) => {
        expect(normalizeMemberPermission(input)).toBe(expected);
    });

    it("未知の権限や空値はnullにする", () => {
        expect(normalizeMemberPermission("ADMIN")).toBeNull();
        expect(normalizeMemberPermission(null)).toBeNull();
    });
});

describe("予定の参加形式", () => {
    it("ATTENDANCEだけを希望者参加として扱う", () => {
        expect(normalizeScheduleAttendanceMode(" attendance ")).toBe(
            "ATTENDANCE"
        );
    });

    it("未知の値と空値は全員参加へフォールバックする", () => {
        expect(normalizeScheduleAttendanceMode("OPTIONAL")).toBe("ABSENCE");
        expect(normalizeScheduleAttendanceMode(undefined)).toBe("ABSENCE");
    });
});
