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
    type: z.enum(["欠席", "遅刻", "中抜け", "早退"], {
        error: "無効な欠席種別です",
    }),
    reason: z.enum(["体調不良", "授業", "家庭の都合", "その他"], {
        error: "無効な理由カテゴリです",
    }),
    reasonDetail: z.string().max(500, "詳細が長すぎます").optional(),
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
 * 機材登録データのバリデーションスキーマ
 */
export const itemCreateSchema = z.object({
    category: z.enum(["MIC", "SPK", "CAB", "OTH"], {
        error: "カテゴリはMIC, SPK, CAB, OTHのいずれかです",
    }),
    name: z.string().min(1, "機材名は必須です").max(100, "機材名が長すぎます"),
    count: z.coerce
        .number()
        .min(1, "数量は1以上で指定してください")
        .max(100, "一度に登録できるのは100個までです")
        .optional()
        .default(1),
});

export type ItemCreateData = z.infer<typeof itemCreateSchema>;

/**
 * 機材更新データのバリデーションスキーマ
 */
export const itemUpdateSchema = z.object({
    itemId: z
        .string()
        .min(1, "機材IDは必須です")
        .max(10, "機材IDが長すぎます")
        .regex(/^[A-Z]{3}\d{3}$/, "機材IDの形式が不正です"),
    name: z.string().min(1, "機材名は必須です").max(100, "機材名が長すぎます"),
});

export type ItemUpdateData = z.infer<typeof itemUpdateSchema>;

/**
 * 機材削除データのバリデーションスキーマ
 */
export const itemDeleteSchema = z.object({
    itemId: z
        .string()
        .min(1, "機材IDは必須です")
        .max(10, "機材IDが長すぎます")
        .regex(/^[A-Z]{3}\d{3}$/, "機材IDの形式が不正です"),
});

export type ItemDeleteData = z.infer<typeof itemDeleteSchema>;

/**
 * バリデーションエラーを整形して返す
 */
export function formatValidationErrors(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return `${path}${issue.message}`;
    });
}
