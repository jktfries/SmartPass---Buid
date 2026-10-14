<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_breach_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('student_id', 20);
            $table->foreignId('class_section_id')->constrained('class_sections')->cascadeOnDelete();
            $table->enum('breach_type', ['absences', 'lates']);
            $table->unsignedTinyInteger('breach_count');
            $table->enum('severity', ['warning', 'critical'])->default('warning');
            $table->boolean('notified_student')->default(false);
            $table->boolean('notified_counselor')->default(false);
            $table->boolean('notified_professor')->default(false);
            $table->timestamps();

            $table->foreign('student_id')->references('student_id')->on('students')->cascadeOnDelete();
            $table->index(['student_id', 'class_section_id'], 'abn_student_class_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_breach_notifications');
    }
};
