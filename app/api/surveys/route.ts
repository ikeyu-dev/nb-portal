import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { validateWriteRequest } from "@/src/shared/lib/csrf";
import {
    getBackendApiHeaders,
    getBackendApiUrl,
} from "@/src/shared/lib/server-env";

async function backend(request: NextRequest, method: "GET" | "POST") {
    if (method === "POST") {
        const invalid = validateWriteRequest(request);
        if (invalid) return invalid;
    }

    const session = await auth();
    const actor = session?.studentId;
    if (!actor) {
        return NextResponse.json(
            { success: false, error: "ログインが必要です" },
            { status: 401 }
        );
    }

    const localBackendUrl =
        process.env.NODE_ENV === "development"
            ? process.env.SURVEY_BACKEND_URL
            : undefined;
    const url = new URL(localBackendUrl || getBackendApiUrl());
    url.searchParams.set("path", "surveys");
    const headers = getBackendApiHeaders();
    if (localBackendUrl && process.env.SURVEY_BACKEND_API_KEY) {
        headers["x-nb-portal-api-key"] = process.env.SURVEY_BACKEND_API_KEY;
    }
    let body: string | undefined;
    if (method === "GET") {
        const id = request.nextUrl.searchParams.get("id");
        if (id) url.searchParams.set("id", id);
        url.searchParams.set("actor", actor);
    } else {
        const raw = await request.text();
        if (raw.length > 100_000) {
            return NextResponse.json(
                { success: false, error: "入力が長すぎます" },
                { status: 413 }
            );
        }
        try {
            body = JSON.stringify({ ...JSON.parse(raw), actor });
        } catch {
            return NextResponse.json(
                { success: false, error: "入力が不正です" },
                { status: 400 }
            );
        }
        headers["Content-Type"] = "application/json";
    }

    try {
        const response = await fetch(url, {
            method,
            headers,
            body,
            cache: "no-store",
        });
        return new NextResponse(response.body, {
            status: response.status,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store",
            },
        });
    } catch {
        return NextResponse.json(
            { success: false, error: "アンケートを取得できませんでした" },
            { status: 502 }
        );
    }
}

export const GET = (request: NextRequest) => backend(request, "GET");
export const POST = (request: NextRequest) => backend(request, "POST");
