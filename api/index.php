<?php

define('LARAVEL_START', microtime(true));

// Vercel has a read-only filesystem except /tmp.
// Mirror the required writable directories into /tmp.
$tmpStorage   = '/tmp/storage';
$tmpBootstrap = '/tmp/bootstrap';

$dirs = [
    $tmpStorage   . '/framework/cache/data',
    $tmpStorage   . '/framework/sessions',
    $tmpStorage   . '/framework/views',
    $tmpStorage   . '/logs',
    $tmpStorage   . '/app/public',
    $tmpBootstrap . '/cache',
];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Copy bootstrap cache files to /tmp so Laravel can update them if needed.
// This also provides a writable location for package discovery on cold starts.
$bootstrapCacheSource = __DIR__ . '/../bootstrap/cache';
foreach (['packages.php', 'services.php'] as $cacheFile) {
    $dest = $tmpBootstrap . '/cache/' . $cacheFile;
    $src  = $bootstrapCacheSource . '/' . $cacheFile;
    if (!file_exists($dest) && file_exists($src)) {
        copy($src, $dest);
    }
}

// Build /tmp/.env from Vercel environment variables so Laravel can boot
// without a committed .env file.
// Always regenerate so new Vercel env vars are picked up immediately.
$envFile = '/tmp/.env';

$lines = [];

// Merge $_ENV and $_SERVER to catch all injected env vars
$envVars = array_merge($_SERVER, $_ENV);

foreach ($envVars as $key => $value) {
    // Only write UPPER_SNAKE_CASE keys (skip HTTP_*, SERVER_* etc.)
    if (!preg_match('/^[A-Z][A-Z0-9_]+$/', $key)) {
        continue;
    }
    // Quote values that contain characters dotenv may misparse
    if (preg_match('/[\s"\'\\\\#&$!|<>]/', (string) $value)) {
        $value = '"' . addslashes($value) . '"';
    }
    $lines[] = $key . '=' . $value;
}

// Safe serverless defaults (only applied if not already set by Vercel env vars)
$defaults = [
    'APP_ENV'              => 'production',
    'APP_DEBUG'            => 'false',
    'LOG_CHANNEL'          => 'stderr',
    'SESSION_DRIVER'       => 'cookie',
    'CACHE_STORE'          => 'array',
    'QUEUE_CONNECTION'     => 'sync',
    'FILESYSTEM_DISK'      => 'local',
    'BROADCAST_CONNECTION' => 'log',
    // Point Laravel to the writable copies of the bootstrap cache manifests
    'APP_PACKAGES_CACHE'   => $tmpBootstrap . '/cache/packages.php',
    'APP_SERVICES_CACHE'   => $tmpBootstrap . '/cache/services.php',
    // Compiled views path (picked up by config/view.php)
    'VIEW_COMPILED_PATH'   => $tmpStorage . '/framework/views',
    // Never silently drop emails in production
    'MAIL_MAILER'          => 'smtp',
];
$writtenKeys = array_map(fn($l) => explode('=', $l, 2)[0], $lines);
foreach ($defaults as $key => $default) {
    if (!in_array($key, $writtenKeys, true)) {
        $lines[] = $key . '=' . $default;
    }
}

file_put_contents($envFile, implode("\n", $lines) . "\n");

require __DIR__ . '/../vendor/autoload.php';

// On Vercel, PHP runs as api/index.php so $_SERVER['SCRIPT_NAME'] = '/api/index.php'.
// Symfony's Request uses SCRIPT_NAME to compute a base-path and strips '/api'
// from every incoming URI before Laravel's router sees it — causing 404s for
// all API calls (/api/dashboard → /dashboard, /api/documents → /documents, etc.).
// Resetting SCRIPT_NAME to '/index.php' makes Symfony treat '/' as the base,
// so the full URI is preserved and Laravel's routes resolve correctly.
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF']    = '/index.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require __DIR__ . '/../bootstrap/app.php';

// Point Laravel to the writable /tmp storage path and /tmp/.env
$app->useStoragePath($tmpStorage);
$app->useEnvironmentPath('/tmp');

$app->handleRequest(\Illuminate\Http\Request::capture());
