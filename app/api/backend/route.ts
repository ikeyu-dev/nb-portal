import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import {
    backendApiPathSchema,
    queryParamSchema,
    formatValidationErrors,
} from "@/src/shared/lib/validation";

import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";

const BACKEND_API_URL = getBackendApiUrl();
const NO_STORE_HEADERS = {
    "Cache-Control": "no-store, max-age=0",
};

/**
 * D1 backend APIへのプロキシエンドポイント
 * クライアント側からの直接呼び出しを防ぎ、セッション認証と入力バリデーションを行う
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!BACKEND_API_URL) {
        return NextResponse.json(
            { error: "Backend API URL not configured" },
            { status: 500 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const path = searchParams.get("path");

        if (!path) {
            return NextResponse.json(
                { error: "path parameter is required" },
                { status: 400 }
            );
        }

        const pathValidation = backendApiPathSchema.safeParse(path);
        if (!pathValidation.success) {
            return NextResponse.json(
                { error: "Invalid path" },
                { status: 400 }
            );
        }

        const queryParams = {
            eventId: searchParams.get("eventId") || undefined,
            date: searchParams.get("date") || undefined,
            limit: searchParams.get("limit") || undefined,
        };
        const queryValidation = queryParamSchema.safeParse(queryParams);
        if (!queryValidation.success) {
            return NextResponse.json(
                {
                    error: "バリデーションエラー",
                    details: formatValidationErrors(queryValidation.error),
                },
                { status: 400 }
            );
        }

        const backendUrl = new URL(BACKEND_API_URL);
        backendUrl.searchParams.set("path", path);

        searchParams.forEach((value, key) => {
            if (key !== "path") {
                backendUrl.searchParams.set(key, value);
            }
        });

        const response = await fetch(backendUrl.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...getBackendApiHeaders(),
            },
            cache: "no-store",
        });

        const data = await response.json();
        return NextResponse.json(data, { headers: NO_STORE_HEADERS });
    } catch (error) {
        console.error("Backend API proxy error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
