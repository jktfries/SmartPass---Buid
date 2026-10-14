<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->string('student_id', 20);
            $table->foreignId('class_section_id')->constrained('class_sections')->cascadeOnDelete();
            $table->date('date');
            $table->enum('status', ['present', 'late', 'absent', 'excused'])->default('absent');
            $table->foreignId('rfid_scan_log_id')->nullable()->constrained('rfid_scan_logs')->nullOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->foreign('student_id')->references('student_id')->on('students')->cascadeOnDelete();
            $table->unique(['student_id', 'class_section_id', 'date']);
            $table->index(['student_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
