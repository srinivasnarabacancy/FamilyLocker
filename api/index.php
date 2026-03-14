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

require __DIR__ . '/../vendor/autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require_once __DIR__ . '/../bootstrap/app.php';

// Point Laravel to the writable /tmp storage path
$app->useStoragePath($tmpStorage);

$app->handleRequest(\Illuminate\Http\Request::capture());
