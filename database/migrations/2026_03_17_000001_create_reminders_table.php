<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('family_id');
            $table->unsignedBigInteger('created_by');
            $table->string('title');
            $table->string('type')->default('other'); // birthday, anniversary, holiday, other
            $table->date('occasion_date');            // Full date; year is ignored when recurs_yearly=true
            $table->boolean('recurs_yearly')->default(true);
            $table->integer('remind_days_before')->default(7);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('family_id')->references('id')->on('families')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};
