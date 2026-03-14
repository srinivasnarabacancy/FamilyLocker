# FamilyLocker

FamilyLocker now follows a standard Laravel-at-the-root structure, with the Vue SPA living inside Laravel's asset pipeline.

## Structure

```text
FamilyLocker/
├── app/
├── bootstrap/
├── config/
├── database/
├── public/
├── resources/
│   ├── css/
│   ├── js/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── router/
│   │   ├── services/
│   │   └── stores/
│   └── views/
├── routes/
├── storage/
├── tests/
├── artisan
├── composer.json
├── package.json
└── vite.config.js
```

## Frontend Placement

- Vue source is in `resources/js`
- Global SPA styles are in `resources/css/app.scss`
- The SPA shell Blade file is in `resources/views/app.blade.php`
- Laravel serves the Vue app through `routes/web.php`

## Setup

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link
```

Run the app with the normal Laravel flow:

```bash
php artisan serve
npm run dev
```

The app will be available from Laravel at `http://localhost:8000`, and API requests stay on the same origin at `/api`.

## Build

```bash
npm run build
```

## Notes

- The old split `apps/backend` and `apps/frontend` layout was converted into this standard structure.
- Vue Router, Pinia, Bootstrap, and the existing SPA pages were preserved during the move.
