<?php

namespace App\Providers;

use App\Database\PostgresConnection;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register our custom PostgresConnection so booleans are sent as
        // 'TRUE'/'FALSE' literals instead of 1/0. This is necessary when
        // PDO::ATTR_EMULATE_PREPARES is enabled for Supabase PgBouncer.
        Connection::resolverFor('pgsql', function ($connection, $database, $prefix, $config) {
            return new PostgresConnection($connection, $database, $prefix, $config);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Vercel (and most serverless hosts) terminate SSL at the edge and
        // proxy requests internally as plain HTTP. Force HTTPS so that all
        // generated URLs (assets, redirects, API calls) use the correct scheme.
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
