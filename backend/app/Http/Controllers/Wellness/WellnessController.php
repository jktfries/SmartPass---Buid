<?php

namespace App\Http\Controllers\Wellness;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentCounselorAssignment;
use App\Models\WellnessLog;
use App\Services\WellnessService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WellnessController extends Controller
{
    public function __construct(private WellnessService $wellnessService) {}

    // ─── Student: submit multimodal log ─────────────────────────────────────

    public function storeMultimodal(Request $request): JsonResponse
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();

        $validated = $request->validate([
            'user_validated_feeling'  => ['required', 'in:excellent,good,neutral,struggling,critical'],
            'notes'                   => ['nullable', 'string', 'max:2000'],
            'wants_counselor_meeting' => ['boolean'],
            // Facial
            'facial_emotion'          => ['nullable', 'string', 'max:30'],
            'facial_confidence'       => ['nullable', 'numeric', 'between:0,1'],
            'facial_microexpressions' => ['nullable', 'array'],
            // Voice
            'voice_emotion'           => ['nullable', 'string', 'max:30'],
            'voice_confidence'        => ['nullable', 'numeric', 'between:0,1'],
            'voice_features'          => ['nullable', 'array'],
            // Derived
            'multimodal_consistency'  => ['nullable', 'in:high,medium,low,single_mode'],
            'ai_summary'              => ['nullable', 'string', 'max:1000'],
        ]);

        // Map validated feeling → mood for risk scoring
        $feelingToMood = [
            'excellent' => 'great',
            'good'      => 'good',
            'neutral'   => 'okay',
            'struggling'=> 'bad',
            'critical'  => 'terrible',
        ];
        $mood = $feelingToMood[$validated['user_validated_feeling']];
        $riskLevel = $this->wellnessService->evaluateRisk($mood, null);

        $log = WellnessLog::create([
            'student_id'              => $student->student_id,
            'mood'                    => $mood,
            'notes'                   => $validated['notes'] ?? null,
            'risk_level'              => $riskLevel,
            'is_multimodal'           => true,
            'wants_counselor_meeting' => $validated['wants_counselor_meeting'] ?? false,
            'user_validated_feeling'  => $validated['user_validated_feeling'],
            'facial_emotion'          => $validated['facial_emotion'] ?? null,
            'facial_confidence'       => $validated['facial_confidence'] ?? null,
            'facial_microexpressions' => $validated['facial_microexpressions'] ?? null,
            'voice_emotion'           => $validated['voice_emotion'] ?? null,
            'voice_confidence'        => $validated['voice_confidence'] ?? null,
            'voice_features'          => $validated['voice_features'] ?? null,
            'multimodal_consistency'  => $validated['multimodal_consistency'] ?? 'single_mode',
            'ai_summary'              => $validated['ai_summary'] ?? null,
        ]);

        $this->wellnessService->maybeAutoCreateAppointment($log);

        return response()->json([
            'id'         => $log->id,
            'mood'       => $log->mood,
            'risk_level' => $log->risk_level,
            'logged_at'  => $log->created_at,
        ], 201);
    }

    // ─── Student: submit a new log ───────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();

        $validated = $request->validate([
            'mood'                   => ['required', 'in:great,good,okay,bad,terrible'],
            'contributing_factors'   => ['nullable', 'array'],
            'contributing_factors.*' => ['string', 'max:60'],
            'notes'                  => ['nullable', 'string', 'max:2000'],
        ]);

        $riskLevel = $this->wellnessService->evaluateRisk(
            $validated['mood'],
            $validated['contributing_factors'] ?? null
        );

        $log = WellnessLog::create([
            'student_id'           => $student->student_id,
            'mood'                 => $validated['mood'],
            'contributing_factors' => $validated['contributing_factors'] ?? null,
            'notes'                => $validated['notes'] ?? null,
            'risk_level'           => $riskLevel,
        ]);

        $this->wellnessService->maybeAutoCreateAppointment($log);

        return response()->json([
            'id'         => $log->id,
            'mood'       => $log->mood,
            'risk_level' => $log->risk_level,
            'logged_at'  => $log->created_at,
        ], 201);
    }

    // ─── Student: edit own log (only while unreviewed) ──────────────────────

    public function update(Request $request, int $id): JsonResponse
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();

        $log = WellnessLog::where('id', $id)
            ->where('student_id', $student->student_id)
            ->firstOrFail();

        abort_if($log->reviewed_at !== null, 403, 'This log has already been reviewed by a counselor and can no longer be edited.');

        $validated = $request->validate([
            'mood'                   => ['required', 'in:great,good,okay,bad,terrible'],
            'contributing_factors'   => ['nullable', 'array'],
            'contributing_factors.*' => ['string', 'max:60'],
            'notes'                  => ['nullable', 'string', 'max:2000'],
        ]);

        $riskLevel = $this->wellnessService->evaluateRisk(
            $validated['mood'],
            $validated['contributing_factors'] ?? null
        );

        $log->update([
            'mood'                 => $validated['mood'],
            'contributing_factors' => $validated['contributing_factors'] ?? null,
            'notes'                => $validated['notes'] ?? null,
            'risk_level'           => $riskLevel,
        ]);

        $this->wellnessService->maybeAutoCreateAppointment($log);

        return response()->json([
            'id'         => $log->id,
            'mood'       => $log->mood,
            'risk_level' => $log->risk_level,
            'logged_at'  => $log->created_at,
        ]);
    }

    // ─── Student: delete own log (only while unreviewed) ────────────────────

    public function destroy(Request $request, int $id): JsonResponse
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();

        $log = WellnessLog::where('id', $id)
            ->where('student_id', $student->student_id)
            ->firstOrFail();

        abort_if($log->reviewed_at !== null, 403, 'This log has already been reviewed by a counselor and can no longer be deleted.');

        $log->delete();

        return response()->json(['message' => 'Wellness log deleted']);
    }

    // ─── Student: list own logs ──────────────────────────────────────────────

    public function studentIndex(Request $request): JsonResponse
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();

        $logs = WellnessLog::where('student_id', $student->student_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($l) => [
                'id'                   => $l->id,
                'mood'                 => $l->mood,
                'risk_level'           => $l->risk_level,
                'contributing_factors' => $l->contributing_factors,
                'notes'                => $l->notes,
                'logged_at'            => $l->created_at,
                'reviewed_at'          => $l->reviewed_at,
                'counselor_notes'      => $l->counselor_notes,
            ]);

        return response()->json($logs);
    }

    // ─── Counselor: list wellness logs ───────────────────────────────────────

    public function counselorIndex(Request $request): JsonResponse
    {
        $counselorId = $request->user()->id;

        $assignedIds = StudentCounselorAssignment::where('counselor_id', $counselorId)
            ->where('is_active', true)
            ->pluck('student_id');

        $query = WellnessLog::with('student.user')
            ->orderByDesc('created_at');

        if ($assignedIds->isNotEmpty()) {
            $query->whereIn('student_id', $assignedIds);
        } else {
            // No assigned students — return empty
            $query->whereRaw('1 = 0');
        }

        if ($request->query('risk_level')) {
            $query->where('risk_level', $request->query('risk_level'));
        }

        if ($request->boolean('unreviewed')) {
            $query->whereNull('reviewed_at');
        }

        $logs = $query->paginate(25);

        return response()->json([
            'data'  => collect($logs->items())->map(fn ($l) => [
                'id'                   => $l->id,
                'student_id'           => $l->student_id,
                'student_name'         => $l->student?->user?->name,
                'mood'                 => $l->mood,
                'risk_level'           => $l->risk_level,
                'contributing_factors' => $l->contributing_factors,
                'notes'                => $l->notes,
                'logged_at'            => $l->created_at,
                'reviewed_at'          => $l->reviewed_at,
                'counselor_notes'      => $l->counselor_notes,
                'is_multimodal'        => (bool) $l->is_multimodal,
            ]),
            'total' => $logs->total(),
            'last_page' => $logs->lastPage(),
        ]);
    }

    // ─── Counselor: wellness statistics + trend ──────────────────────────────

    public function counselorWellnessStats(Request $request): JsonResponse
    {
        $counselorId = $request->user()->id;
        $assignedIds = StudentCounselorAssignment::where('counselor_id', $counselorId)
            ->pluck('student_id');

        $baseQuery = fn () => WellnessLog::when(
            $assignedIds->isNotEmpty(),
            fn ($q) => $q->whereIn('student_id', $assignedIds),
            fn ($q) => $q->whereRaw('1 = 0')
        );

        $distribution = $baseQuery()
            ->select('risk_level', \Illuminate\Support\Facades\DB::raw('COUNT(*) as cnt'))
            ->groupBy('risk_level')
            ->pluck('cnt', 'risk_level');

        $totalStudents   = $assignedIds->count();
        $unreviewedCount = $baseQuery()->whereNull('reviewed_at')->count();
        $criticalCount   = (int) ($distribution['critical'] ?? 0);

        // 8-week risk trend
        $riskTrend = [];
        for ($i = 7; $i >= 0; $i--) {
            $monday = Carbon::now()->startOfWeek()->subWeeks($i);
            $sunday = $monday->copy()->endOfWeek();

            $week = $baseQuery()
                ->whereBetween('created_at', [$monday->startOfDay(), $sunday->endOfDay()])
                ->select('risk_level', \Illuminate\Support\Facades\DB::raw('COUNT(*) as cnt'))
                ->groupBy('risk_level')
                ->pluck('cnt', 'risk_level');

            $riskTrend[] = [
                'week_label' => $monday->format('M j'),
                'week_start' => $monday->toDateString(),
                'normal'     => (int) ($week['normal']     ?? 0),
                'struggling' => (int) ($week['struggling'] ?? 0),
                'critical'   => (int) ($week['critical']   ?? 0),
            ];
        }

        return response()->json([
            'risk_distribution' => [
                'normal'     => (int) ($distribution['normal']     ?? 0),
                'struggling' => (int) ($distribution['struggling'] ?? 0),
                'critical'   => (int) ($distribution['critical']   ?? 0),
            ],
            'total_students'   => $totalStudents,
            'unreviewed_count' => $unreviewedCount,
            'critical_count'   => $criticalCount,
            'risk_trend'       => $riskTrend,
        ]);
    }

    // ─── Counselor: review a log ─────────────────────────────────────────────

    public function review(Request $request, int $id): JsonResponse
    {
        $log = WellnessLog::findOrFail($id);

        $validated = $request->validate([
            'counselor_notes' => ['nullable', 'string', 'max:5000'],
            'risk_level'      => ['sometimes', 'in:normal,struggling,critical'],
        ]);

        $log->update([
            ...$validated,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json(['message' => 'Review saved', 'reviewed_at' => $log->reviewed_at]);
    }
}
