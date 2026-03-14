<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('family_id')->nullable()->after('id');
            $table->string('role')->default('member')->after('family_id'); // owner, admin, member
            $table->string('avatar')->nullable()->after('role');
            $table->string('phone')->nullable()->after('avatar');
            $table->date('date_of_birth')->nullable()->after('phone');
            $table->string('relation')->nullable()->after('date_of_birth'); // father, mother, son, daughter, etc.
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['family_id', 'role', 'avatar', 'phone', 'date_of_birth', 'relation']);
        });
    }
};
