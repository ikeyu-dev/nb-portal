export type DiscordEmbed = {
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    footer?: {
        text: string;
    };
};

type DiscordWebhookTarget = "attendance" | "meeting";

const getDiscordWebhookUrl = (target: DiscordWebhookTarget) => {
    if (target === "meeting") {
        return process.env.DISCORD_MEETING_WEBHOOK_URL;
    }

    return process.env.DISCORD_ATTENDANCE_WEBHOOK_URL;
};

export const sendDiscordWebhook = async ({
    target = "attendance",
    embeds,
    content,
}: {
    target?: DiscordWebhookTarget;
    embeds: DiscordEmbed[];
    content?: string;
}) => {
    const webhookUrl = getDiscordWebhookUrl(target);

    if (!webhookUrl) {
        return {
            success: false,
            error:
                target === "meeting"
                    ? "DISCORD_MEETING_WEBHOOK_URL is not configured"
                    : "DISCORD_ATTENDANCE_WEBHOOK_URL is not configured",
        };
    }

    const response = await fetch(webhookUrl, {
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
        return {
            success: false,
            error: `Discord webhook failed: ${response.status}`,
            detail: responseText.slice(0, 500),
        };
    }

    return { success: true };
};
