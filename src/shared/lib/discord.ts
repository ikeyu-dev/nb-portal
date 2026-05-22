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

type DiscordWebhookTarget = "default" | "nextMeeting";

const getDiscordWebhookUrl = (target: DiscordWebhookTarget) => {
    if (target === "nextMeeting") {
        return (
            process.env.DISCORD_NEXT_MEETING_WEBHOOK_URL ||
            process.env.DISCORD_WEBHOOK_URL
        );
    }

    return process.env.DISCORD_WEBHOOK_URL;
};

export const sendDiscordWebhook = async ({
    target = "default",
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
                target === "nextMeeting"
                    ? "DISCORD_NEXT_MEETING_WEBHOOK_URL or DISCORD_WEBHOOK_URL is not configured"
                    : "DISCORD_WEBHOOK_URL is not configured",
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
