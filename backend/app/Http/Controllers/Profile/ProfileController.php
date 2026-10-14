<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $user->toArray();

        if ($user->role === 'student') {
            $student = $user->student()
                ->with(['section:id,name', 'program:id,name,code'])
                ->first();

            if ($student) {
                $data['student_profile'] = [
                    'student_id' => $student->student_id,
                    'year_level' => $student->year_level,
                    'section'    => $student->section?->name,
                    'program'    => $student->program?->name,
                    'program_code' => $student->program?->code,
                ];
            }
        }

        return response()->json($data);
    }

    // Only system_admin/super_admin can self-edit their *email* — everyone else
    // still needs "admin assistance" for that, per the existing AccountPage copy.
    // Passwords are self-service for every role (see below).
    private const SELF_EMAIL_EDIT_ROLES = ['system_admin', 'super_admin'];

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $canEditEmail = in_array($user->role, self::SELF_EMAIL_EDIT_ROLES, true);

        $rules = [
            'name'     => ['sometimes', 'string', 'max:150', 'min:2'],
            'nickname' => ['sometimes', 'nullable', 'string', 'max:60'],
            'phone'    => ['sometimes', 'nullable', 'string', 'max:25'],
            'bio'      => ['sometimes', 'nullable', 'string', 'max:500'],
            // Anyone may change their own password, as long as they can prove
            // they know the current one.
            'current_password' => ['required_with:password', 'string'],
            'password'         => ['sometimes', 'string', 'min:8', 'confirmed'],
        ];

        if ($canEditEmail) {
            $rules['email'] = ['sometimes', 'string', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)];
        }

        $validated = $request->validate($rules);

        if (isset($validated['password'])) {
            if (!Hash::check($validated['current_password'], $user->password)) {
                throw ValidationException::withMessages(['current_password' => 'Current password is incorrect.']);
            }
            $validated['password'] = Hash::make($validated['password']);
        }
        unset($validated['current_password']);

        $user->update($validated);

        return response()->json($user->fresh());
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'theme'            => ['sometimes', 'in:light,dark,system'],
            // A preset name, or a user-chosen #rrggbb from the custom picker.
            'accent'           => ['sometimes', 'string', 'regex:/^(teal|indigo|violet|rose|amber|sky|emerald|#[0-9a-fA-F]{6})$/'],
            'density'          => ['sometimes', 'in:comfortable,compact'],
            'sidebarCollapsed' => ['sometimes', 'boolean'],
            'dashboard'        => ['sometimes', 'array'],
        ]);

        $user = $request->user();

        // Merge rather than replace, so saving one setting can't clobber another.
        $user->preferences = array_merge($user->preferences ?? [], $validated);
        $user->save();

        return response()->json($user->fresh()->preferences);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            // max: is in KILOBYTES — 5120 = 5 MB. Well under php.ini's
            // upload_max_filesize/post_max_size (both 40M), so oversize files
            // reach Laravel and get a real validation error rather than being
            // dropped by PHP before the request is parsed.
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ], [
            // The default reads "must not be greater than 5120 kilobytes",
            // which is the unit the rule wants, not the unit the UI advertises.
            'avatar.max'   => 'That image is too large. Maximum size is 5 MB.',
            'avatar.mimes' => 'Please choose a JPG, PNG, GIF, or WebP image.',
        ]);

        $user = $request->user();

        // Remove old avatar file from storage
        if ($user->avatar_url) {
            $oldRelative = ltrim(
                str_replace(Storage::disk('public')->url(''), '', $user->avatar_url),
                '/'
            );
            if (Storage::disk('public')->exists($oldRelative)) {
                Storage::disk('public')->delete($oldRelative);
            }
        }

        $ext      = $request->file('avatar')->getClientOriginalExtension();
        $filename = 'avatars/' . Str::uuid() . '.' . $ext;
        $request->file('avatar')->storeAs('', $filename, 'public');

        $url = Storage::disk('public')->url($filename);
        $user->update(['avatar_url' => $url]);

        return response()->json(['avatar_url' => $url]);
    }

    public function removeAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar_url) {
            $oldRelative = ltrim(
                str_replace(Storage::disk('public')->url(''), '', $user->avatar_url),
                '/'
            );
            if (Storage::disk('public')->exists($oldRelative)) {
                Storage::disk('public')->delete($oldRelative);
            }
            $user->update(['avatar_url' => null]);
        }

        return response()->json(['avatar_url' => null]);
    }
}
