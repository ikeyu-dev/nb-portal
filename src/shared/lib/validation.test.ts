// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
    absenceDeleteSchema,
    absenceSubmitSchema,
    eventAttendanceUpdateSchema,
    formatValidationErrors,
    itemCreateSchema,
    queryParamSchema,
    taskUpsertSchema,
} from "./validation";

describe("absenceSubmitSchema", () => {
    const validAbsence = {
        eventId: "EVENT-001",
        studentNumber: "a123456",
        name: "放研 太郎",
        type: "欠席" as const,
        reason: "体調不良" as const,
    };

    it("欠席連絡の最小入力を受理する", () => {
        expect(absenceSubmitSchema.parse(validAbsence)).toEqual(validAbsence);
    });

    it("出席連絡は理由なしでも受理する", () => {
        const input = {
            ...validAbsence,
            type: "出席" as const,
            reason: undefined,
        };

        expect(absenceSubmitSchema.parse(input)).toEqual(input);
    });

    it("出席以外で理由がない場合はreasonのエラーにする", () => {
        const result = absenceSubmitSchema.safeParse({
            ...validAbsence,
            reason: undefined,
        });

        expect(result.success).toBe(false);
        if (result.success) return;
        expect(formatValidationErrors(result.error)).toContain(
            "reason: 理由は必須です"
        );
    });

    it("学籍番号に記号が含まれる場合は拒否する", () => {
        const result = absenceSubmitSchema.safeParse({
            ...validAbsence,
            studentNumber: "a123456@example.com",
        });

        expect(result.success).toBe(false);
        if (result.success) return;
        expect(formatValidationErrors(result.error)).toContain(
            "studentNumber: 学籍番号の形式を確認してください"
        );
    });

    it("詳細は500文字まで受理し、501文字は拒否する", () => {
        expect(
            absenceSubmitSchema.safeParse({
                ...validAbsence,
                reasonDetail: "a".repeat(500),
            }).success
        ).toBe(true);
        expect(
            absenceSubmitSchema.safeParse({
                ...validAbsence,
                reasonDetail: "a".repeat(501),
            }).success
        ).toBe(false);
    });
});

describe("その他の入力スキーマ", () => {
    it("欠席連絡削除では予定IDと学籍番号を要求する", () => {
        expect(
            absenceDeleteSchema.parse({
                eventId: "EVENT-001",
                studentNumber: "a123456",
            })
        ).toEqual({ eventId: "EVENT-001", studentNumber: "a123456" });
        expect(absenceDeleteSchema.safeParse({ eventId: "EVENT-001" }).success).toBe(
            false
        );
    });

    it("出席者一覧は300人まで受理する", () => {
        const studentNumbers = Array.from(
            { length: 300 },
            (_, index) => `s${String(index).padStart(6, "0")}`
        );

        expect(
            eventAttendanceUpdateSchema.safeParse({
                eventId: "EVENT-001",
                studentNumbers,
            }).success
        ).toBe(true);
        expect(
            eventAttendanceUpdateSchema.safeParse({
                eventId: "EVENT-001",
                studentNumbers: [...studentNumbers, "s999999"],
            }).success
        ).toBe(false);
    });

    it("クエリのlimitを数値へ変換し、1から100に制限する", () => {
        expect(queryParamSchema.parse({ limit: "25" }).limit).toBe(25);
        expect(queryParamSchema.safeParse({ limit: "0" }).success).toBe(false);
        expect(queryParamSchema.safeParse({ limit: "101" }).success).toBe(false);
    });

    it("機材の数量を省略すると1になる", () => {
        expect(itemCreateSchema.parse({ category: "MIC", name: "SM58" })).toEqual({
            category: "MIC",
            name: "SM58",
            count: 1,
        });
    });

    it("タスクの省略値を現在の既定値で補う", () => {
        expect(taskUpsertSchema.parse({ title: "会議資料を作る" })).toEqual({
            title: "会議資料を作る",
            description: "",
            status: "TODO",
            assigneeStudentNumbers: [],
        });
    });
});
