<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RfidScanController extends Controller
{
    public function __construct(private readonly AttendanceService $attendanceService) {}

    public function scan(Request $request): JsonResponse
    {
        // Require rfid-scan token ability
        if (!$request->user()->tokenCan('rfid-scan')) {
            return response()->json(['message' => 'Insufficient token abilities'], 403);
        }

        $validated = $request->validate([
            'rfid_tag'   => ['required', 'string', 'max:30'],
            'room'       => ['nullable', 'string', 'max:50'],
            'scanned_at' => ['nullable', 'date'],
        ]);

        $scanTime = isset($validated['scanned_at'])
            ? \Carbon\Carbon::parse($validated['scanned_at'])
            : null;

        $result = $this->attendanceService->processRfidScan(
            $validated['rfid_tag'],
            $validated['room'] ?? null,
            $scanTime,
        );

        $status = $result['success'] ? 200 : 422;
        return response()->json($result, $status);
    }
}
