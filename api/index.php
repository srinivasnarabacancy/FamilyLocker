<?php

define('LARAVEL_START', microtime(true));

// Vercel has a read-only filesystem except /tmp.
// Mirror the required writable storage directories into /tmp.
$tmpStorage = '/tmp/storage';
$dirs = [
    $tmpStorage . '/framework/cache/data',
    $tmpStorage . '/framework/sessions',
    $tmpStorage . '/framework/views',
    $tmpStorage . '/logs',
    $tmpStorage . '/app/public',
];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Build /tmp/.env from Vercel environment variables so Laravel can boot
// without a committed .env file.
$envFile = '/tmp/.env';
if (!file_exists($envFile)) {
    $lines = [];

    // Merge $_ENV and $_SERVER to catch all injected env vars
    $envVars = array_merge($_SERVER, $_ENV);

    foreach ($envVars as $key => $value) {
        // Only write UPPER_SNAKE_CASE keys (skip HTTP_*, SERVER_* etc.)
        if (!preg_match('/^[A-Z][A-Z0-9_]+$/', $key)) {
            continue;
        }
        // Quote the value if it contains spaces or special characters
        if (preg_match('/[\s"\'\\\\]/', (string) $value)) {
            $value = '"' . addslashes($value) . '"';
        }
        $lines[] = $key . '=' . $value;
    }

    // Safe defaults for drivers that don't work on a read-only serverless FS
    $defaults = [
        'APP_ENV'           => 'production',
        'APP_DEBUG'         => 'false',
        'LOG_CHANNEL'       => 'stderr',
        'SESSION_DRIVER'    => 'cookie',
        'CACHE_STORE'       => 'array',
        'QUEUE_CONNECTION'  => 'sync',
        'FILESYSTEM_DISK'   => 'local',
        'BROADCAST_CONNECTION' => 'log',
    ];
    foreach ($defaults as $key => $default) {
        // Only apply default if the key was not already set by Vercel env vars
        $alreadySet = false;
        foreach ($lines as $line) {
            if (str_starts_with($line, $key . '=')) {
                $alreadySet = true;
                break;
            }
        }
        if (!$alreadySet) {
            $lines[] = $key . '=' . $default;
        }
    }

    file_put_contents($envFile, implode("\n", $lines) . "\n");
}

require __DIR__ . '/../vendor/autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require_once __DIR__ . '/../bootstrap/app.php';

// Point Laravel to the writable /tmp storage path and /tmp/.env
$app->useStoragePath($tmpStorage);
$app->useEnvironmentPath('/tmp');

$app->handleRequest(\Illuminate\Http\Request::capture());
