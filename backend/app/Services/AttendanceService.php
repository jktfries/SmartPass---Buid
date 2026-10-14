<?php

namespace App\Services;

use App\Events\AttendanceBreached;
use App\Models\AttendanceBreachNotification;
use App\Models\AttendanceRecord;
use App\Models\ClassSection;
use App\Models\RfidScanLog;
use App\Models\Student;
use Carbon\Carbon;

class AttendanceService
{
    public function processRfidScan(string $rfidTag, ?string $room = null, ?Carbon $scanTime = null): array
    {
        $scanTime = $scanTime ?? now();

        // 1. Lookup student
        $student = Student::where('rfid_tag', $rfidTag)->first();
        if (!$student) {
            return ['success' => false, 'message' => 'Unknown RFID tag'];
        }

        // 2. Log the raw scan
        $scanLog = RfidScanLog::create([
            'rfid_tag'   => $rfidTag,
            'student_id' => $student->student_id,
            'room'       => $room,
            'scanned_at' => $scanTime,
            'processed'  => false,
        ]);

        // 3. Find a matching class section for this student at this time
        $dayName = $scanTime->format('D'); // "Mon", "Tue", …
        $timeStr = $scanTime->format('H:i:s');

        $query = ClassSection::whereHas('enrollments', function ($q) use ($student) {
            $q->where('student_id', $student->student_id)
              ->where('status', 'enrolled');
        })
        ->whereRaw('FIND_IN_SET(?, schedule_days) > 0', [$dayName])
        ->where('time_start', '<=', $timeStr)
        ->where('time_end', '>=', $timeStr);

        if ($room) {
            $query->where('room', $room);
        }

        $classSection = $query->first();

        if (!$classSection) {
            return ['success' => false, 'message' => 'No active class found for this scan'];
        }

        // 4. Determine present vs late
        $lateDeadline  = Carbon::createFromFormat('H:i:s', $classSection->time_start)
            ->addMinutes((int) $classSection->late_threshold_minutes);
        $scanTimeOfDay = Carbon::createFromFormat('H:i:s', $timeStr);
        $status        = $scanTimeOfDay->lte($lateDeadline) ? 'present' : 'late';

        // 5. Upsert attendance record (idempotent per student/class/date)
        $record = AttendanceRecord::updateOrCreate(
            [
                'student_id'       => $student->student_id,
                'class_section_id' => $classSection->id,
                'date'             => $scanTime->toDateString(),
            ],
            [
                'status'           => $status,
                'rfid_scan_log_id' => $scanLog->id,
            ]
        );

        $scanLog->update(['processed' => true]);

        // 6. Check thresholds and fire breach event if needed
        $this->checkThresholds($student, $classSection);

        return [
            'success'   => true,
            'student'   => $student->student_id,
            'name'      => $student->user?->name,
            'status'    => $status,
            'class'     => $classSection->id,
            'course'    => $classSection->course?->code,
            'date'      => $scanTime->toDateString(),
            'record_id' => $record->id,
        ];
    }

