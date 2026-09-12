# FamilyLocker

A comprehensive family management platform that helps families organize documents, track expenses, manage medical records, coordinate tasks, and stay connected — all in one private, secure workspace.

> **Migrating from Laravel to Node.js.** The Node backend (`server/`) and the
> standalone Vue SPA are complete; the Laravel app is still in the repository,
> unmodified, as a fallback until the cutover is signed off. See
> [`server/MIGRATION.md`](server/MIGRATION.md) for status, deviations and the
> remaining checklist.

## Features

- **Document Management** — Store important documents (IDs, passports, certificates) with expiry tracking and reminders
- **Expense Tracking** — Log family expenses by category with dashboard analytics
- **Medical Records** — Manage prescriptions, medicines, appointments, and health documents
- **Photo Albums** — Create and organize family photo collections
- **Bill Management** — Track upcoming bills and payment status
- **Task Management** — Assign and track family tasks with status updates
- **Reminders** — Set recurring reminders for birthdays, anniversaries, and special occasions
- **Family Collaboration** — Multi-user workspace with role-based access control (Owner, Admin, Member, Caregiver, Finance Manager, Viewer)

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20+, NestJS 10, TypeScript 5.7 |
| ORM | Prisma 5 (PostgreSQL) |
| Auth | Sanctum-compatible bearer tokens, bcrypt |
| Mail | Nodemailer (SMTP) |
| Frontend | Vue 3.4, Vue Router 4.3, Pinia 2 |
| Build | Vite 7, Sass |
| UI | Bootstrap 5.3, Bootstrap Icons 1.11 |
| Charts | Chart.js 4, vue-chartjs 5 |
| HTTP | Axios 1.13 |
| Testing | `node --test` (serialization/validation parity suite) |

The frontend is a plain SPA — there is no Inertia.js and no server-rendered
shell. It authenticates with bearer tokens against `/api`.

## Prerequisites

- Node.js >= 20 and npm
- A PostgreSQL database (the project targets Supabase)
- An SMTP account — mail is **required**, since registration uses OTP email verification

## Setup

### 1. Backend (`server/`)

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env`:

```env
APP_URL=http://localhost:3000
PORT=3000

# Supabase POOLED connection (PgBouncer, transaction mode, port 6543).
# `pgbouncer=true` is REQUIRED — without it you get intermittent
# "prepared statement already exists" errors under load.
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"

# DIRECT connection (port 5432) — used by `prisma db pull`, which cannot
# run through the transaction pooler.
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require"

# Must match Laravel's BCRYPT_ROUNDS so existing password hashes keep working.
BCRYPT_ROUNDS=12

MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="FamilyLocker"

# `local` writes to ../storage/app/public. Use `supabase` in production —
# serverless filesystems are ephemeral and local uploads will not survive.
STORAGE_DRIVER=local
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_BUCKET=public

# Shared secret for GET /api/cron/reminders. Without it the endpoint 401s.
CRON_SECRET=
```

Generate the Prisma client and build:

```bash
npx prisma generate
npm run build
npm start            # http://localhost:3000
```

> **No migrations are run.** The schema is mapped onto the existing tables with
> `@map`, so nothing is created or altered. Verify the mapping against your
> database with `npx prisma db pull --print`.

### 2. Frontend (project root)

```bash
npm install
npm run dev          # http://localhost:5173, proxies /api to :3000
```

### Which URL do I open?

| URL | What it is |
|---|---|
| `http://localhost:5173` | Vite dev server — hot reload, proxies `/api` to `:3000` |
| `http://localhost:3000` | The built SPA served by Node, same origin as the API |
| ~~`http://localhost:8000`~~ | Laravel — **retired**, no longer serves the frontend |

## Build for Production

```bash
npm run build                       # emits dist/ at the project root
cd server && npm run build          # emits server/dist/
cd server && npm start              # serves the API, the SPA and uploads on one port
```

When `dist/` exists, the Node process serves it with history-mode fallback, so a
single service handles everything.

## Reminders & Email Notifications

### How it works

The reminders module sends a digest email to every verified family member when a
reminder's next occurrence falls within its **"remind days before"** window. The
same job also sends appointment reminders and medicine-completion notices.

- Each reminder has an `occasion_date`, a `type` (birthday, anniversary, holiday, other), a `remind_days_before` value (default: 7), and an optional yearly recurrence flag.
- `notification_sent_at` is stamped after sending so the same reminder is never emailed twice per occurrence cycle. Yearly reminders automatically re-arm the following year.

