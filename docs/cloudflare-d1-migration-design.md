# Cloudflare D1 Migration Design

## Status

This is a design note for moving selected backend storage from Google Apps Script
and Sheets to Cloudflare Workers + D1.

`items` is intentionally excluded from the first migration because the item
registration model is expected to change. Keep the current GAS-backed item
workflow until the new item schema is decided.

## Goals

- Move portal-owned persistent data to Cloudflare D1 where the schema is stable.
- Keep the existing Next.js UI and route handlers mostly unchanged.
- Preserve the current API response shape during migration.
- Avoid a full hosting migration from Vercel/Next.js to Cloudflare at this step.
- Keep rollback simple by switching individual resources back to GAS.

## Non-Goals

- Do not migrate `items` in the first D1 phase.
- Do not rewrite the frontend data model as part of the database migration.
- Do not move the whole Next.js app to Cloudflare Pages/Workers yet.
- Do not introduce Prisma until the D1 schema and Worker API are stable.

## Recommended Architecture

```txt
Next.js App Router
  app/api/*
    - auth()
    - CSRF validation
    - zod request validation
    - revalidateTag()
    - fetch D1 backend API

Cloudflare Worker API
  /members
  /schedules
  /absences
  /event-absences
  /next-meeting
  /dashboard-data
  /health

Cloudflare D1
  members
  schedules
  absences
  next_meeting_settings
  access_logs
  push_subscriptions
```

The Worker should expose an API compatible with the current GAS paths. The
Next.js app can then replace `GAS_API_URL` with a backend abstraction such as
`DATA_BACKEND=gas|d1` and `D1_BACKEND_URL`.

## Why Worker + D1 API

D1 is normally accessed through Cloudflare Worker bindings. Since this app is
currently a Next.js app, likely deployed outside Cloudflare Workers, the safest
approach is to put a small Worker API in front of D1 and keep Next.js as the
authenticated frontend/backend-for-frontend layer.

This avoids coupling the whole app deployment to Cloudflare while still moving
the database away from GAS.

## Prisma Decision

Do not adopt Prisma in the first D1 migration.

Reasons:

- Prisma lists Cloudflare D1 as Preview, so it is not as stable as the usual
  PostgreSQL/MySQL/SQLite paths.
- Cloudflare documents Prisma under community/ecosystem tooling, not as a core
  D1-maintained path.
- This app's first migration needs a small number of predictable queries.
  Raw SQL behind a thin repository layer is easier to inspect, tune, and debug.
- D1 pricing and limits are row-scan sensitive. Hand-written indexed queries are
  easier to reason about during the migration.

Revisit Prisma after:

- `members`, `schedules`, `absences`, and `next_meeting_settings` have stable
  schemas.
- Migration and rollback have been tested.
- Query volume and row-read metrics are visible in Cloudflare.

If an ORM/query builder is needed earlier, prefer evaluating Drizzle or Kysely
for D1 before Prisma because they map more directly to Worker bindings and SQL.

References:

- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare D1 community projects: https://developers.cloudflare.com/d1/reference/community-projects/
- Prisma supported databases: https://www.prisma.io/docs/orm/reference/supported-databases

## Data Ownership

### Migrated in First Phase

- `members`
- `schedules`
- `absences`
- `next_meeting_settings`
- `access_logs`, if logs should become queryable
- `push_subscriptions`, if push delivery state should move out of GAS

### Deferred

- `items`

Keep `items` on GAS for now. The future design should be written after the new
registration fields, item identifiers, categories, ownership model, and status
workflow are known.

## Proposed Schema

Use text timestamps in ISO 8601 format unless a later decision standardizes Unix
milliseconds. SQLite/D1 has no native datetime type, so the app should normalize
dates at the boundary.

```sql
CREATE TABLE members (
  student_number TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  grade TEXT,
  permission TEXT NOT NULL DEFAULT 'NORMAL',
  discord_id TEXT,
  email TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  description TEXT,
  attendance_mode TEXT NOT NULL DEFAULT 'ABSENCE',
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE absences (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  student_number TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  reason_detail TEXT,
  time_step_out TEXT,
  time_return TEXT,
  time_leaving_early TEXT,
  event_title TEXT,
  event_date_label TEXT,
  event_time_label TEXT,
  event_where TEXT,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, student_number)
);

CREATE TABLE next_meeting_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  event_id TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  mode TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
CREATE INDEX idx_members_permission ON members(permission);
CREATE INDEX idx_members_is_active ON members(is_active);

CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_attendance_mode ON schedules(attendance_mode);

CREATE INDEX idx_absences_event_id ON absences(event_id);
CREATE INDEX idx_absences_student_number ON absences(student_number);
CREATE INDEX idx_absences_submitted_at ON absences(submitted_at);
```

