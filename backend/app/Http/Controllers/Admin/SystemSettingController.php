<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemSettingController extends Controller
{
    // GET /sysadmin/settings
    public function index(): JsonResponse
    {
        return response()->json(SystemSetting::all());
    }

    // PATCH /sysadmin/settings/{key}
    public function update(Request $request, string $key): JsonResponse
    {
        $setting = SystemSetting::where('key', $key)->firstOrFail();

        $validated = $request->validate([
            'value' => ['required', 'string', 'max:255'],
        ]);

        $setting->update([
            'value'      => $validated['value'],
            'updated_by' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Setting updated', 'setting' => $setting->fresh()]);
    }
}
