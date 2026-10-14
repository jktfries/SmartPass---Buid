<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Program;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $req): JsonResponse
    {
        $users = User::with('department')
            ->withTrashed()
            ->when($req->query('role'), fn ($q, $role) => $q->where('role', $role))
            ->orderByDesc('id')
            ->get()
            ->map(fn ($u) => [
                'id'            => $u->id,
                'name'          => $u->name,
                'email'         => $u->email,
                'role'          => $u->role,
                'department'    => $u->department?->code,
                'is_active'     => $u->is_active,
                'deleted_at'    => $u->deleted_at,
            ]);

        return response()->json($users);
    }

    public function store(Request $req): JsonResponse
    {
        $rules = [
            'name'          => ['required', 'string', 'max:150'],
            'email'         => ['required', 'email', 'unique:users,email'],
            'password'      => ['required', Password::min(8)],
            'role'          => ['required', 'in:student,professor,guidance_counselor,admin_exec,system_admin,super_admin'],
            'department_id' => ['nullable', 'exists:departments,id'],
        ];

        // A student is not just a users row — it needs a linked students row, or
        // every student-facing page 404s on Student::where('user_id', …)->firstOrFail().
        if ($req->input('role') === 'student') {
            $rules['program_id'] = ['required', 'exists:programs,id'];
            $rules['section_id'] = ['required', 'exists:sections,id'];
            $rules['year_level'] = ['required', 'integer', 'min:1', 'max:6'];
            $rules['rfid_tag']   = ['nullable', 'string', 'max:30', 'unique:students,rfid_tag'];
        }

        $validated = $req->validate($rules);

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name'          => $validated['name'],
                'email'         => $validated['email'],
                'password'      => Hash::make($validated['password']),
                'role'          => $validated['role'],
                'department_id' => $validated['department_id'] ?? null,
            ]);

            if ($validated['role'] === 'student') {
                Student::create([
                    'student_id' => $this->nextStudentId((int) $validated['program_id']),
                    'user_id'    => $user->id,
                    'program_id' => $validated['program_id'],
                    'section_id' => $validated['section_id'],
                    'year_level' => $validated['year_level'],
                    'rfid_tag'   => $validated['rfid_tag'] ?? null,
                ]);
            }

            return $user;
        });

        return response()->json([
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->role,
        ], 201);
    }

    /**
     * Build the next student ID in the seeded convention {year}-{deptCode}-{NNN},
     * e.g. 2024-CS-001. The middle segment is the program's DEPARTMENT code
     * ("CS"), not the program code ("BSCS").
     */
    private function nextStudentId(int $programId): string
    {
        $program  = Program::with('department')->findOrFail($programId);
        $deptCode = $program->department?->code ?? 'GEN';
        $prefix   = now()->format('Y') . '-' . $deptCode . '-';

        $lastId = Student::where('student_id', 'like', $prefix . '%')
            ->orderByDesc('student_id')
            ->value('student_id');

        $next = $lastId ? ((int) substr($lastId, strlen($prefix))) + 1 : 1;

        return $prefix . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }

    public function update(Request $req, int $id): JsonResponse
    {
        $user      = User::withTrashed()->findOrFail($id);
        $validated = $req->validate([
            'name'          => ['sometimes', 'string', 'max:150'],
            'email'         => ["sometimes", "email", "unique:users,email,{$id}"],
            'role'          => ['sometimes', 'in:student,professor,guidance_counselor,admin_exec,system_admin,super_admin'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'is_active'     => ['boolean'],
        ]);

        $user->update($validated);
        return response()->json(['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->role, 'is_active' => $user->is_active]);
    }

    public function destroy(int $id): JsonResponse
    {
        User::findOrFail($id)->delete(); // soft delete
        return response()->json(null, 204);
    }

    public function restore(int $id): JsonResponse
    {
        User::withTrashed()->findOrFail($id)->restore();
        return response()->json(['message' => 'User restored']);
    }

    public function resetPassword(Request $req, int $id): JsonResponse
    {
        $user      = User::findOrFail($id);
        $validated = $req->validate([
            'password' => ['required', Password::min(8)],
        ]);

        $user->update(['password' => Hash::make($validated['password'])]);
        return response()->json(['message' => 'Password reset successfully']);
    }

    // Student profiles
    public function indexStudents(): JsonResponse
    {
        $students = Student::with(['user', 'program', 'section'])
            ->orderBy('student_id')
            ->get()
            ->map(fn ($s) => [
                'student_id'   => $s->student_id,
                'user_id'      => $s->user_id,
                'name'         => $s->user?->name,
                'email'        => $s->user?->email,
                'program'      => $s->program?->code,
                'section'      => $s->section?->name,
                'rfid_tag'     => $s->rfid_tag,
                'year_level'   => $s->year_level,
            ]);

        return response()->json($students);
    }

    public function storeStudent(Request $req): JsonResponse
    {
        $validated = $req->validate([
            'student_id' => ['required', 'string', 'max:20', 'unique:students,student_id'],
            'user_id'    => ['required', 'exists:users,id', 'unique:students,user_id'],
            'program_id' => ['required', 'exists:programs,id'],
            'section_id' => ['required', 'exists:sections,id'],
            'rfid_tag'   => ['nullable', 'string', 'max:30', 'unique:students,rfid_tag'],
            'year_level' => ['required', 'integer', 'min:1', 'max:6'],
        ]);

        $student = Student::create($validated);
        return response()->json($student->load(['user', 'program', 'section']), 201);
    }

    public function updateStudent(Request $req, string $studentId): JsonResponse
    {
        $student   = Student::findOrFail($studentId);
        $validated = $req->validate([
            'program_id' => ['sometimes', 'exists:programs,id'],
            'section_id' => ['sometimes', 'exists:sections,id'],
            'rfid_tag'   => ["nullable", "string", "max:30", "unique:students,rfid_tag,{$studentId},student_id"],
            'year_level' => ['sometimes', 'integer', 'min:1', 'max:6'],
        ]);

        $student->update($validated);
        return response()->json($student->load(['user', 'program', 'section']));
    }
}
