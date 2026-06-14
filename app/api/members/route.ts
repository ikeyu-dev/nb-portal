import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/src/auth";
import { CACHE_TAGS } from "@/src/shared/lib/cache-policy";
import {
    formatValidationErrors,
    memberCreateSchema,
    memberDeleteSchema,
    memberUpdateSchema,
} from "@/src/shared/lib/validation";
import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";
import { validateWriteRequest } from "@/src/shared/lib/csrf";

const BACKEND_API_URL = getBackendApiUrl();

/**
 * 名簿追加API
 */
export async function POST(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!BACKEND_API_URL) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const validation = memberCreateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "バリデーションエラー",
                    details: formatValidationErrors(validation.error),
                },
                { status: 400 }
            );
        }

        const url = new URL(BACKEND_API_URL);
        url.searchParams.append("path", "members");

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getBackendApiHeaders(),
            },
            body: JSON.stringify(validation.data),
        });

        const data = (await response.json()) as {
            success?: boolean;
            error?: string;
        };
        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.members, "max");
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Members API route error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

/**
 * 名簿更新API
 */
export async function PUT(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!BACKEND_API_URL) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const validation = memberUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "バリデーションエラー",
                    details: formatValidationErrors(validation.error),
                },
                { status: 400 }
            );
        }

        const url = new URL(BACKEND_API_URL);
        url.searchParams.append("path", "members/update");

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getBackendApiHeaders(),
            },
            body: JSON.stringify(validation.data),
        });

        const data = (await response.json()) as {
            success?: boolean;
            error?: string;
        };
        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.members, "max");
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Members API route error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

/**
 * 名簿削除API
 */
export async function DELETE(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!BACKEND_API_URL) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const validation = memberDeleteSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "バリデーションエラー",
                    details: formatValidationErrors(validation.error),
                },
                { status: 400 }
            );
        }

        const url = new URL(BACKEND_API_URL);
        url.searchParams.append("path", "members/delete");

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getBackendApiHeaders(),
            },
            body: JSON.stringify(validation.data),
        });

        const data = (await response.json()) as {
            success?: boolean;
            error?: string;
        };
        if (data?.success === true) {
            revalidateTag(CACHE_TAGS.members, "max");
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Members API route error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