### Manual trigger

```bash
cd server

# Preview which emails would be sent (no mail dispatched, no DB changes):
npm run cron:reminders -- --dry-run

# Send notifications now:
npm run cron:reminders
```

### Scheduling

**Traditional server** — one cron entry:

```bash
0 8 * * * cd /path/to/project/server && node dist/cron/send-reminders.js >> /var/log/familylocker-reminders.log 2>&1
```

**Vercel (serverless)** — driven by Vercel Cron hitting the HTTP endpoint.
`vercel.node.json` defines it:

```json
"crons": [{ "path": "/api/cron/reminders", "schedule": "0 8 * * *" }]
```

The endpoint is protected by a shared secret. Set `CRON_SECRET` in both your
Vercel project environment variables and `server/.env`; Vercel passes it as
`Authorization: Bearer <CRON_SECRET>`. Any other caller gets a 401.

```bash
# Generate a secret:
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### Mail providers

| Environment | Recommended provider | Notes |
|---|---|---|
| Local development | [Mailtrap sandbox](https://mailtrap.io) | Intercepts all mail — check the Mailtrap inbox, not your real inbox |
| Production | Mailtrap Sending / SendGrid / Mailgun / AWS SES | Delivers to real inboxes |

> Mail is sent inline rather than queued, matching the previous
> `QUEUE_CONNECTION=sync` behaviour. The reminder job paces sends (2s between
> recipients) to stay within relay rate limits.

## Testing

```bash
cd server && npm test
```

The suite covers the parts of the port that fail silently rather than loudly:
Eloquent-compatible date/decimal/bigint serialization, the reminder and
appointment date logic, the paginator shape, and Laravel's validation messages.
Expected values were captured from the running Laravel app, not written from
memory.

To re-verify the Prisma schema against the live database:

```bash
cd server && npx prisma db pull --print      # should report no column drift
```

## Deployment

`vercel.json` still deploys the **PHP** app. The Node configuration is ready in
`vercel.node.json` but is deliberately inactive — activate it when you choose to
cut over:

```bash
mv vercel.node.json vercel.json
```

Required environment variables on the host: `DATABASE_URL`, `DIRECT_URL`,
`APP_URL`, `CRON_SECRET`, `MAIL_*`, and `STORAGE_DRIVER=supabase` with
`SUPABASE_URL` / `SUPABASE_SERVICE_KEY` / `SUPABASE_BUCKET`.

Before cutting over, work through the remaining checklist in
[`server/MIGRATION.md`](server/MIGRATION.md) — in particular the end-to-end
functional test and moving file storage to Supabase.

## Project Structure

```text
FamilyLocker/
├── index.html              # SPA entry point (Vite)
├── vite.config.js          # Standalone SPA build, proxies /api to the Node server
├── resources/
│   ├── css/                # Global SCSS styles
│   ├── static/             # Files copied verbatim into the build (favicon)
│   └── js/
│       ├── app.js          # Vue bootstrap — createApp + router + Pinia
│       ├── composables/    # useForm (API-backed), useToast
│       ├── layouts/        # Vue layout components
│       ├── pages/          # Vue page components
│       ├── router/         # Vue Router config + auth/verified guards
│       ├── services/       # Axios client (bearer token)
│       └── stores/         # Pinia state stores
├── server/                 # ── Node.js backend ──────────────────────
│   ├── prisma/schema.prisma    # Mapped onto the EXISTING tables (no migrations)
│   ├── src/
│   │   ├── auth/           # Sanctum-compatible tokens, guards, OTP, roles
│   │   ├── common/         # Laravel-compatible serialization, validator, storage
│   │   ├── mail/           # Nodemailer service + ported email templates
│   │   ├── modules/        # One controller per Laravel API controller
│   │   ├── cron/           # Standalone reminder job runner
│   │   └── main.ts         # Bootstrap; also serves the SPA and uploads
│   ├── test/               # Serialization + validation parity suite
│   └── MIGRATION.md        # Migration status, deviations, remaining work
└── ── Legacy Laravel (retained for fallback, unmodified) ─────────────
    ├── app/  bootstrap/  config/  database/  routes/  tests/
    └── api/index.php       # Vercel PHP entry point
```

## License

Private. All rights reserved.