D1 billing and free limits are based heavily on rows read and rows written. Any
query used by dashboard, calendar, or event-absence views should have an index
matching its `WHERE` clause.

## API Compatibility

The Worker should accept the same logical paths currently used by GAS:

- `GET /?path=members`
- `GET /?path=schedules`
- `GET /?path=absences&date=YYYY-MM-DD`
- `GET /?path=event-absences&eventId=...`
- `GET /?path=next-meeting`
- `GET /?path=dashboard-data`
- `GET /?path=health`

Write endpoints can either preserve the current path style or move to clearer
REST paths internally:

- `POST /members`
- `POST /members/update`
- `POST /members/delete`
- `POST /schedules`
- `POST /schedules/update`
- `POST /schedules/delete`
- `POST /absences`
- `POST /absences/delete`
- `POST /next-meeting`

The response envelope should remain compatible:

```ts
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
  message?: string;
  timestamp?: string;
};
```

## Security

Keep user authentication in Next.js through `auth()`. The Cloudflare Worker
should not trust browser clients directly.

Recommended Worker protection:

- Require a shared server-to-server secret from Next.js.
- Send `x-nb-portal-api-key` or an HMAC signature header.
- Reject requests without the secret before touching D1.
- Keep CSRF validation in the existing Next.js route handlers.
- Keep permission checks such as `HEAD` and `SUB_HEAD` in Next.js initially.

Permission logic can move into the Worker later if other clients need to call it.

## Cloudflare Project Setup

Create the Cloudflare resources before application wiring, but after this design
is accepted.

Recommended order:

1. Create a Cloudflare Worker project.
2. Create separate D1 databases for development and production.
3. Add D1 bindings in `wrangler.toml`.
4. Add SQL migrations under the Worker project.
5. Implement `/health` and one read-only endpoint first.
6. Import a copy of GAS data into the development D1 database.
7. Point local Next.js at the Worker development URL.
8. Migrate one domain at a time.

Example resource names:

```txt
Worker: nb-portal-api
D1 dev: nb_portal_dev
D1 prod: nb_portal_prod
Binding: DB
```

## Migration Plan

### Phase 1: Foundation

- Add Worker project.
- Add D1 migrations.
- Add API secret.
- Add health check.
- Add a small DB access layer using prepared SQL statements.

### Phase 2: Read-Only Mirror

- Export GAS data.
- Import to D1 development database.
- Implement read endpoints.
- Compare GAS and D1 responses for:
  - `members`
  - `schedules`
  - `absences`
  - `next-meeting`
  - `dashboard-data`

### Phase 3: Controlled Writes

- Move `members` writes first.
- Move `next-meeting` writes next.
- Move `schedules` writes after calendar and dashboard checks.
- Move `absences` last because it affects notifications and event attendance.

### Phase 4: Cutover

- Switch `DATA_BACKEND=d1` in production.
- Monitor D1 row reads, row writes, errors, and Worker logs.
- Keep GAS data and rollback path available during the first production window.

## Rollback

The Next.js data layer should support switching each resource back to GAS while
the Worker stabilizes.

Recommended environment shape:

```txt
DATA_BACKEND=gas | d1
D1_BACKEND_URL=https://...
D1_BACKEND_API_KEY=...
GAS_API_URL=https://...
```

If possible, make the switch per resource:

```txt
MEMBERS_BACKEND=d1
SCHEDULES_BACKEND=gas
ABSENCES_BACKEND=gas
NEXT_MEETING_BACKEND=d1
ITEMS_BACKEND=gas
```

## Open Questions

- Should `members` preserve spreadsheet-style `headers` and `values`, or should
  the UI move to typed member fields?
- What is the canonical `schedule.id` format?
- Should `next_meeting_settings.event_id` always reference `schedules.id`?
- Should access logs and push subscriptions move in the same Worker project or a
  later phase?
- What is the future item registration model?
