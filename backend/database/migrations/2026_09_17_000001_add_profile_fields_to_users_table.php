<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('nickname', 60)->nullable()->after('name');
            $table->string('phone', 25)->nullable()->after('email');
            $table->text('bio')->nullable()->after('phone');
            $table->string('avatar_url', 255)->nullable()->after('bio');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['nickname', 'phone', 'bio', 'avatar_url']);
        });
    }
};
