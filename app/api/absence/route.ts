import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import {
    absenceSubmitSchema,
    formatValidationErrors,
} from "@/src/shared/lib/validation";
import { validateOrigin, validateContentType } from "@/src/shared/lib/csrf";

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

/**
 * 欠席連絡送信API
 * CSRF保護、セッション認証、入力バリデーションを適用
 */
export async function POST(request: NextRequest) {
    // CSRF保護: Originチェック
    const originError = validateOrigin(request);
    if (originError) {
        return originError;
    }

    // CSRF保護: Content-Typeチェック
    const contentTypeError = validateContentType(request);
    if (contentTypeError) {
        return contentTypeError;
    }

    // 認証チェック
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }
    if (!GAS_API_URL) {
        return NextResponse.json(
            { success: false, error: "GAS API URL is not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();

        // 入力バリデーション
        const validationResult = absenceSubmitSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "バリデーションエラー",
                    details: formatValidationErrors(validationResult.error),
                },
                { status: 400 }
            );
        }

        // GAS APIに転送（バリデーション済みのデータを使用）
        const validatedData = validationResult.data;
        const url = new URL(GAS_API_URL);
        url.searchParams.append("path", "absences");

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(validatedData),
        });

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error("API route error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
