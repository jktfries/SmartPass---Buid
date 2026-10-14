<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\ClassSection;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\WellnessLog;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    public function __construct(private readonly AttendanceService $attendanceService) {}

    // GET /student/dashboard
    public function studentDashboard(Request $request): JsonResponse
    {
        $student = Student::with(['user', 'program', 'section'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $summaries = $this->buildStudentSummaries($student, includeRecords: false);

        $overallPresent = array_sum(array_column($summaries, 'present'));
        $overallLate    = array_sum(array_column($summaries, 'late'));
        $overallAbsent  = array_sum(array_column($summaries, 'absent'));
        $overallTotal   = $overallPresent + $overallLate + $overallAbsent;

        return response()->json([
            'student_id'              => $student->student_id,
            'name'                    => $student->user->name,
            'program'                 => $student->program?->code ?? '',
            'section'                 => $student->section?->name ?? '',
            'summaries'               => $summaries,
            'overall_present'         => $overallPresent,
            'overall_absent'          => $overallAbsent,
            'overall_late'            => $overallLate,
            'overall_attendance_rate' => $overallTotal > 0
                ? round(($overallPresent + $overallLate) / $overallTotal * 100, 1)
                : 0,
        ]);
    }

    // GET /student/attendance
    public function studentAttendance(Request $request): JsonResponse
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();
        $summaries = $this->buildStudentSummaries($student, includeRecords: true);
        return response()->json($summaries);
    }

    // POST /student/attendance/simulate-scan
    //
    // Demo-only counterpart to the professor's simulate-scan: the student taps a
    // course and we log against the system clock, so it produces exactly what the
    // real reader would (present or late — never absent, since absent is the
    // *absence* of a scan).
    public function studentSimulateScan(Request $request): JsonResponse
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();

        $validated = $request->validate([
            'class_section_id' => ['required', 'integer'],
        ]);

        if (!$student->rfid_tag) {
            return response()->json([
                'success' => false,
                'message' => 'You have no RFID tag on file. Ask an administrator to assign one.',
            ], 422);
        }

        // simulateScan() upserts on (student, class, date), so a scan would
        // silently overwrite a record a professor set by hand — including an
        // absent. Refuse instead of letting the student clear their own mark.
        // recorded_by is only ever written by logAttendance().
        $manual = AttendanceRecord::where('student_id', $student->student_id)
            ->where('class_section_id', $validated['class_section_id'])
            ->whereDate('date', now()->toDateString())
            ->whereNotNull('recorded_by')
            ->exists();

        if ($manual) {
            return response()->json([
                'success' => false,
                'message' => "Your professor already recorded today's attendance for this class, so a scan can't change it.",
            ], 422);
        }

        $result = $this->attendanceService->simulateScan(
            $student->rfid_tag,
            $validated['class_section_id'],
        );

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    // GET /professor/class-sections
    public function professorClassSections(Request $request): JsonResponse
    {
        $classSections = ClassSection::with(['course', 'section', 'term'])
            ->where('professor_id', $request->user()->id)
            ->get()
            ->map(function ($cs) {
                $enrolledCount = StudentEnrollment::where('class_section_id', $cs->id)
                    ->where('status', 'enrolled')
                    ->count();

                return [
                    'id'              => $cs->id,
                    'course_code'     => $cs->course->code,
                    'course_name'     => $cs->course->name,
                    'section'         => $cs->section->name,
                    'room'            => $cs->room,
                    'schedule_days'   => $cs->schedule_days,
                    'time_start'      => $cs->time_start,
                    'time_end'        => $cs->time_end,
                    'term'            => $cs->term?->label ?? '',
                    'enrolled_count'  => $enrolledCount,
                ];
            });

        return response()->json($classSections);
    }

    // GET /professor/class-sections/{id}/attendance
    public function classAttendance(Request $request, int $id): JsonResponse
    {
        $cs = ClassSection::with(['course', 'section', 'term'])
            ->where('id', $id)
            ->where('professor_id', $request->user()->id)
            ->firstOrFail();

        $enrollments = StudentEnrollment::with(['student.user'])
            ->where('class_section_id', $cs->id)
            ->where('status', 'enrolled')
            ->get();

        $students = $enrollments->map(function ($enrollment) use ($cs) {
            $student = $enrollment->student;
            $records = AttendanceRecord::where('student_id', $student->student_id)
                ->where('class_section_id', $cs->id)
                ->orderBy('date')
                ->get();

            $present = $records->where('status', 'present')->count();
            $late    = $records->where('status', 'late')->count();
            $absent  = $records->where('status', 'absent')->count();
            $total   = $records->count();

            return [
                'student_id'      => $student->student_id,
                'name'            => $student->user?->name ?? '',
                'present'         => $present,
                'late'            => $late,
                'absent'          => $absent,
                'attendance_rate' => $total > 0
                    ? round(($present + $late) / $total * 100, 1)
                    : 0,
                'records'         => $records->map(fn ($r) => [
                    'date'   => $r->date->toDateString(),
                    'status' => $r->status,
                ])->values(),
            ];
        });

        return response()->json([
            'class_section' => [
                'id'            => $cs->id,
                'course_code'   => $cs->course->code,
                'course_name'   => $cs->course->name,
                'section'       => $cs->section->name,
                'room'          => $cs->room,
                'schedule_days' => $cs->schedule_days,
                'time_start'    => $cs->time_start,
                'time_end'      => $cs->time_end,
                'term'          => $cs->term?->label ?? '',
            ],
            'students' => $students,
        ]);
    }

    // POST /professor/class-sections/{id}/attendance/simulate-scan
    public function simulateScan(Request $request, int $id): JsonResponse
    {
        $cs = ClassSection::where('id', $id)
            ->where('professor_id', $request->user()->id)
            ->firstOrFail();

        $validated = $request->validate([
            'student_id' => ['required', 'string'],
        ]);

        $student = Student::where('student_id', $validated['student_id'])->firstOrFail();
        if (!$student->rfid_tag) {
            return response()->json(['success' => false, 'message' => 'This student has no RFID tag on file'], 422);
        }

        $result = $this->attendanceService->simulateScan($student->rfid_tag, $cs->id);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    // POST /professor/class-sections/{id}/attendance/log
    public function logAttendance(Request $request, int $id): JsonResponse
    {
        $cs = ClassSection::where('id', $id)
            ->where('professor_id', $request->user()->id)
            ->firstOrFail();

        $validated = $request->validate([
            'student_id' => ['required', 'string'],
            'date'       => ['required', 'date'],
            'status'     => ['required', 'in:present,late,absent,excused'],
        ]);

        $result = $this->attendanceService->logAttendance(
            $validated['student_id'],
            $cs->id,
            $validated['date'],
            $validated['status'],
            $request->user()->id,
        );

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    // GET /student/dashboard/trends
    public function studentDashboardTrends(Request $request): JsonResponse
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();
        $driver  = DB::connection()->getDriverName();

        // Build 8 ISO weeks (oldest first)
        $weeks = [];
        for ($i = 7; $i >= 0; $i--) {
            $monday = Carbon::now()->startOfWeek()->subWeeks($i);
            $sunday = $monday->copy()->endOfWeek();

            $records = AttendanceRecord::where('student_id', $student->student_id)
                ->whereBetween('date', [$monday->toDateString(), $sunday->toDateString()])
                ->get();

            $present = $records->where('status', 'present')->count()
                     + $records->where('status', 'Present')->count();
            $late    = $records->where('status', 'late')->count()
                     + $records->where('status', 'Late')->count();
            $absent  = $records->where('status', 'absent')->count()
                     + $records->where('status', 'Absent')->count();
            $total   = $present + $late + $absent;

            $weeks[] = [
                'week_label' => $monday->format('M j'),
                'week_start' => $monday->toDateString(),
                'present'    => $present,
                'late'       => $late,
                'absent'     => $absent,
                'rate'       => $total > 0 ? round(($present + $late) / $total * 100, 1) : 0,
            ];
        }

        // Last 14 days mood history
        $moodScoreMap = ['great' => 4, 'good' => 4, 'okay' => 3, 'bad' => 2, 'terrible' => 1];
        $cutoff = Carbon::now()->subDays(13)->startOfDay();
        $moodHistory = WellnessLog::where('student_id', $student->student_id)
            ->where('created_at', '>=', $cutoff)
            ->orderBy('created_at')
            ->get()
            ->map(fn ($l) => [
                'date'       => $l->created_at->toDateString(),
                'mood'       => $l->mood,
                'mood_score' => $moodScoreMap[$l->mood] ?? 3,
            ]);

        return response()->json(['weeks' => $weeks, 'mood_history' => $moodHistory]);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function buildStudentSummaries(Student $student, bool $includeRecords): array
    {
        $enrollments = StudentEnrollment::with(['classSection.course'])
            ->where('student_id', $student->student_id)
            ->where('status', 'enrolled')
            ->get();

        return $enrollments->map(function ($enrollment) use ($student, $includeRecords) {
            $cs = $enrollment->classSection;

            $records = AttendanceRecord::where('student_id', $student->student_id)
                ->where('class_section_id', $cs->id)
                ->orderBy('date', 'desc')
                ->get();

            $present = $records->where('status', 'present')->count();
            $late    = $records->where('status', 'late')->count();
            $absent  = $records->where('status', 'absent')->count();
            $excused = $records->where('status', 'excused')->count();
            $total   = $records->count();

            $summary = [
                'class_section_id' => $cs->id,
                'course_code'      => $cs->course->code,
                'course_name'      => $cs->course->name,
                'schedule_days'    => $cs->schedule_days,
                'time_start'       => $cs->time_start,
                'time_end'         => $cs->time_end,
                'room'             => $cs->room,
                'total_sessions'   => $total,
                'present'          => $present,
                'late'             => $late,
                'absent'           => $absent,
                'excused'          => $excused,
                'attendance_rate'  => $total > 0
                    ? round(($present + $late) / $total * 100, 1)
                    : 0,
            ];

            if ($includeRecords) {
                $summary['records'] = $records->map(fn ($r) => [
                    'id'      => $r->id,
                    'date'    => $r->date->toDateString(),
                    'status'  => $r->status,
                    'remarks' => $r->remarks,
                ])->values();
            }

            return $summary;
        })->values()->toArray();
    }
}
