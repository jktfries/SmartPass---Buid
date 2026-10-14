<?php

namespace App\Http\Controllers\Wellness;

use App\Http\Controllers\Controller;
use App\Models\CounselingAppointment;
use App\Models\Student;
use App\Models\StudentCounselorAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CounselingAppointmentController extends Controller
{
    private function formatAppointment(CounselingAppointment $a): array
    {
        return [
            'id'               => $a->id,
            'student_id'       => $a->student_id,
            'student_name'     => $a->student?->user?->name,
            'counselor_id'     => $a->counselor_id,
            'counselor_name'   => $a->counselor?->name,
            'wellness_log_id'  => $a->wellness_log_id,
            'scheduled_at'     => $a->scheduled_at,
            'rescheduled_to'   => $a->rescheduled_to,
            'duration_minutes' => $a->duration_minutes,
            'status'           => $a->status,
            'reason'           => $a->reason,
            'notes'            => $a->notes,
            'created_at'       => $a->created_at,
        ];
    }

    // ─── Student: list own appointments ──────────────────────────────────────

    public function studentIndex(Request $request): JsonResponse
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();

        $appointments = CounselingAppointment::with('counselor')
            ->where('student_id', $student->student_id)
            ->orderByDesc('scheduled_at')
            ->get()
            ->map(fn ($a) => $this->formatAppointment($a));

        return response()->json($appointments);
    }

    // ─── Student: request a new appointment ──────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();

        $assignment = StudentCounselorAssignment::where('student_id', $student->student_id)
            ->where('is_active', true)
            ->first();

        if (!$assignment) {
            return response()->json(['message' => 'No counselor is currently assigned to your account.'], 422);
        }

        $validated = $request->validate([
            'scheduled_at'    => ['required', 'date', 'after:now'],
            'reason'          => ['nullable', 'string', 'max:2000'],
            'wellness_log_id' => ['nullable', 'exists:wellness_logs,id'],
        ]);

        $appointment = CounselingAppointment::create([
            'student_id'      => $student->student_id,
            'counselor_id'    => $assignment->counselor_id,
            'status'          => 'Pending',
            'scheduled_at'    => $validated['scheduled_at'],
            'reason'          => $validated['reason'] ?? null,
            'wellness_log_id' => $validated['wellness_log_id'] ?? null,
        ]);

        $appointment->load('counselor');

        return response()->json($this->formatAppointment($appointment), 201);
    }

    // ─── Student: cancel own appointment ─────────────────────────────────────

    public function cancelOwn(Request $request, int $id): JsonResponse
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();
        $appointment = CounselingAppointment::where('student_id', $student->student_id)->findOrFail($id);

        if (!in_array($appointment->status, ['Pending', 'Approved'], true)) {
            return response()->json(['message' => 'This appointment cannot be cancelled.'], 422);
        }

        $appointment->update(['status' => 'Cancelled']);
        return response()->json(['message' => 'Appointment cancelled']);
    }

    // ─── Counselor: list appointments ────────────────────────────────────────

    public function counselorIndex(Request $request): JsonResponse
    {
        $query = CounselingAppointment::with(['student.user'])
            ->where('counselor_id', $request->user()->id)
            ->orderByDesc('scheduled_at');

        if ($request->query('status')) {
            $query->where('status', $request->query('status'));
        }

        $appointments = $query->get()->map(fn ($a) => $this->formatAppointment($a));
        return response()->json($appointments);
    }

    // ─── Counselor: update appointment status ─────────────────────────────────

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $appointment = CounselingAppointment::where('counselor_id', $request->user()->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'status'         => ['required', 'in:Approved,Declined,Rescheduled,Completed,Cancelled'],
            'notes'          => ['nullable', 'string', 'max:5000'],
            'rescheduled_to' => ['required_if:status,Rescheduled', 'nullable', 'date'],
        ]);

        $appointment->update($validated);

        return response()->json(['message' => 'Status updated', 'status' => $appointment->status]);
    }
}
