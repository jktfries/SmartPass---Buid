<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->enum('recipient_type', ['individual', 'group', 'broadcast']);
            // For group: e.g. "section:12" or "role:student" — nullable for individual
            $table->string('group_target', 100)->nullable();
            $table->string('subject', 255)->nullable();
            $table->text('body');
            $table->timestamps();

            $table->index(['sender_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
