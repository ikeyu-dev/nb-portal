import { z } from "zod";

/**
 * 欠席連絡送信データのバリデーションスキーマ
 */
export const absenceSubmitSchema = z
    .object({
        eventId: z
            .string()
            .min(1, "イベントIDは必須です")
            .max(100, "イベントIDが長すぎます"),
        studentNumber: z
            .string()
            .min(1, "学籍番号は必須です")
            .max(20, "学籍番号が長すぎます")
            .regex(/^[A-Za-z0-9-]+$/, "学籍番号の形式が不正です"),
        name: z
            .string()
            .min(1, "名前は必須です")
            .max(50, "名前が長すぎます"),
        type: z.enum(["欠席", "遅刻", "中抜け", "早退", "出席"], {
            error: "無効な欠席種別です",
        }),
        reason: z
            .enum(["体調不良", "授業", "家庭の都合", "その他", "出席"], {
                error: "無効な理由カテゴリです",
            })
            .optional(),
        reasonDetail: z.string().max(500, "詳細が長すぎます").optional(),
        timeStepOut: z.string().max(10).optional(),
        timeReturn: z.string().max(10).optional(),
        timeLeavingEarly: z.string().max(10).optional(),
        eventTitle: z.string().max(100).optional(),
        eventDateLabel: z.string().max(50).optional(),
        eventTimeLabel: z.string().max(50).optional(),
        eventWhere: z.string().max(100).optional(),
    })
    .superRefine((data, ctx) => {
        if (data.type === "出席") return;

        if (!data.reason) {
            ctx.addIssue({
                code: "custom",
                path: ["reason"],
                message: "理由は必須です",
            });
        }
    });

export type AbsenceSubmitData = z.infer<typeof absenceSubmitSchema>;

export const absenceDeleteSchema = z.object({
    eventId: z
        .string()
        .min(1, "イベントIDは必須です")
        .max(100, "イベントIDが長すぎます"),
    studentNumber: z
        .string()
        .min(1, "学籍番号は必須です")
        .max(20, "学籍番号が長すぎます")
        .regex(/^[A-Za-z0-9-]+$/, "学籍番号の形式が不正です"),
});

export type AbsenceDeleteData = z.infer<typeof absenceDeleteSchema>;

export const eventAttendanceUpdateSchema = z.object({
    eventId: z
        .string()
        .min(1, "イベントIDは必須です")
        .max(100, "イベントIDが長すぎます"),
    studentNumbers: z
        .array(
            z
                .string()
                .min(1, "学籍番号が空です")
                .max(20, "学籍番号が長すぎます")
                .regex(/^[A-Za-z0-9-]+$/, "学籍番号の形式が不正です")
        )
        .max(300, "出席者が多すぎます"),
});

export type EventAttendanceUpdateData = z.infer<
    typeof eventAttendanceUpdateSchema
>;

/**
 * Backend APIパスのバリデーションスキーマ
 */
export const backendApiPathSchema = z.enum([
    "schedules",
    "items",
    "members",
    "absences",
    "event-absences",
    "event-attendance",
    "next-meeting",
    "tasks",
    "dashboard-data",
    "health",
    "notifications",
]);

export type BackendApiPath = z.infer<typeof backendApiPathSchema>;

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
 * 名簿更新データのバリデーションスキーマ
 */
const memberValuesSchema = z.array(
    z.union([
        z.string().max(1000, "入力値が長すぎます"),
        z.number(),
        z.boolean(),
        z.null(),
    ])
);

export const memberCreateSchema = z.object({
    values: memberValuesSchema,
});

export type MemberCreateData = z.infer<typeof memberCreateSchema>;

export const memberUpdateSchema = z.object({
    rowNumber: z.coerce
        .number()
        .int("行番号は整数で指定してください")
        .min(2, "ヘッダー行は更新できません"),
    values: memberValuesSchema,
});

export type MemberUpdateData = z.infer<typeof memberUpdateSchema>;

export const memberDeleteSchema = z.object({
    rowNumber: z.coerce
        .number()
        .int("行番号は整数で指定してください")
        .min(2, "ヘッダー行は削除できません"),
});

export type MemberDeleteData = z.infer<typeof memberDeleteSchema>;

export const nextMeetingUpdateSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付形式はYYYY-MM-DDです"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "時刻形式はHH:MMです"),
    mode: z.enum(["IN_PERSON", "DISCORD"], {
        error: "開催形式はIN_PERSONまたはDISCORDです",
    }),
});

export type NextMeetingUpdateData = z.infer<typeof nextMeetingUpdateSchema>;

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"], {
    error: "ステータスが不正です",
});

export const taskUpsertSchema = z.object({
    id: z.string().max(100).optional(),
    title: z.string().min(1, "タイトルは必須です").max(100, "タイトルが長すぎます"),
    description: z.string().max(1000, "説明が長すぎます").optional().default(""),
    status: taskStatusSchema.optional().default("TODO"),
    dueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "期限はYYYY-MM-DD形式です")
        .optional()
        .or(z.literal("")),
    assigneeStudentNumbers: z
        .array(
            z
                .string()
                .min(1, "担当者の学籍番号が空です")
                .max(20, "担当者の学籍番号が長すぎます")
                .regex(/^[A-Za-z0-9-]+$/, "担当者の学籍番号形式が不正です")
        )
        .max(30, "担当者が多すぎます")
        .optional()
        .default([]),
});

export type TaskUpsertData = z.infer<typeof taskUpsertSchema>;

export const taskDeleteSchema = z.object({
    id: z.string().min(1, "タスクIDは必須です").max(100, "タスクIDが長すぎます"),
});

export type TaskDeleteData = z.infer<typeof taskDeleteSchema>;

/**
 * バリデーションエラーを整形して返す
 */
export function formatValidationErrors(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return `${path}${issue.message}`;
    });
}
