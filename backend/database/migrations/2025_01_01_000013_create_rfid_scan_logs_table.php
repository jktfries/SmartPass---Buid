<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rfid_scan_logs', function (Blueprint $table) {
            $table->id();
            $table->string('rfid_tag', 50);
            $table->string('student_id', 20)->nullable();
            $table->string('room', 50)->nullable();
            $table->dateTime('scanned_at');
            $table->json('raw_payload')->nullable();
            $table->boolean('processed')->default(false);
            $table->timestamps();

            $table->foreign('student_id')->references('student_id')->on('students')->nullOnDelete();
            $table->index('rfid_tag');
            $table->index('scanned_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rfid_scan_logs');
    }
};
