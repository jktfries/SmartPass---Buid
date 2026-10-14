<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_counselor_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('student_id', 20);
            $table->foreignId('counselor_id')->constrained('users')->cascadeOnDelete();
            $table->date('assigned_at');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('student_id')->references('student_id')->on('students')->cascadeOnDelete();
            $table->unique(['student_id', 'counselor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_counselor_assignments');
    }
};
