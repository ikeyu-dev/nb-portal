# Discord Bot Command Design

## Status

Draft with initial requirements.

This document defines a Discord slash-command integration for NB-Portal using
the existing Cloudflare Worker API and D1 database. The first phase focuses on
read-only `/absences` and `/schedule` commands.

Open questions are intentionally kept in this document so the requirements can
be refined through interviews before implementation.

## Goals

- Let members view portal information from Discord with slash commands.
- Reuse the existing `nb-portal-api` Cloudflare Worker and D1 database.
- Keep commands fast enough to respond directly to Discord interactions.
- Protect member-only information from public leakage.
- Provide only read-only commands in Phase 1.

## Non-Goals

- Do not build a Discord Gateway bot that keeps a persistent WebSocket
  connection.
- Do not duplicate the portal UI inside Discord.
- Do not allow schedule, absence, task, or member writes from Discord.
- Do not introduce a new database service only for Discord commands.
- Do not expose sensitive information to channels by default.

## Current Repository Context

The repository already has:

- Next.js app routes for the authenticated portal.
- Cloudflare Worker API under `cloudflare/nb-portal-api`.
- D1 tables for members, schedules, absences, next meeting settings, tasks,
  push subscriptions, access logs, and cron executions.
- Existing Discord webhook notification support through Next.js
  `/api/discord-send`.
- Cron-based Discord notifications from the Worker.

The new command endpoint should live in the Worker because the Worker already
has direct D1 access and does not need to depend on a logged-in browser session.

## Recommended Architecture

```txt
Discord Slash Command
  POST /discord/interactions
    - Verify Discord Ed25519 signature
    - Handle PING
    - Parse slash command and options
    - Query Cloudflare D1
    - Return Interaction response

Cloudflare Worker: nb-portal-api
  Existing protected backend API
  New public Discord interaction endpoint

Cloudflare D1
  members
  schedules
  absences
  next_meeting_settings
```

Discord interactions should use the HTTP outgoing webhook model, not Gateway
events. Discord sends interactions to the configured endpoint URL and expects an
initial response within 3 seconds. If a query later becomes slow, the Worker can
return a deferred response and update the original response with Discord's
follow-up endpoints.

## Request Routing

The existing Worker currently authorizes normal backend requests with
`x-nb-portal-api-key`. Discord cannot send that header, so the Discord endpoint
must be routed before backend API authorization.

Proposed fetch flow:

```ts
async fetch(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/discord/interactions") {
    return handleDiscordInteraction(request, env);
  }

  const authorizationError = await authorizeBackendRequest(request, url, env);
  if (authorizationError) return authorizationError;

  // existing GET / POST routing
}
```

## Security Model

### Discord Signature Verification

Every request to `/discord/interactions` must verify:

- `X-Signature-Ed25519`
- `X-Signature-Timestamp`
- raw request body
- `DISCORD_PUBLIC_KEY`

The body must be read as text first. Signature verification must happen before
JSON parsing and before any D1 query.

### Guild Restriction

The endpoint should reject commands unless `interaction.guild_id` matches the
configured Discord server.

Required environment variable:

- `DISCORD_GUILD_ID`
- `DISCORD_PRODUCTION_GUILD_ID=585040080817618955`
- `DISCORD_DEVELOPMENT_GUILD_ID=1415328783333986430`

Development and production command registration should target different guilds:

- Development guild: `1415328783333986430`
- Production guild: `585040080817618955`

### Response Visibility

All Phase 1 command responses must be ephemeral so only the command invoker can
see the result. This is required for both `/absences` and `/schedule`.

Public channel responses are out of scope for Phase 1.

### Authorization

Phase 1 requires the invoking Discord member to have the club member role.

Required environment variable:

- `DISCORD_MEMBER_ROLE_ID=585047138942189603`

Authorization check:

- Read `interaction.member.roles`.
- Allow the command only when the role list includes
  `585047138942189603`.
- Return an ephemeral no-permission response otherwise.

This runtime check is authoritative. Discord-side command permissions can also
be configured to hide commands from non-members, but the Worker must not rely on
client-side visibility as the only protection.

If commands later need multiple permission levels, the Worker can inspect the
interaction member roles and compare them with configured role IDs.

Potential environment variables:

- `DISCORD_ADMIN_ROLE_IDS`

If commands need per-member personalization or writes, add a durable mapping
between Discord user IDs and NB-Portal members.

Potential future table:

```sql
CREATE TABLE discord_accounts (
  discord_user_id TEXT PRIMARY KEY,
  student_number TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  verified_by TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);
```

## Command Names

Discord `CHAT_INPUT` command names can use Unicode letters, so Japanese command
names are technically possible. The command and option names must be 1-32
characters and match Discord's command-name restrictions.

Recommended Phase 1 approach:

