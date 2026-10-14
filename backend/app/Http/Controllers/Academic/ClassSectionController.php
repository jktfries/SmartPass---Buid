<?php

namespace App\Http\Controllers\Academic;

use App\Http\Controllers\Controller;
use App\Models\AbsenceThreshold;
use App\Models\ClassSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassSectionController extends Controller
{
    public function index(): JsonResponse
    {
        $sections = ClassSection::with(['course', 'section', 'term', 'professor', 'absenceThreshold'])
            ->orderByDesc('id')
            ->get()
            ->map(fn ($cs) => $this->format($cs));

        return response()->json($sections);
    }

    public function store(Request $req): JsonResponse
    {
        $validated = $req->validate([
            'course_id'              => ['required', 'exists:courses,id'],
            'section_id'             => ['required', 'exists:sections,id'],
            'term_id'                => ['required', 'exists:terms,id'],
            'professor_id'           => ['required', 'exists:users,id'],
            'room'                   => ['nullable', 'string', 'max:50'],
            'schedule_days'          => ['required', 'string', 'max:100'],
            'time_start'             => ['required', 'date_format:H:i'],
            'time_end'               => ['required', 'date_format:H:i', 'after:time_start'],
            'late_threshold_minutes' => ['integer', 'min:0', 'max:60'],
            // threshold defaults
            'warning_absences'       => ['integer', 'min:1'],
            'critical_absences'      => ['integer', 'min:1'],
            'warning_lates'          => ['integer', 'min:1'],
            'critical_lates'         => ['integer', 'min:1'],
        ]);

        $thresholdData = [
            'warning_absences'  => $validated['warning_absences']  ?? 3,
            'critical_absences' => $validated['critical_absences'] ?? 5,
            'warning_lates'     => $validated['warning_lates']     ?? 5,
            'critical_lates'    => $validated['critical_lates']    ?? 10,
        ];

        // Pad time to H:i:s
        $validated['time_start'] .= ':00';
        $validated['time_end']   .= ':00';

        $cs = ClassSection::create(collect($validated)->except([
            'warning_absences', 'critical_absences', 'warning_lates', 'critical_lates',
        ])->toArray());

        AbsenceThreshold::create(array_merge(['class_section_id' => $cs->id], $thresholdData));

        return response()->json($this->format($cs->load(['course', 'section', 'term', 'professor', 'absenceThreshold'])), 201);
    }

    public function update(Request $req, int $id): JsonResponse
    {
        $cs        = ClassSection::findOrFail($id);
        $validated = $req->validate([
            'professor_id'           => ['sometimes', 'exists:users,id'],
            'room'                   => ['nullable', 'string', 'max:50'],
            'schedule_days'          => ['sometimes', 'string', 'max:100'],
            'time_start'             => ['sometimes', 'date_format:H:i'],
            'time_end'               => ['sometimes', 'date_format:H:i'],
            'late_threshold_minutes' => ['sometimes', 'integer', 'min:0', 'max:60'],
        ]);

        if (isset($validated['time_start'])) $validated['time_start'] .= ':00';
        if (isset($validated['time_end']))   $validated['time_end']   .= ':00';

        $cs->update($validated);
        return response()->json($this->format($cs->load(['course', 'section', 'term', 'professor', 'absenceThreshold'])));
    }

    public function destroy(int $id): JsonResponse
    {
        ClassSection::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    public function getThreshold(int $id): JsonResponse
    {
        $cs        = ClassSection::findOrFail($id);
        $threshold = $cs->absenceThreshold ?? AbsenceThreshold::create([
            'class_section_id'  => $cs->id,
            'warning_absences'  => 3,
            'critical_absences' => 5,
            'warning_lates'     => 5,
            'critical_lates'    => 10,
        ]);
        return response()->json($threshold);
    }

    public function updateThreshold(Request $req, int $id): JsonResponse
    {
        $cs        = ClassSection::findOrFail($id);
        $validated = $req->validate([
            'warning_absences'  => ['required', 'integer', 'min:1'],
            'critical_absences' => ['required', 'integer', 'min:1'],
            'warning_lates'     => ['required', 'integer', 'min:1'],
            'critical_lates'    => ['required', 'integer', 'min:1'],
        ]);

        $threshold = $cs->absenceThreshold
            ? tap($cs->absenceThreshold)->update($validated)
            : AbsenceThreshold::create(array_merge(['class_section_id' => $cs->id], $validated));

        return response()->json($threshold);
    }

    private function format(ClassSection $cs): array
    {
        return [
            'id'                     => $cs->id,
            'course_code'            => $cs->course?->code,
            'course_name'            => $cs->course?->name,
            'section'                => $cs->section?->name,
            'term'                   => $cs->term?->label,
            'professor_id'           => $cs->professor_id,
            'professor_name'         => $cs->professor?->name,
            'room'                   => $cs->room,
            'schedule_days'          => $cs->schedule_days,
            'time_start'             => $cs->time_start,
            'time_end'               => $cs->time_end,
            'late_threshold_minutes' => $cs->late_threshold_minutes,
            'threshold'              => $cs->absenceThreshold ? [
                'warning_absences'  => $cs->absenceThreshold->warning_absences,
                'critical_absences' => $cs->absenceThreshold->critical_absences,
                'warning_lates'     => $cs->absenceThreshold->warning_lates,
                'critical_lates'    => $cs->absenceThreshold->critical_lates,
            ] : null,
        ];
    }
}
