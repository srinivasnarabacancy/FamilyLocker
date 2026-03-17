<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
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