- Register stable English internal names:
  - `/absences`
  - `/schedule`
- Add Japanese localizations at launch:
  - `/欠席`
  - `/予定`
- Keep handler logic keyed by the stable English names.

This keeps implementation and tests simple while allowing Japanese command
display for users whose Discord client locale supports the localization.

## Phase 1 Commands

### `/absences`

Show absence-related submissions for a date.

Options:

- `date`: optional string in `YYYY-MM-DD`; defaults to today's JST date.
- `event`: optional event selector or event ID, deferred until autocomplete is
  needed.

Initial response:

- Return exactly the same absence information currently sent by the event-day
  Discord webhook.
- Reuse the existing webhook response-building logic if practical so the command
  and webhook cannot drift.
- Use the same absence filtering as the existing webhook:
  - `欠席`
  - `遅刻`
  - `早退`
  - `中抜け`
- Exclude `出席`.
- Preserve the existing empty states:
  - `本日の予定はありません`
  - `本日の欠席者はいません`

Default visibility: ephemeral.
Required role: `585047138942189603`.

### `/schedule`

Show schedule information.

Options:

- `date`: optional string in `YYYY-MM-DD`; when omitted, return upcoming
  schedules only.

Initial response:

- When `date` is omitted, return upcoming schedules only.
- Do not apply a maximum result count in Phase 1.
- When `date` is provided, return schedules whose date range includes the
  selected date.
- A multi-day event must be searchable on any day inside its range. For example,
  an event with `date=2026-07-03` and `end_date=2026-07-05` must appear when
  searching `2026-07-04`.
- There is no existing schedule webhook response to mirror in Phase 1, so define
  schedule command formatting independently.
- Use embeds with:
  - title `今後の予定` when `date` is omitted.
  - title `YYYY/MM/DD(曜) の予定` when `date` is provided.
  - schedule entries as fields.
  - field name as the schedule date or date range.
  - field value containing title, time, location, attendance deadline, and a
    truncated detail.
  - color `0x0ea5e9` for normal results.
  - color `0x94a3b8` and `該当する予定はありません` when no schedules match.

Default visibility: ephemeral.
Required role: `585047138942189603`.

## Deferred Commands

These are useful but should not be included in Phase 1 unless there is a clear
need.

- `/absence submit`: submit or update absence from Discord.
- `/task done`: update a task status.
- `/schedule create`: create a schedule from Discord.
- `/next-meeting`: show the configured next meeting.
- `/tasks`: show task summaries.
- `/whoami`: show linked NB-Portal member identity.
- `/link`: link Discord account to student number.

Write commands require a stronger identity model than server membership alone.

## Command Registration

Use guild-scoped application commands during development and early rollout
because command updates propagate faster and reduce risk.

Required secrets or variables:

- `DISCORD_APPLICATION_ID`
- `DISCORD_GUILD_ID`
- `DISCORD_PRODUCTION_GUILD_ID`
- `DISCORD_DEVELOPMENT_GUILD_ID`
- `DISCORD_MEMBER_ROLE_ID`
- `DISCORD_BOT_TOKEN`

The command registration can be implemented as a script under
`cloudflare/nb-portal-api/scripts/` so command definitions are versioned with
the Worker code.

Candidate script:

```txt
cloudflare/nb-portal-api/scripts/register-discord-commands.mjs
```

Global commands can be considered after the command set is stable.

## Environment Variables and Secrets

Worker variables:

- `DISCORD_GUILD_ID`
- `DISCORD_PRODUCTION_GUILD_ID=585040080817618955`
- `DISCORD_DEVELOPMENT_GUILD_ID=1415328783333986430`
- `DISCORD_MEMBER_ROLE_ID=585047138942189603`

Worker secrets:

- `DISCORD_PUBLIC_KEY`

Local command registration variables:

- `DISCORD_APPLICATION_ID`
- `DISCORD_GUILD_ID`
- `DISCORD_BOT_TOKEN`

`DISCORD_BOT_TOKEN` is not needed by the deployed Worker in Phase 1. Keep it
out of Worker secrets unless a future follow-up-message or Discord REST API
feature is implemented in the Worker runtime.

Existing variables remain unchanged:

- `D1_BACKEND_API_KEY`
- `PUSH_API_SECRET`
- `APP_DISCORD_SEND_URL`
- `NEXT_MEETING_ROLE_MENTION`

## Data Access

The first phase only reads existing tables.

Useful queries:

- Absences by date:
  - join `absences` to `schedules` by `event_id`
  - filter schedule date
  - filter absence type
- Schedule by date:
  - filter `schedules.date <= selected_date`
  - filter `COALESCE(schedules.end_date, schedules.date) >= selected_date`
  - order by date, start time, ID
- Upcoming schedules:
  - filter `COALESCE(schedules.end_date, schedules.date) >= today`
  - order by date, start time, ID
  - limit displayed results to avoid Discord embed payload limits

