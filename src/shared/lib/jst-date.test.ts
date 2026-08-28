// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
    formatJstDateInput,
    formatJstTimestamp,
    parseDateInput,
} from "./jst-date";

describe("JST日付処理", () => {
    it("UTCの日付境界をJSTの日付へ変換する", () => {
        expect(formatJstDateInput(new Date("2026-08-28T15:30:00Z"))).toBe(
            "2026-08-29"
        );
    });

    it("秒まで含むJSTオフセット形式へ変換する", () => {
        expect(formatJstTimestamp(new Date("2026-08-28T03:04:05Z"))).toBe(
            "2026-08-28T12:04:05+09:00"
        );
    });

    it("日付入力をローカル日付として解析する", () => {
        const date = parseDateInput("2026-02-03");

        expect(date).not.toBeNull();
        expect(date?.getFullYear()).toBe(2026);
        expect(date?.getMonth()).toBe(1);
        expect(date?.getDate()).toBe(3);
    });

    it("日付入力形式でなければnullを返す", () => {
        expect(parseDateInput("2026/02/03")).toBeNull();
        expect(parseDateInput("2026-2-3")).toBeNull();
        expect(parseDateInput("")).toBeNull();
    });

    it("現在の実装では暦上存在しない日付を繰り上げて解析する", () => {
        const date = parseDateInput("2026-02-30");

        expect(date).not.toBeNull();
        expect(date?.getMonth()).toBe(2);
        expect(date?.getDate()).toBe(2);
    });
});
