<?php

namespace App\Services;

use App\Models\CounselingAppointment;
use App\Models\StudentCounselorAssignment;
use App\Models\WellnessLog;

class WellnessService
{
    private const CRITICAL_MOODS    = ['terrible'];
    private const STRUGGLING_MOODS  = ['bad'];
    private const CONCERNING_FACTORS = [
        'depression', 'anxiety', 'self_harm', 'bullying', 'abuse',
        'mental_health', 'family_crisis', 'suicidal_thoughts',
    ];

    public function evaluateRisk(string $mood, ?array $factors): string
    {
        if (in_array($mood, self::CRITICAL_MOODS, true)) {
            return 'critical';
        }

        if (in_array($mood, self::STRUGGLING_MOODS, true)) {
            return 'struggling';
        }

        // okay + concerning factors → struggling
        if ($mood === 'okay' && !empty(array_intersect($factors ?? [], self::CONCERNING_FACTORS))) {
            return 'struggling';
        }

        return 'normal';
    }

    public function maybeAutoCreateAppointment(WellnessLog $log): void
    {
        if ($log->risk_level !== 'critical') {
            return;
        }

        $assignment = StudentCounselorAssignment::where('student_id', $log->student_id)
            ->where('is_active', true)
            ->first();

        if (!$assignment) {
            return;
        }

        // Avoid duplicate auto-appointments for the same log
        $exists = CounselingAppointment::where('student_id', $log->student_id)
            ->where('wellness_log_id', $log->id)
            ->exists();

        if ($exists) {
            return;
        }

        CounselingAppointment::create([
            'student_id'      => $log->student_id,
            'counselor_id'    => $assignment->counselor_id,
            'wellness_log_id' => $log->id,
            'scheduled_at'    => now()->addDay()->setTime(10, 0),
            'status'          => 'Pending',
            'reason'          => 'Auto-created: Critical wellness log submitted',
        ]);
    }
}
