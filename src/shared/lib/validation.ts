import { z } from "zod";

/**
 * 欠席連絡送信データのバリデーションスキーマ
 */
export const absenceSubmitSchema = z.object({
    eventId: z
        .string()
        .min(1, "イベントIDは必須です")
        .max(100, "イベントIDが長すぎます"),
    studentNumber: z
        .string()
        .min(1, "学籍番号は必須です")
        .max(20, "学籍番号が長すぎます")
        .regex(/^[A-Za-z0-9-]+$/, "学籍番号の形式が不正です"),
    name: z.string().min(1, "名前は必須です").max(50, "名前が長すぎます"),
    type: z.enum(["absence", "late", "stepOut", "earlyLeave"], {
        error: "無効な欠席種別です",
    }),
    reason: z.string().min(1, "理由は必須です").max(500, "理由が長すぎます"),
    timeStepOut: z.string().max(10).optional(),
    timeReturn: z.string().max(10).optional(),
    timeLeavingEarly: z.string().max(10).optional(),
});

export type AbsenceSubmitData = z.infer<typeof absenceSubmitSchema>;

/**
 * GAS APIパスのバリデーションスキーマ
 */
export const gasApiPathSchema = z.enum([
    "schedules",
    "items",
    "absences",
    "event-absences",
    "health",
    "notifications",
]);

export type GasApiPath = z.infer<typeof gasApiPathSchema>;

/**
 * クエリパラメータのバリデーション（一般的な制約）
 */
export const queryParamSchema = z.object({
    eventId: z.string().max(100).optional(),
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "日付形式はYYYY-MM-DDです")
        .optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
});

/**
 * バリデーションエラーを整形して返す
 */
export function formatValidationErrors(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return `${path}${issue.message}`;
    });
}
