import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

/**
 * GAS APIへのプロキシエンドポイント
 * クライアント側からの直接呼び出しを防ぎ、セッション認証を行う
 */
export async function GET(request: NextRequest) {
    // セッション認証
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!GAS_API_URL) {
        return NextResponse.json(
            { error: "GAS API URL not configured" },
            { status: 500 }
        );
    }

    try {
        // クエリパラメータを取得
        const { searchParams } = new URL(request.url);
        const path = searchParams.get("path");

        if (!path) {
            return NextResponse.json(
                { error: "path parameter is required" },
                { status: 400 }
            );
        }

        // 許可されたパスのみを受け付ける
        const allowedPaths = [
            "schedules",
            "items",
            "absences",
            "event-absences",
            "health",
            "notifications",
        ];
        if (!allowedPaths.includes(path)) {
            return NextResponse.json(
                { error: "Invalid path" },
                { status: 400 }
            );
        }

        // GAS APIにリクエストを転送
        const gasUrl = new URL(GAS_API_URL);
        gasUrl.searchParams.set("path", path);

        // 追加のクエリパラメータを転送
        searchParams.forEach((value, key) => {
            if (key !== "path") {
                gasUrl.searchParams.set(key, value);
            }
        });

        const response = await fetch(gasUrl.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("GAS API proxy error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
