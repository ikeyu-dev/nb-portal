import { z } from "zod";
import type { Answers, Question } from "./types";

export type SurveyAnswerValidation =
    | { valid: true }
    | { valid: false; questionId: string | null; message: string };

const isCalendarDate = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
};

const answerSchema = (question: Question) => {
    switch (question.type) {
        case "short":
            return z.string().max(500);
        case "long":
            return z.string().max(5000);
        case "single":
            return z
                .string()
                .refine((value) =>
                    question.options.some((option) => option.id === value)
                );
        case "multiple":
            return z
                .array(z.string())
                .max(question.options.length)
                .refine(
                    (values) =>
                        new Set(values).size === values.length &&
                        values.every((value) =>
                            question.options.some(
                                (option) => option.id === value
                            )
                        )
                );
        case "date":
            return z.string().refine(isCalendarDate);
        case "number":
            return z
                .string()
                .max(100)
                .refine(
                    (value) =>
                        /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(
                            value
                        ) && Number.isFinite(Number(value))
                );
    }
};

const isBlank = (value: unknown) =>
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

export function validateSurveyAnswers(
    questions: Question[],
    value: unknown,
    requireRequired: boolean
): SurveyAnswerValidation {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {
            valid: false,
            questionId: null,
            message: "回答内容を確認してください。",
        };
    }

    const answers = value as Answers;
    const questionById = new Map(
        questions.map((question) => [question.id, question])
    );
    for (const answerId of Object.keys(answers)) {
        if (!questionById.has(answerId)) {
            return {
                valid: false,
                questionId: null,
                message: "回答内容に不明な項目があります。",
            };
        }
    }

    for (const question of questions) {
        const answer = answers[question.id];
        if (isBlank(answer)) {
            if (requireRequired && question.required) {
                return {
                    valid: false,
                    questionId: question.id,
                    message: `「${question.label}」は必須です。`,
                };
            }
            continue;
        }
        if (!answerSchema(question).safeParse(answer).success) {
            return {
                valid: false,
                questionId: question.id,
                message: `「${question.label}」の回答形式を確認してください。`,
            };
        }
    }

    return { valid: true };
}
