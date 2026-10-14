<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Student;
use App\Models\WellnessLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    // GET /admin/reports/attendance
    public function attendance(Request $request): JsonResponse
    {
        $termId = $request->query('term_id');

        $query = AttendanceRecord::query()
            ->select('student_id',
                DB::raw("SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) AS present"),
                DB::raw("SUM(CASE WHEN status='Late'    THEN 1 ELSE 0 END) AS late"),
                DB::raw("SUM(CASE WHEN status='Absent'  THEN 1 ELSE 0 END) AS absent"),
                DB::raw("SUM(CASE WHEN status='Excused' THEN 1 ELSE 0 END) AS excused"),
                DB::raw('COUNT(*) AS total')
            )
            ->groupBy('student_id');

        $rows = $query->get();

        // Attach student names
        $studentMap = Student::with('user:id,name')
            ->whereIn('student_id', $rows->pluck('student_id'))
            ->get()
            ->keyBy('student_id');

        $data = $rows->map(fn ($r) => [
            'student_id'   => $r->student_id,
            'student_name' => $studentMap[$r->student_id]?->user?->name ?? $r->student_id,
            'present'      => (int) $r->present,
            'late'         => (int) $r->late,
            'absent'       => (int) $r->absent,
            'excused'      => (int) $r->excused,
            'total'        => (int) $r->total,
            'rate'         => $r->total > 0
                ? round((($r->present + $r->late) / $r->total) * 100, 1)
                : 0,
        ]);

        $summary = [
            'total_students'  => $data->count(),
            'avg_attendance'  => $data->count() > 0
                ? round($data->avg('rate'), 1)
                : 0,
            'total_absences'  => $data->sum('absent'),
            'total_lates'     => $data->sum('late'),
        ];

        return response()->json(['summary' => $summary, 'data' => $data]);
    }

    // GET /admin/reports/trends
    public function trends(): JsonResponse
    {
        // 8-week attendance trend
        $attendanceTrend = [];
        for ($i = 7; $i >= 0; $i--) {
            $monday = Carbon::now()->startOfWeek()->subWeeks($i);
            $sunday = $monday->copy()->endOfWeek();

            $rows = AttendanceRecord::whereBetween('date', [$monday->toDateString(), $sunday->toDateString()])
                ->select(
                    DB::raw("SUM(CASE WHEN LOWER(status)='present' THEN 1 ELSE 0 END) AS present"),
                    DB::raw("SUM(CASE WHEN LOWER(status)='late'    THEN 1 ELSE 0 END) AS late"),
                    DB::raw("SUM(CASE WHEN LOWER(status)='absent'  THEN 1 ELSE 0 END) AS absent"),
                    DB::raw('COUNT(*) AS total')
                )
                ->first();

            $present = (int) ($rows->present ?? 0);
            $late    = (int) ($rows->late    ?? 0);
            $absent  = (int) ($rows->absent  ?? 0);
            $total   = (int) ($rows->total   ?? 0);

            $attendanceTrend[] = [
                'week_label'    => $monday->format('M j'),
                'week_start'    => $monday->toDateString(),
                'avg_rate'      => $total > 0 ? round(($present + $late) / $total * 100, 1) : 0,
                'total_present' => $present,
                'total_late'    => $late,
                'total_absent'  => $absent,
            ];
        }

        // 8-week wellness risk trend
        $wellnessTrend = [];
        for ($i = 7; $i >= 0; $i--) {
            $monday = Carbon::now()->startOfWeek()->subWeeks($i);
            $sunday = $monday->copy()->endOfWeek();

            $week = WellnessLog::whereBetween('created_at', [$monday->startOfDay(), $sunday->endOfDay()])
                ->select('risk_level', DB::raw('COUNT(*) as cnt'))
                ->groupBy('risk_level')
                ->pluck('cnt', 'risk_level');

            $wellnessTrend[] = [
                'week_label' => $monday->format('M j'),
                'week_start' => $monday->toDateString(),
                'normal'     => (int) ($week['normal']     ?? 0),
                'struggling' => (int) ($week['struggling'] ?? 0),
                'critical'   => (int) ($week['critical']   ?? 0),
            ];
        }

        // Per-program breakdown
        $programs = Student::with('program:id,code')
            ->get()
            ->groupBy(fn ($s) => $s->program?->code ?? 'Unknown');

        $programBreakdown = $programs->map(function ($students, $programCode) {
            $studentIds = $students->pluck('student_id');
            $rows = AttendanceRecord::whereIn('student_id', $studentIds)
                ->select(
                    DB::raw("SUM(CASE WHEN LOWER(status)='present' THEN 1 ELSE 0 END) AS present"),
                    DB::raw("SUM(CASE WHEN LOWER(status)='late'    THEN 1 ELSE 0 END) AS late"),
                    DB::raw('COUNT(*) AS total')
                )
                ->first();

            $total = (int) ($rows->total ?? 0);
            return [
                'program'        => $programCode,
                'avg_rate'       => $total > 0
                    ? round(((($rows->present ?? 0) + ($rows->late ?? 0)) / $total) * 100, 1)
                    : 0,
                'total_students' => $students->count(),
            ];
        })->values();

        return response()->json([
            'attendance_trend'  => $attendanceTrend,
            'wellness_trend'    => $wellnessTrend,
            'program_breakdown' => $programBreakdown,
        ]);
    }

    // GET /admin/reports/attendance/csv
    public function attendanceCsv(): Response
    {
        $rows = AttendanceRecord::query()
            ->select('student_id',
                DB::raw("SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) AS present"),
                DB::raw("SUM(CASE WHEN status='Late'    THEN 1 ELSE 0 END) AS late"),
                DB::raw("SUM(CASE WHEN status='Absent'  THEN 1 ELSE 0 END) AS absent"),
                DB::raw("SUM(CASE WHEN status='Excused' THEN 1 ELSE 0 END) AS excused"),
                DB::raw('COUNT(*) AS total')
            )
            ->groupBy('student_id')
            ->get();

        $studentMap = Student::with('user:id,name')
            ->whereIn('student_id', $rows->pluck('student_id'))
            ->get()->keyBy('student_id');

        $lines = ["Student ID,Student Name,Present,Late,Absent,Excused,Total,Attendance Rate"];
        foreach ($rows as $r) {
            $name = $studentMap[$r->student_id]?->user?->name ?? $r->student_id;
            $rate = $r->total > 0 ? round((($r->present + $r->late) / $r->total) * 100, 1) : 0;
            $lines[] = implode(',', [
                $r->student_id, "\"{$name}\"",
                $r->present, $r->late, $r->absent, $r->excused, $r->total, "{$rate}%",
            ]);
        }

        return response(implode("\n", $lines), 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="attendance_report.csv"',
        ]);
    }

    // GET /admin/reports/wellness
    public function wellness(): JsonResponse
    {
        $breakdown = WellnessLog::query()
            ->select('risk_level', DB::raw('COUNT(*) AS count'))
            ->groupBy('risk_level')
            ->pluck('count', 'risk_level');

        $recent = WellnessLog::with('student.user:id,name')
            ->whereIn('risk_level', ['struggling', 'critical'])
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn ($l) => [
                'id'           => $l->id,
                'student_id'   => $l->student_id,
                'student_name' => $l->student?->user?->name ?? $l->student_id,
                'mood'         => $l->mood,
                'risk_level'   => $l->risk_level,
                'logged_at'    => $l->created_at,
            ]);

        $total = WellnessLog::count();

        return response()->json([
            'summary' => [
                'total_logs' => $total,
                'normal'     => (int) ($breakdown['normal']     ?? 0),
                'struggling' => (int) ($breakdown['struggling'] ?? 0),
                'critical'   => (int) ($breakdown['critical']   ?? 0),
            ],
            'recent_flagged' => $recent,
        ]);
    }

    // GET /admin/reports/wellness/csv
    public function wellnessCsv(): Response
    {
        $logs = WellnessLog::with('student.user:id,name')
            ->orderByDesc('created_at')
            ->get();

        $lines = ["Student ID,Student Name,Mood,Risk Level,Is MultiModal,Logged At"];
        foreach ($logs as $l) {
            $name = $l->student?->user?->name ?? $l->student_id;
            $lines[] = implode(',', [
                $l->student_id, "\"{$name}\"", $l->mood, $l->risk_level,
                $l->is_multimodal ? 'Yes' : 'No',
                $l->created_at?->toDateTimeString() ?? '',
            ]);
        }

        return response(implode("\n", $lines), 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="wellness_report.csv"',
        ]);
    }
}
