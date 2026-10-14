<?php

namespace App\Listeners;

use App\Events\AttendanceBreached;
use App\Models\AttendanceBreachNotification;
use App\Models\StudentCounselorAssignment;
use App\Models\UserNotification;

class SendBreachNotifications
{
    public function handle(AttendanceBreached $event): void
    {
        $classSection = $event->classSection->load(['course', 'professor']);
        $student      = $event->student->load('user');
        $course       = $classSection->course;

        $severityLabel = ucfirst($event->severity);
        $title = "{$severityLabel} Alert: {$event->breachCount} {$event->breachType} in {$course->code}";
        $body  = "{$student->user->name} has reached {$event->breachCount} {$event->breachType} "
               . "in {$course->name}.";
        $data  = [
            'class_section_id' => $event->classSection->id,
            'student_id'       => $student->student_id,
            'breach_type'      => $event->breachType,
            'breach_count'     => $event->breachCount,
            'severity'         => $event->severity,
        ];

        // 1. Record the breach
        $breach = AttendanceBreachNotification::create([
            'student_id'       => $student->student_id,
            'class_section_id' => $event->classSection->id,
            'breach_type'      => $event->breachType,
            'breach_count'     => $event->breachCount,
            'severity'         => $event->severity,
        ]);

        // 2. Notify student
        UserNotification::create([
            'user_id' => $student->user_id,
            'type'    => 'attendance_breach',
            'title'   => $title,
            'body'    => $body,
            'data'    => $data,
        ]);
        $breach->update(['notified_student' => true]);

        // 3. Notify professor
        UserNotification::create([
            'user_id' => $classSection->professor_id,
            'type'    => 'attendance_breach',
            'title'   => $title,
            'body'    => $body,
            'data'    => $data,
        ]);
        $breach->update(['notified_professor' => true]);

        // 4. Notify assigned counselor (if any)
        $assignment = StudentCounselorAssignment::where('student_id', $student->student_id)
            ->where('is_active', true)
            ->first();

        if ($assignment) {
            UserNotification::create([
                'user_id' => $assignment->counselor_id,
                'type'    => 'attendance_breach',
                'title'   => $title,
                'body'    => $body,
                'data'    => $data,
            ]);
            $breach->update(['notified_counselor' => true]);
        }
    }
}
