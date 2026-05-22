import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const PUSH_API_SECRET = process.env.PUSH_API_SECRET || "";

function timingSafeEqual(a: string, b: string): boolean {
    if (!a || !b || a.length !== b.length) {
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "") || "";

    if (!timingSafeEqual(providedSecret, PUSH_API_SECRET)) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    const body = await request.json().catch(() => null);
    const webhookURL = body?.webhookURL;
    const embeds = body?.embeds;
    const content = body?.content;

    if (!webhookURL || !Array.isArray(embeds) || embeds.length === 0) {
        return NextResponse.json(
            { success: false, error: "Invalid webhook payload" },
            { status: 400 }
        );
    }

    const response = await fetch(webhookURL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            embeds,
            ...(content ? { content } : {}),
        }),
    });

    if (!response.ok) {
        const responseText = await response.text();
        return NextResponse.json(
            {
                success: false,
                error: `Discord webhook failed: ${response.status}`,
                detail: responseText.slice(0, 500),
            },
            { status: 502 }
        );
    }

    return NextResponse.json({ success: true });
}
