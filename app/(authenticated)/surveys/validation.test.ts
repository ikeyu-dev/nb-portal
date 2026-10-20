import { describe, expect, it } from "vitest";
import { validateSurveyAnswers } from "./validation";
import type { Question } from "./types";

const question = (
    type: Question["type"],
    overrides: Partial<Question> = {}
): Question => ({
    id: "q1",
    sectionId: "section-1",
    label: "回答",
    type,
    required: true,
    options:
        type === "single" || type === "multiple"
            ? [
                  { id: "option-1", label: "選択肢1" },
                  { id: "option-2", label: "選択肢2" },
              ]
            : [],
    ...overrides,
});

describe("validateSurveyAnswers", () => {
    it("必須回答の不足を質問単位で返す", () => {
        expect(validateSurveyAnswers([question("short")], {}, true)).toEqual({
            valid: false,
            questionId: "q1",
            message: "「回答」は必須です。",
        });
    });

    it("回答下書きでは必須質問の未入力を許可する", () => {
        expect(validateSurveyAnswers([question("short")], {}, false)).toEqual({
            valid: true,
        });
    });

    it("存在しない日付を拒否する", () => {
        expect(
            validateSurveyAnswers(
                [question("date")],
                { q1: "2026-02-30" },
                false
            )
        ).toMatchObject({ valid: false, questionId: "q1" });
    });

    it("日付と小数・負数を含む有限数値を受け付ける", () => {
        expect(
            validateSurveyAnswers(
                [
                    question("date"),
                    question("number", { id: "q2" }),
                    question("number", { id: "q3" }),
                ],
                { q1: "2026-02-28", q2: "12.5", q3: "-0.25" },
                true
            )
        ).toEqual({ valid: true });
    });

    it("数値欄で通常の数値表記ではない値を拒否する", () => {
        expect(
            validateSurveyAnswers([question("number")], { q1: "0x10" }, false)
        ).toMatchObject({ valid: false, questionId: "q1" });
    });

    it("選択肢にない値と重複選択を拒否する", () => {
        expect(
            validateSurveyAnswers(
                [question("single")],
                { q1: "unknown" },
                false
            )
        ).toMatchObject({ valid: false });
        expect(
            validateSurveyAnswers(
                [question("multiple")],
                { q1: ["option-1", "option-1"] },
                false
            )
        ).toMatchObject({ valid: false });
    });

    it("定義されていない質問IDの回答を拒否する", () => {
        expect(
            validateSurveyAnswers(
                [question("short")],
                { unknown: "value" },
                false
            )
        ).toMatchObject({ valid: false, questionId: null });
    });
});
