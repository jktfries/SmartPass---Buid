<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('counseling_appointments', function (Blueprint $table) {
            $table->id();
            $table->string('student_id', 20);
            $table->foreignId('counselor_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('wellness_log_id')->nullable()->constrained('wellness_logs')->nullOnDelete();
            $table->dateTime('scheduled_at');
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->enum('status', [
                'Pending',
                'Approved',
                'Declined',
                'Rescheduled',
                'Completed',
                'Cancelled',
            ])->default('Pending');
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->dateTime('rescheduled_to')->nullable();
            $table->timestamps();

            $table->foreign('student_id')->references('student_id')->on('students')->cascadeOnDelete();
            $table->index(['student_id', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('counseling_appointments');
    }
};
