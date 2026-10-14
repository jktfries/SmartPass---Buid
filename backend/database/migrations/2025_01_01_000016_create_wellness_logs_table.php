<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wellness_logs', function (Blueprint $table) {
            $table->id();
            $table->string('student_id', 20);
            $table->enum('mood', ['great', 'good', 'okay', 'bad', 'terrible']);
            $table->json('contributing_factors')->nullable();
            $table->text('notes')->nullable();

            // MultiModal fields (Phase 5)
            $table->boolean('is_multimodal')->default(false);
            $table->string('facial_emotion', 30)->nullable();
            $table->decimal('facial_confidence', 4, 3)->nullable();
            $table->json('facial_microexpressions')->nullable();
            $table->string('voice_emotion', 30)->nullable();
            $table->decimal('voice_confidence', 4, 3)->nullable();
            $table->json('voice_features')->nullable();
            $table->enum('user_validated_feeling', ['excellent','good','neutral','struggling','critical'])->nullable();
            $table->enum('multimodal_consistency', ['high','medium','low','single_mode'])->nullable();
            $table->text('ai_summary')->nullable();
            $table->boolean('wants_counselor_meeting')->default(false);

            // Risk assessment
            $table->enum('risk_level', ['normal', 'struggling', 'critical'])->default('normal');

            // Counselor review fields
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('counselor_notes')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('student_id')->on('students')->cascadeOnDelete();
            $table->index(['student_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wellness_logs');
    }
};