Existing indexes should be checked before implementation. If command usage
grows, add indexes that match Discord command queries.

## Response Formatting

Use embeds for structured lists, but keep content compact because Discord
messages have display and payload limits.

Formatting rules:

- Prefer Japanese labels consistent with the portal.
- Use JST for default dates and timestamps.
- Truncate long descriptions.
- Limit list length and include a note when results are omitted.
- Use `allowed_mentions: { parse: [] }` unless a command explicitly needs
  mentions.

## Error Handling

User-facing errors should be short and actionable.

Examples:

- Invalid date: `日付は YYYY-MM-DD 形式で指定してください。`
- No permission: `このコマンドを実行する権限がありません。`
- Wrong server: `このサーバーでは利用できません。`
- Unknown command: `未対応のコマンドです。`

Unexpected errors should be logged with `console.error` and return a generic
ephemeral message.

## Testing Strategy

Unit tests:

- signature verification success and failure
- PING response
- unknown command response
- member role authorization success and failure
- date option parsing
- schedule range matching for multi-day events
- query result formatting

Worker integration tests:

- `/discord/interactions` bypasses `x-nb-portal-api-key`
- normal backend routes still require `x-nb-portal-api-key`
- command handlers return ephemeral responses by default
- commands are rejected when `interaction.member.roles` does not include
  `585047138942189603`

Manual verification:

- Register commands in a test guild.
- Set Interactions Endpoint URL in Discord Developer Portal.
- Confirm Discord endpoint validation succeeds.
- Run each command with normal member permissions.
- Run commands without the member role and confirm they are rejected.

## Implementation Plan

1. Add Discord interaction types and response helpers.
2. Add Ed25519 signature verification for Worker runtime.
3. Add `/discord/interactions` route before backend API authorization.
4. Implement `PING` handling.
5. Implement role authorization for `DISCORD_MEMBER_ROLE_ID`.
6. Implement `/absences`.
7. Implement `/schedule`.
8. Add command registration script.
9. Add tests for routing, verification, authorization, and command formatting.
10. Deploy Worker secrets and register guild commands.

## Dev Environment Setup Commands

Set the Discord public key as a Worker secret. The top-level Worker environment
is used for dev.

```bash
cd cloudflare/nb-portal-api
npx wrangler secret put DISCORD_PUBLIC_KEY
```

Set the production Worker secret separately before switching the Discord
Developer Portal endpoint to production.

```bash
cd cloudflare/nb-portal-api
npx wrangler secret put DISCORD_PUBLIC_KEY --env production
```

Deploy the dev Worker.

```bash
cd cloudflare/nb-portal-api
npx wrangler deploy
```

Register the Phase 1 commands in the development guild.

```bash
cd cloudflare/nb-portal-api
DISCORD_APPLICATION_ID=<application-id> \
DISCORD_GUILD_ID=1415328783333986430 \
DISCORD_BOT_TOKEN=<bot-token> \
npm run discord:register
```

For production guild registration, use the production guild ID.

```bash
cd cloudflare/nb-portal-api
DISCORD_APPLICATION_ID=<application-id> \
DISCORD_GUILD_ID=585040080817618955 \
DISCORD_BOT_TOKEN=<bot-token> \
npm run discord:register
```

Configure the Discord Developer Portal Interactions Endpoint URL. Discord has
one endpoint URL per application, so use a separate Discord application for dev
and production if both environments must be available at the same time.

Dev endpoint:

```txt
https://nb-portal-api.nit-housouken.workers.dev/discord/interactions
```

Production endpoint:

```txt
https://nb-portal-api-production.nit-housouken.workers.dev/discord/interactions
```

Manual verification checklist:

- Developer Portal endpoint validation succeeds.
- `/欠席` and `/予定` are visible in the development guild.
- Command responses are visible only to the command runner.
- A member without role `585047138942189603` receives the permission error.
- `/予定` without a date returns upcoming schedules only.
- `/予定` with a date includes multi-day events that overlap that date.
- `/欠席` uses the same daily absence embed style as the scheduled webhook.

## Open Questions

### Permissions

- Confirm whether any admin-only commands are explicitly out of scope.

### Identity

- Do we need to know which NB-Portal member ran the command?
- Is Discord account linking needed now, or only when write commands are added?
- If linking is needed, what should be the verification source?

### Command Details

- None.

### Operations

- Who owns `DISCORD_BOT_TOKEN` and Cloudflare Worker secrets?
- Should Discord command usage be recorded in `access_logs` or a new table?

## References

- Discord Receiving and Responding to Interactions:
  https://docs.discord.com/developers/interactions/receiving-and-responding
- Discord Application Commands:
  https://docs.discord.com/developers/interactions/application-commands
