import { NextResponse } from "next/server";
import { auth } from "@/src/auth";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function POST() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!DISCORD_WEBHOOK_URL) {
        return NextResponse.json(
            { success: false, error: "DISCORD_WEBHOOK_URL is not configured" },
            { status: 500 }
        );
    }

    const sentAt = new Date().toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
    });

    const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            embeds: [
                {
                    title: "Discord送信テスト",
                    color: 0x0ea5e9,
                    fields: [
                        {
                            name: "送信元",
                            value: "Next.js API",
                            inline: true,
                        },
                        {
                            name: "送信日時",
                            value: sentAt,
                            inline: true,
                        },
                    ],
                    footer: {
                        text: "/api/discord-test",
                    },
                },
            ],
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

    return NextResponse.json({ success: true, sentAt });
}
