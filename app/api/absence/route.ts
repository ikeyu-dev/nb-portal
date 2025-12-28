import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import {
    apiRateLimiter,
    checkRateLimit,
    getClientIp,
} from "@/src/shared/lib/rate-limit";

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

/**
 * 欠席連絡送信API
 * セッション認証とレート制限を適用
 */
export async function POST(request: NextRequest) {
    // レート制限チェック
    const clientIp = getClientIp(request);
    const rateLimitResponse = await checkRateLimit(apiRateLimiter, clientIp);
    if (rateLimitResponse) {
        return rateLimitResponse;
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

        // GAS APIに転送
        const url = new URL(GAS_API_URL);
        url.searchParams.append("path", "absences");

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
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
