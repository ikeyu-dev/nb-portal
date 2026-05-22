import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/src/auth";
import { CACHE_TAGS } from "@/src/shared/lib/cache-policy";
import {
    absenceDeleteSchema,
    absenceSubmitSchema,
    formatValidationErrors,
} from "@/src/shared/lib/validation";
import { validateOrigin, validateContentType } from "@/src/shared/lib/csrf";

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

const buildSubmitBody = (
    body: Record<string, unknown>,
    session: Session
) => {
    const sessionDisplayName =
        session.displayName ||
        session.memberName ||
        session.nickname ||
        session.user?.name ||
        session.studentId;

    return {
        ...body,
        studentNumber: session.studentId,
        name: body.name || sessionDisplayName,
        reason: body.type === "出席" ? body.reason || "出席" : body.reason,
    };
};

const postToGAS = async (path: string, body: unknown) => {
    if (!GAS_API_URL) {
        throw new Error("GAS API URL is not configured");
    }

    const url = new URL(GAS_API_URL);
    url.searchParams.append("path", path);

    const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const responseText = await response.text();
    try {
        const data = JSON.parse(responseText);
        if (!response.ok) {
            return {
                success: false,
                error: data?.error || `GAS API error: ${response.status}`,
            };
        }
        return data;
    } catch {
        console.error("GAS API returned non-JSON response:", {
            status: response.status,
            body: responseText.slice(0, 500),
        });
        return {
            success: false,
            error: `GAS API returned non-JSON response: ${response.status}`,
        };
    }
};

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
        const submitBody = buildSubmitBody(body, session);

        // 入力バリデーション
        const validationResult = absenceSubmitSchema.safeParse(submitBody);
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

        const validatedData = validationResult.data;
        const data = await postToGAS("absences", validatedData);

        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.absences, "max");
        }

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

export async function PUT(request: NextRequest) {
    const originError = validateOrigin(request);
    if (originError) {
        return originError;
    }

    const contentTypeError = validateContentType(request);
    if (contentTypeError) {
        return contentTypeError;
    }

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
        const submitBody = buildSubmitBody(body, session);
        const validationResult = absenceSubmitSchema.safeParse(submitBody);
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

        const data = await postToGAS("absences/update", validationResult.data);

        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.absences, "max");
        }

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

export async function DELETE(request: NextRequest) {
    const originError = validateOrigin(request);
    if (originError) {
        return originError;
    }

    const contentTypeError = validateContentType(request);
    if (contentTypeError) {
        return contentTypeError;
    }

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
        const validationResult = absenceDeleteSchema.safeParse({
            ...body,
            studentNumber: session.studentId,
        });
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

        const data = await postToGAS("absences/delete", validationResult.data);

        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.absences, "max");
        }

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
