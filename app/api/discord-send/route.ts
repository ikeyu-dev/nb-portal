import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendDiscordWebhook, type DiscordEmbed } from "@/src/shared/lib/discord";

const PUSH_API_SECRET = process.env.PUSH_API_SECRET || "";

function timingSafeEqual(a: string, b: string): boolean {
    if (!a || !b || a.length !== b.length) {
        return false;
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const isValidEmbed = (value: unknown): value is DiscordEmbed =>
    !!value && typeof value === "object" && !Array.isArray(value);

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
    const target = body?.target === "nextMeeting" ? "nextMeeting" : "default";
    const embeds = Array.isArray(body?.embeds) ? body.embeds : [];
    const content = typeof body?.content === "string" ? body.content : "";

    if (embeds.length === 0 || !embeds.every(isValidEmbed)) {
        return NextResponse.json(
            { success: false, error: "Invalid Discord payload" },
            { status: 400 }
        );
    }

    const result = await sendDiscordWebhook({
        target,
        embeds,
        content,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