    /**
     * Professor-triggered "simulate a scan" for a specific class section — unlike
     * processRfidScan(), this trusts the caller's explicit class-section choice
     * instead of matching the current day/time against the class schedule, so it
     * works as a demo/testing tool outside actual class hours.
     */
    public function simulateScan(string $rfidTag, int $classSectionId, ?Carbon $scanTime = null): array
    {
        $scanTime = $scanTime ?? now();

        $student = Student::where('rfid_tag', $rfidTag)->first();
        if (!$student) {
            return ['success' => false, 'message' => 'Unknown RFID tag'];
        }

        $classSection = ClassSection::find($classSectionId);
        if (!$classSection) {
            return ['success' => false, 'message' => 'Class section not found'];
        }

        $enrolled = $classSection->enrollments()
            ->where('student_id', $student->student_id)
            ->where('status', 'enrolled')
            ->exists();
        if (!$enrolled) {
            return ['success' => false, 'message' => 'Student is not enrolled in this class'];
        }

        $scanLog = RfidScanLog::create([
            'rfid_tag'   => $rfidTag,
            'student_id' => $student->student_id,
            'room'       => $classSection->room,
            'scanned_at' => $scanTime,
            'processed'  => false,
        ]);

        $timeStr       = $scanTime->format('H:i:s');
        $lateDeadline  = Carbon::createFromFormat('H:i:s', $classSection->time_start)
            ->addMinutes((int) $classSection->late_threshold_minutes);
        $scanTimeOfDay = Carbon::createFromFormat('H:i:s', $timeStr);
        $status        = $scanTimeOfDay->lte($lateDeadline) ? 'present' : 'late';

        $record = AttendanceRecord::updateOrCreate(
            [
                'student_id'       => $student->student_id,
                'class_section_id' => $classSection->id,
                'date'             => $scanTime->toDateString(),
            ],
            [
                'status'           => $status,
                'rfid_scan_log_id' => $scanLog->id,
            ]
        );

        $scanLog->update(['processed' => true]);
        $this->checkThresholds($student, $classSection);

        return [
            'success'   => true,
            'student'   => $student->student_id,
            'name'      => $student->user?->name,
            'status'    => $status,
            'class'     => $classSection->id,
            'course'    => $classSection->course?->code,
            'date'      => $scanTime->toDateString(),
            'record_id' => $record->id,
        ];
    }

    /**
     * Professor directly setting/correcting an attendance record without a scan.
     */
    public function logAttendance(string $studentId, int $classSectionId, string $date, string $status, ?int $recordedBy = null): array
    {
        $student = Student::where('student_id', $studentId)->first();
        if (!$student) {
            return ['success' => false, 'message' => 'Student not found'];
        }

        $classSection = ClassSection::find($classSectionId);
        if (!$classSection) {
            return ['success' => false, 'message' => 'Class section not found'];
        }

        $enrolled = $classSection->enrollments()
            ->where('student_id', $student->student_id)
            ->where('status', 'enrolled')
            ->exists();
        if (!$enrolled) {
            return ['success' => false, 'message' => 'Student is not enrolled in this class'];
        }

        $record = AttendanceRecord::updateOrCreate(
            [
                'student_id'       => $student->student_id,
                'class_section_id' => $classSection->id,
                'date'             => $date,
            ],
            [
                'status'       => $status,
                'recorded_by'  => $recordedBy,
            ]
        );

        $this->checkThresholds($student, $classSection);

        return [
            'success'   => true,
            'student'   => $student->student_id,
            'name'      => $student->user?->name,
            'status'    => $status,
            'class'     => $classSection->id,
            'date'      => $date,
            'record_id' => $record->id,
        ];
    }

    private function checkThresholds(Student $student, ClassSection $classSection): void
    {
        $threshold = $classSection->absenceThreshold;
        if (!$threshold) {
            return;
        }

        $absences = AttendanceRecord::where('student_id', $student->student_id)
            ->where('class_section_id', $classSection->id)
            ->where('status', 'absent')
            ->count();

        $lates = AttendanceRecord::where('student_id', $student->student_id)
            ->where('class_section_id', $classSection->id)
            ->where('status', 'late')
            ->count();

        $this->maybeFireBreach($student, $classSection, 'absences', $absences, $threshold);
        $this->maybeFireBreach($student, $classSection, 'lates', $lates, $threshold);
    }

    private function maybeFireBreach(Student $student, ClassSection $classSection, string $type, int $count, $threshold): void
    {
        $criticalField = 'critical_' . $type;
        $warningField  = 'warning_' . $type;

        if ($count >= $threshold->$criticalField) {
            $severity = 'critical';
        } elseif ($count >= $threshold->$warningField) {
            $severity = 'warning';
        } else {
            return;
        }

        // Deduplicate: only fire once per (student, class, type, count, severity)
        $already = AttendanceBreachNotification::where('student_id', $student->student_id)
            ->where('class_section_id', $classSection->id)
            ->where('breach_type', $type)
            ->where('breach_count', $count)
            ->where('severity', $severity)
            ->exists();

        if (!$already) {
            AttendanceBreached::dispatch($student, $classSection, $type, $count, $severity);
        }
    }
}
