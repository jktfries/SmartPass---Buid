<?php

namespace App\Http\Controllers\Enrollment;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    public function indexStudents(): JsonResponse
    {
        $students = Student::with(['user', 'program', 'section'])
            ->orderBy('student_id')
            ->get()
            ->map(fn ($s) => [
                'student_id' => $s->student_id,
                'name'       => $s->user?->name,
                'email'      => $s->user?->email,
                'program'    => $s->program?->code,
                'section'    => $s->section?->name,
            ]);

        return response()->json($students);
    }

    public function forStudent(string $studentId): JsonResponse
    {
        $enrollments = StudentEnrollment::with(['classSection.course', 'classSection.term'])
            ->where('student_id', $studentId)
            ->orderByDesc('id')
            ->get()
            ->map(fn ($e) => [
                'id'               => $e->id,
                'class_section_id' => $e->class_section_id,
                'status'           => $e->status,
                'course_code'      => $e->classSection?->course?->code,
                'course_name'      => $e->classSection?->course?->name,
                'term'             => $e->classSection?->term?->label,
                'schedule_days'    => $e->classSection?->schedule_days,
                'time_start'       => $e->classSection?->time_start,
            ]);

        return response()->json($enrollments);
    }

    public function store(Request $req): JsonResponse
    {
        $validated = $req->validate([
            'student_id'       => ['required', 'exists:students,student_id'],
            'class_section_id' => ['required', 'exists:class_sections,id'],
        ]);

        $enrollment = StudentEnrollment::firstOrCreate(
            ['student_id' => $validated['student_id'], 'class_section_id' => $validated['class_section_id']],
            ['status' => 'enrolled']
        );

        if ($enrollment->status !== 'enrolled') {
            $enrollment->update(['status' => 'enrolled']);
        }

        return response()->json($enrollment, 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $enrollment = StudentEnrollment::findOrFail($id);
        $enrollment->update(['status' => 'dropped']);
        return response()->json(null, 204);
    }
}
