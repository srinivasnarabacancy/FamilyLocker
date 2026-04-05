<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reminders', function (Blueprint $table) {
            // Tracks the last date a notification email was dispatched.
            // Null means no notification has ever been sent.
            // Reset to null after each yearly cycle so next year's notification fires.
            $table->date('notification_sent_at')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('reminders', function (Blueprint $table) {
            $table->dropColumn('notification_sent_at');
        });
    }
};
