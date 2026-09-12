# Laravel → Node.js migration

The Node service in `server/` is a port of the Laravel backend. It talks to the
**same Supabase database** — no schema changes, no data migration — so both
stacks can run side by side while the cutover is verified.

## Status

| Area | State |
|---|---|
| API endpoints | **71/71 ported** (verified against `php artisan route:list`) |
| Database schema | Verified against live DB — no column drift |
| Eloquent models | 15/15 ported as Prisma models + presenters |
| Mailables + templates | 6/6 ported |
| Scheduled reminder job | Ported (HTTP endpoint + CLI); dry-run verified against the live DB |
| Auth | Sanctum-token compatible; sessions dropped (see Deviations) |
| Serialization parity | 14 tests, values captured from the running Laravel app |
| Frontend | **Ported off Inertia** — SPA on vue-router + bearer tokens |
| Deployment | Node config written but **not activated** (`vercel.node.json`) |

## Running it

Backend:

```bash
cd server
cp .env.example .env      # fill in DATABASE_URL / DIRECT_URL / mail
npm install
npx prisma generate
npm run build
npm start                 # http://localhost:3000
npm test                  # serialization + validation parity suite
```

Frontend, in development (Vite on :5173, proxying /api to :3000):

```bash
npm install
npm run dev
```

Frontend, built — the Node process then serves the SPA, the API and uploads
from a single port:

```bash
npm run build             # emits dist/
cd server && npm start    # http://localhost:3000
```

Reminder job, equivalent to `php artisan reminders:notify`:

```bash
node dist/cron/send-reminders.js --dry-run
```

## How parity is held

The frontend is unchanged, so responses must be byte-compatible with Laravel's.
Three things silently differ between Eloquent and Prisma, and each is funnelled
through one place:

- **Dates** — Eloquent serializes Carbon with six fractional digits
  (`2026-03-14T09:15:30.000000Z`). `toISOString()` emits three, so it is not
  interchangeable. A `'date'` cast is *still* a full midnight timestamp, not
  `YYYY-MM-DD`. See `src/common/laravel.ts`.
- **Decimals** — `'decimal:2'` renders as a **string** (`"1250.50"`).
- **BigInt** — ids must serialize as JSON numbers.

`src/common/presenters.ts` has one presenter per model, each spelling out that
model's `$casts`, `$hidden` and `$appends`. They are hand-written rather than
reflected, because the cast list is the contract with the frontend.

`src/common/validator.ts` is a focused port of Laravel's Validator, so the rule
strings were copied across verbatim from the PHP and the error messages the Vue
error handlers display are unchanged.

## Frontend cutover

Inertia is gone: no `@inertiajs/vue3`, no `laravel-vite-plugin`, no Blade entry
point. The app is a standalone Vite SPA that authenticates with bearer tokens.

The structure was already there — `resources/js/router/index.js` had the full
vue-router config and `App.vue` already rendered `<router-view />`; Inertia had
simply been layered on top. What changed:

| Was | Now |
|---|---|
| `createInertiaApp` in `app.js` | `createApp` + router + Pinia |
| `useForm` from Inertia | `@/composables/useForm` — same surface, API-backed |
| `usePage().props.auth.user` | `useAuthStore().user` |
| `usePage().props.pageTitle` | `route.meta.title` |
| `usePage().props.flash` | `showToast()` at the call site |
| `<Link href>` | `<RouterLink to>` |
| `router.visit` / `router.post` | vue-router + auth-store actions |
| `X-CSRF-TOKEN` + session cookie | `Authorization: Bearer` |
| Blade `app.blade.php` | `index.html` at the project root |
| `CsrfMetaSync.vue`, `bootstrap.js` | deleted |

`useForm` deliberately mirrors Inertia's shape (`form.errors`, `form.processing`,
`form.post`) so the page templates did not have to be rewritten. It adds
`form.error` for non-field failures — the 401 on a bad login, which Inertia used
to deliver as a flashed session error.

Route guards replace the Laravel middleware they mirror: `guest`, `auth` and
`verified`. An unverified account can reach only the OTP screen, matching the
server-side `VerifiedGuard`.

## Deviations from Laravel (deliberate)

1. **Session auth dropped; tokens only.** Laravel used `statefulApi()`, so
   `/api/*` accepted either an encrypted PHP session cookie or a Sanctum bearer
   token. Node cannot read Laravel's session cookie (AES + PHP serialization
   under `APP_KEY`), so the port standardises on bearer tokens. The wire format
   is Sanctum's exact `{id}|{plaintext}` with a SHA-256 hash at rest, so **tokens
   minted by Laravel authenticate here and vice-versa** — which is what makes
   running both at once safe.

