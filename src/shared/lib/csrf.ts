import { NextRequest, NextResponse } from "next/server";

/**
 * CSRF保護のためのOriginチェック
 * 同一オリジンからのリクエストのみを許可する
 */
export function validateOrigin(request: NextRequest): NextResponse | null {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    // GETリクエストはCSRF対策不要
    if (request.method === "GET") {
        return null;
    }

    // Originヘッダーがない場合（同一オリジンからの一部リクエスト）
    if (!origin) {
        // Refererをフォールバックとしてチェック
        const referer = request.headers.get("referer");
        if (referer) {
            try {
                const refererUrl = new URL(referer);
                if (refererUrl.host !== host) {
                    return NextResponse.json(
                        { error: "CSRF validation failed" },
                        { status: 403 }
                    );
                }
            } catch {
                return NextResponse.json(
                    { error: "CSRF validation failed" },
                    { status: 403 }
                );
            }
        }
        return null;
    }

    // Originヘッダーがある場合、ホストと一致するか確認
    try {
        const originUrl = new URL(origin);
        const expectedHost = host?.split(":")[0];
        const originHost = originUrl.host.split(":")[0];

        if (originHost !== expectedHost) {
            return NextResponse.json(
                { error: "CSRF validation failed" },
                { status: 403 }
            );
        }
    } catch {
        return NextResponse.json(
            { error: "CSRF validation failed" },
            { status: 403 }
        );
    }

    return null;
}

/**
 * Content-Typeヘッダーの検証
 * application/jsonのみを許可する
 */
export function validateContentType(request: NextRequest): NextResponse | null {
    // GETリクエストはContent-Type不要
    if (request.method === "GET") {
        return null;
    }

    const contentType = request.headers.get("content-type");

    // Content-Typeがない、またはapplication/jsonでない場合は拒否
    if (!contentType || !contentType.includes("application/json")) {
        return NextResponse.json(
            { error: "Invalid Content-Type" },
            { status: 415 }
        );
    }

    return null;
}
