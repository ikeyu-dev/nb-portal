const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;

if (!applicationId || !guildId || !botToken) {
	console.error(
		"DISCORD_APPLICATION_ID, DISCORD_GUILD_ID, and DISCORD_BOT_TOKEN are required"
	);
	process.exit(1);
}

const commands = [
	{
		name: "absences",
		name_localizations: {
			ja: "欠席",
		},
		description: "Show absence information for a date",
		description_localizations: {
			ja: "指定日の欠席者情報を表示します",
		},
		type: 1,
		options: [
			{
				name: "date",
				name_localizations: {
					ja: "日付",
				},
				description: "Date in YYYY-MM-DD format",
				description_localizations: {
					ja: "YYYY-MM-DD形式の日付",
				},
				type: 3,
				required: false,
			},
		],
	},
	{
		name: "schedule",
		name_localizations: {
			ja: "予定",
		},
		description: "Show upcoming schedules or schedules for a date",
		description_localizations: {
			ja: "今後の予定または指定日の予定を表示します",
		},
		type: 1,
		options: [
			{
				name: "date",
				name_localizations: {
					ja: "日付",
				},
				description: "Date in YYYY-MM-DD format",
				description_localizations: {
					ja: "YYYY-MM-DD形式の日付",
				},
				type: 3,
				required: false,
			},
		],
	},
];

const response = await fetch(
	`https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
	{
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bot ${botToken}`,
		},
		body: JSON.stringify(commands),
	}
);

if (!response.ok) {
	const body = await response.text();
	console.error(`Discord command registration failed: ${response.status}`);
	console.error(body);
	process.exit(1);
}

const registeredCommands = await response.json();
console.log(
	`Registered ${registeredCommands.length} Discord commands for guild ${guildId}`
);
