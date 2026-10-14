<?php

namespace App\Events;

use App\Models\ClassSection;
use App\Models\Student;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AttendanceBreached
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Student      $student,
        public readonly ClassSection $classSection,
        public readonly string       $breachType,  // 'absences' | 'lates'
        public readonly int          $breachCount,
        public readonly string       $severity,    // 'warning' | 'critical'
    ) {}
}