2. **OTP replaces the signed verification link.** The Laravel *API* called
   `sendEmailVerificationNotification()`, which mails a signed link — but
   `routes/web.php` never registered a handler for it, so that link 404s. The
   working path in production is the OTP flow in the Inertia controller. The port
   uses OTP everywhere and adds `POST /api/auth/verify-otp` (the one route not
   present in Laravel's API) to replace the Inertia web route.

3. **Login returns a token even when unverified**, with
   `requires_verification: true`, so the SPA can reach the OTP screen. Every
   protected endpoint stays blocked by `VerifiedGuard`. This mirrors the Inertia
   flow, which logged the user in and then relied on `verified` middleware —
   rather than the API's `403 + logout`, which left the client with no way to
   verify.

4. **`otp_code` / `otp_expires_at` are no longer serialized.** The Eloquent model
   hid only `password` and `remember_token`, so the live API leaks the OTP on
   `GET /auth/me` and — the real problem — on `GET /family/members`, where any
   member can read another member's live verification code. No frontend code
   reads these fields, so removing them is invisible to the client.

5. **A failed invitation e-mail no longer rolls back the member.** Laravel
   deleted the user when the mail failed. The row is kept and a 500 returned, so
   the owner can resend instead of silently losing the invite.

6. **Registration is transactional.** The Laravel API version created the family
   and user in two unwrapped statements, which could strand an orphan family row.

7. **The `PostgresConnection` boolean hack is gone.** It existed only because
   PDO with `ATTR_EMULATE_PREPARES` cast booleans to `1`/`0`, which Postgres
   rejected. The `pg` driver binds booleans natively.

## Known gaps / remaining work

**Before this can take production traffic:**

- [ ] **End-to-end functional test.** The SPA builds, every route resolves, the
      API answers correctly, and `npm run cron:reminders -- --dry-run` completes
      cleanly against the production database (read-only: it queries reminders,
      appointments and medicines and sends nothing). But the register → OTP →
      dashboard flow has NOT been exercised against a live database. The only reachable database is
      production, and creating test users there was not something to do
      unprompted. This needs a staging database, or a deliberate throwaway
      account on production.
- [ ] **Contract tests against live Laravel.** The parity suite covers
      serialization and validation. It does not yet diff full responses for all
      71 endpoints against the running PHP app. That is the check that would make
      the cutover provable rather than argued; budget about a week.
- [ ] **File storage.** `STORAGE_DRIVER=supabase` must be enabled in production,
      along with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. Until it is, every
      upload 500s: the driver falls back to `local`, which writes to
      `../storage/app/public` — outside the only writable path on Vercel. The
      service now fails with a message naming the missing variable rather than a
      bare "Server Error".

      Laravel wrote uploads to the local disk, and Vercel's filesystem is
      ephemeral (`api/index.php` redirects storage into `/tmp`), so uploads there
      did not survive between invocations. Existing rows hold paths like
      `documents/xyz.pdf`; the Supabase driver keeps that layout, but **files
      already on disk need a one-off copy into the bucket**.

      Reads go through `StorageController` at `/storage/<path>` — the URL the SPA
      builds and the one `vercel.json` rewrites into the function. It streams
      from the bucket with the service key, so the bucket can stay private.
- [ ] **Rate limiting is per-process.** `ThrottleGuard` counts in memory, so on
      more than one instance each enforces its own budget. Laravel used the
      shared `cache` table. Move to Redis or the DB before scaling out.
- [ ] **Activate deployment.** `vercel.json` still deploys the PHP app.
      `vercel.node.json` holds the ready Node config — activate it with
      `mv vercel.node.json vercel.json` when you choose to cut over. It is left
      inactive on purpose: renaming it changes what the next push deploys.

**Known behaviour preserved on purpose, worth revisiting later:**

- `PATCH /tasks/:id/status` and `PUT /bills/:id` accept unvalidated input, as in
  Laravel.
- `updateMedicine` writes `is_active` and `notify_on_completion` from
  `$request->boolean(...)` unconditionally, so omitting either flag sets it to
  false rather than leaving it alone.
- `GET /bills` has a write side effect: it flips past-due pending bills to
  `overdue` before returning the page.
- Search filters use case-sensitive `LIKE`, matching the Postgres behaviour the
  Laravel queries had.
- Mail is sent inline (Laravel ran `QUEUE_CONNECTION=sync`), with the same
  2s/5s pauses between recipients that the Artisan command used.

## Rollback

**Database:** untouched. No schema change, no data migration. Tokens issued by
either stack remain valid on both.

**Backend:** free. No Laravel file was modified, so pointing traffic back at the
PHP app restores the previous behaviour exactly.

**Frontend:** needs a `git revert` of the frontend commit. The Vite build no
longer emits the Laravel manifest that `@vite`/`app.blade.php` reads, so Laravel
can no longer serve the SPA as it stands. The PHP app and its Inertia routes are
still present and unmodified — only the asset pipeline moved.
