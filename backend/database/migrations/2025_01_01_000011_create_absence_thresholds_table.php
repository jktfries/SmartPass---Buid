<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('absence_thresholds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_section_id')->unique()->constrained('class_sections')->cascadeOnDelete();
            $table->unsignedTinyInteger('warning_absences')->default(3);
            $table->unsignedTinyInteger('critical_absences')->default(5);
            $table->unsignedTinyInteger('warning_lates')->default(5);
            $table->unsignedTinyInteger('critical_lates')->default(10);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('absence_thresholds');
    }
};
