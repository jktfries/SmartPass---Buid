<?php

namespace App\Http\Controllers\Academic;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Course;
use App\Models\Department;
use App\Models\Program;
use App\Models\Section;
use App\Models\Term;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AcademicStructureController extends Controller
{
    // =====================================================================
    // Academic Years
    // =====================================================================

    public function indexAcademicYears(): JsonResponse
    {
        return response()->json(AcademicYear::withCount('terms')->orderByDesc('id')->get());
    }

    public function storeAcademicYear(Request $req): JsonResponse
    {
        $validated = $req->validate([
            'label'     => ['required', 'string', 'max:20', 'unique:academic_years,label'],
            'is_active' => ['boolean'],
        ]);

        if (!empty($validated['is_active'])) {
            AcademicYear::query()->update(['is_active' => false]);
        }

        $year = AcademicYear::create($validated);
        return response()->json($year, 201);
    }

    public function updateAcademicYear(Request $req, int $id): JsonResponse
    {
        $year      = AcademicYear::findOrFail($id);
        $validated = $req->validate([
            'label'     => ['sometimes', 'string', 'max:20', "unique:academic_years,label,{$id}"],
            'is_active' => ['boolean'],
        ]);

        if (!empty($validated['is_active'])) {
            AcademicYear::where('id', '!=', $id)->update(['is_active' => false]);
        }

        $year->update($validated);
        return response()->json($year);
    }

    public function destroyAcademicYear(int $id): JsonResponse
    {
        AcademicYear::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    // =====================================================================
    // Terms
    // =====================================================================

    public function indexTerms(): JsonResponse
    {
        return response()->json(
            Term::with('academicYear')->orderByDesc('id')->get()
        );
    }

    public function storeTerm(Request $req): JsonResponse
    {
        $validated = $req->validate([
            'label'            => ['required', 'string', 'max:50'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'start_date'       => ['nullable', 'date'],
            'end_date'         => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_active'        => ['boolean'],
        ]);

        if (!empty($validated['is_active'])) {
            Term::query()->update(['is_active' => false]);
        }

        $term = Term::create($validated);
        return response()->json($term->load('academicYear'), 201);
    }

    public function updateTerm(Request $req, int $id): JsonResponse
    {
        $term      = Term::findOrFail($id);
        $validated = $req->validate([
            'label'      => ['sometimes', 'string', 'max:50'],
            'start_date' => ['nullable', 'date'],
            'end_date'   => ['nullable', 'date'],
            'is_active'  => ['boolean'],
        ]);

        if (!empty($validated['is_active'])) {
            Term::where('id', '!=', $id)->update(['is_active' => false]);
        }

        $term->update($validated);
        return response()->json($term->load('academicYear'));
    }

    public function destroyTerm(int $id): JsonResponse
    {
        Term::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    // =====================================================================
    // Departments
    // =====================================================================

    public function indexDepartments(): JsonResponse
    {
        return response()->json(Department::withCount('programs')->orderBy('code')->get());
    }

    public function storeDepartment(Request $req): JsonResponse
    {
        $validated = $req->validate([
            'code' => ['required', 'string', 'max:10', 'unique:departments,code'],
            'name' => ['required', 'string', 'max:100'],
        ]);
        return response()->json(Department::create($validated), 201);
    }

    public function updateDepartment(Request $req, int $id): JsonResponse
    {
        $dept      = Department::findOrFail($id);
        $validated = $req->validate([
            'code' => ["sometimes", "string", "max:10", "unique:departments,code,{$id}"],
            'name' => ['sometimes', 'string', 'max:100'],
        ]);
        $dept->update($validated);
        return response()->json($dept);
    }

    public function destroyDepartment(int $id): JsonResponse
    {
        Department::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    // =====================================================================
    // Programs
    // =====================================================================

    public function indexPrograms(): JsonResponse
    {
        return response()->json(Program::with('department')->orderBy('code')->get());
    }

    public function storeProgram(Request $req): JsonResponse
    {
        $validated = $req->validate([
            'department_id' => ['required', 'exists:departments,id'],
            'code'          => ['required', 'string', 'max:15', 'unique:programs,code'],
            'name'          => ['required', 'string', 'max:150'],
        ]);
        return response()->json(Program::create($validated)->load('department'), 201);
    }

    public function destroyProgram(int $id): JsonResponse
    {
        Program::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    // =====================================================================
    // Sections
    // =====================================================================

    public function indexSections(): JsonResponse
    {
        return response()->json(Section::with('program.department')->orderBy('name')->get());
    }

    public function storeSection(Request $req): JsonResponse
    {
        $validated = $req->validate([
            'program_id' => ['required', 'exists:programs,id'],
            'name'       => ['required', 'string', 'max:20'],
            'year_level' => ['required', 'integer', 'min:1', 'max:6'],
        ]);
        return response()->json(Section::create($validated)->load('program'), 201);
    }

    public function destroySection(int $id): JsonResponse
    {
        Section::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    // =====================================================================
    // Courses
    // =====================================================================

    public function indexCourses(): JsonResponse
    {
        return response()->json(Course::with('department')->orderBy('code')->get());
    }

    public function storeCourse(Request $req): JsonResponse
    {
        $validated = $req->validate([
            'department_id' => ['required', 'exists:departments,id'],
            'code'          => ['required', 'string', 'max:15', 'unique:courses,code'],
            'name'          => ['required', 'string', 'max:150'],
            'units'         => ['required', 'integer', 'min:1', 'max:9'],
        ]);
        return response()->json(Course::create($validated)->load('department'), 201);
    }

    public function destroyCourse(int $id): JsonResponse
    {
        Course::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
