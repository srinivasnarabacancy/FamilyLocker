# FamilyLocker

A comprehensive family management platform that helps families organize documents, track expenses, manage medical records, coordinate tasks, and stay connected — all in one private, secure workspace.

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
| Backend | PHP 8.2+, Laravel 12, Laravel Sanctum 4.3 |
| Frontend | Vue 3.4, Vue Router 4.3, Pinia 2 |
| Build | Vite 7, Sass |
| UI | Bootstrap 5.3, Bootstrap Icons 1.11 |
| Charts | Chart.js 4, vue-chartjs 5 |
| HTTP | Axios 1.13 |
| Integration | Inertia.js 2 |
| Testing | PHPUnit 11 (SQLite in-memory) |

## Prerequisites

- PHP >= 8.2 with extensions: `mbstring`, `pdo`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`
- Composer >= 2
- Node.js >= 18 & npm
- MySQL / PostgreSQL database

## Setup

### 1. Install dependencies

```bash
composer install
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` and set the following:

```env
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=familylocker
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

MAIL_MAILER=smtp
MAIL_HOST=your_mail_host
MAIL_PORT=587
MAIL_USERNAME=your_mail_user
MAIL_PASSWORD=your_mail_password
MAIL_FROM_ADDRESS=noreply@yourdomain.com

# Use 'sync' locally so emails send immediately without a queue worker.
# Use 'database' or 'redis' in production and run: php artisan queue:work
QUEUE_CONNECTION=sync
```

> Mail must be configured — OTP-based email verification is required for registration, and reminder notifications are sent via email.

#### Mail provider options

| Environment | Recommended provider | Notes |
|---|---|---|
| Local development | [Mailtrap sandbox](https://mailtrap.io) | Intercepts all mail — check the Mailtrap inbox, not your real inbox |
| Production | Mailtrap Sending / SendGrid / Mailgun / AWS SES | Delivers to real inboxes |

**Mailtrap sandbox** (local testing):
```env
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<mailtrap-inbox-username>
MAIL_PASSWORD=<mailtrap-inbox-password>
```

**Gmail SMTP** (quick production alternative):
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your-google-app-password   # Generate at: Google Account > Security > App Passwords
```

### 3. Run migrations

```bash
php artisan migrate
php artisan storage:link
```

### 4. Start the development servers

```bash
php artisan serve   # Laravel on http://localhost:8000
npm run dev         # Vite asset compilation
```

## Reminders & Email Notifications

### How it works

The reminders module sends a digest email to every verified family member when a reminder's next occurrence falls within its **"remind days before"** window.

- Each reminder has an `occasion_date`, a `type` (birthday, anniversary, holiday, other), a `remind_days_before` value (default: 7), and an optional yearly recurrence flag.
- A scheduled Artisan command checks all active reminders daily and dispatches emails for those that are due.
- `notification_sent_at` is stamped after sending so the same reminder is never emailed twice per occurrence cycle. Yearly reminders automatically re-arm the following year.

### Scheduler setup

The command is registered in `routes/console.php` to run every day at **08:00**:

```bash
# Add this single cron entry to your server to drive all scheduled tasks:
* * * * * cd /path/to/project && php artisan schedule:run >> /dev/null 2>&1
```

### Manual trigger

```bash
# Preview which emails would be sent (no mail dispatched, no DB changes):
php artisan reminders:notify --dry-run

# Send notifications now:
php artisan reminders:notify
```

### Queue

Emails are dispatched via the queue. Set `QUEUE_CONNECTION` in `.env`:

| Value | Behavior |
|---|---|
| `sync` | Sends immediately in the same process — no worker needed (recommended locally) |
| `database` | Stores jobs in the `jobs` table — requires `php artisan queue:work` |
| `redis` | Uses Redis — requires a worker and Redis server |

```bash
# Start a queue worker (when QUEUE_CONNECTION=database or redis):
php artisan queue:work
```

> **Mailtrap sandbox note:** Emails sent via the Mailtrap sandbox never reach real inboxes. Check the Mailtrap dashboard inbox to preview notification emails during local development.

---

## Build for Production

```bash
npm run build
```

## Testing

```bash
php artisan test
# or
composer test
```

Tests run against an in-memory SQLite database. Feature tests cover authentication (OTP verification), profile management, family invitations, and role management.

## Deployment

The project includes a `vercel.json` for deployment on Vercel using the `vercel-php` runtime. The build command is `npm run build` and all routes are handled through `api/index.php`.

For other environments, ensure:
- `APP_ENV=production` and `APP_DEBUG=false`
- Storage and cache directories are writable
- A queue worker is running if using `QUEUE_CONNECTION=database`

## Project Structure

```text
FamilyLocker/
├── app/
│   ├── Http/Controllers/   # API and web controllers
│   ├── Models/             # Eloquent models
│   └── ...
├── database/
│   └── migrations/         # All database schema definitions
├── resources/
│   ├── css/                # Global SCSS styles
│   ├── js/
│   │   ├── layouts/        # Vue layout components
│   │   ├── pages/          # Vue page components
│   │   ├── router/         # Vue Router configuration
│   │   ├── services/       # API service modules
│   │   └── stores/         # Pinia state stores
│   └── views/              # Blade templates (SPA shell)
├── routes/
│   ├── api.php             # API routes (Sanctum protected)
│   └── web.php             # Web routes (serves Vue SPA)
└── tests/
    ├── Feature/            # Feature/integration tests
    └── Unit/               # Unit tests
```

## License

Private. All rights reserved.
