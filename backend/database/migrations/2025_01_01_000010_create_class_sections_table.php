<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->restrictOnDelete();
            $table->foreignId('section_id')->constrained('sections')->restrictOnDelete();
            $table->foreignId('term_id')->constrained('terms')->restrictOnDelete();
            $table->foreignId('professor_id')->constrained('users')->restrictOnDelete();
            $table->string('room', 50)->nullable();
            // Comma-separated days, e.g. "Mon,Wed,Fri"
            $table->string('schedule_days', 100)->nullable();
            $table->time('time_start')->nullable();
            $table->time('time_end')->nullable();
            $table->unsignedSmallInteger('late_threshold_minutes')->default(15);
            $table->timestamps();

            $table->unique(['course_id', 'section_id', 'term_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_sections');
    }
};
