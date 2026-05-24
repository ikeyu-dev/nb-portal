import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { sendDiscordWebhook } from "@/src/shared/lib/discord";
import { validateOrigin } from "@/src/shared/lib/csrf";

export async function POST(request: NextRequest) {
    const originError = validateOrigin(request);
    if (originError) return originError;

    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    const sentAt = new Date().toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
    });

    const result = await sendDiscordWebhook({
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
    });

    if (!result.success) {
        return NextResponse.json(result, { status: 502 });
    }

    return NextResponse.json({ success: true, sentAt });
}
