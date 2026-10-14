<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalController extends Controller
{
    // GET /superadmin/approvals
    public function index(Request $request): JsonResponse
    {
        $query = ApprovalRequest::with(['submitter:id,name,role', 'reviewer:id,name'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $rows = $query->paginate(25);

        return response()->json([
            'data'      => collect($rows->items())->map(fn ($r) => $this->format($r)),
            'total'     => $rows->total(),
            'last_page' => $rows->lastPage(),
        ]);
    }

    // PATCH /superadmin/approvals/{id}
    public function review(Request $request, int $id): JsonResponse
    {
        $approval = ApprovalRequest::findOrFail($id);

        if ($approval->status !== 'Pending') {
            return response()->json(['message' => 'This request has already been reviewed.'], 422);
        }

        $validated = $request->validate([
            'status'  => ['required', 'in:Approved,Rejected'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $approval->update([
            'status'      => $validated['status'],
            'remarks'     => $validated['remarks'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json(['message' => 'Request reviewed', 'approval' => $this->format($approval->fresh())]);
    }

    // POST /superadmin/approvals — submit a new request (any role can submit)
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type'    => ['required', 'string', 'max:100'],
            'payload' => ['nullable', 'array'],
        ]);

        $approval = ApprovalRequest::create([
            'type'         => $validated['type'],
            'submitted_by' => $request->user()->id,
            'payload'      => $validated['payload'] ?? null,
            'status'       => 'Pending',
        ]);

        return response()->json($this->format($approval), 201);
    }

    private function format(ApprovalRequest $r): array
    {
        return [
            'id'             => $r->id,
            'type'           => $r->type,
            'status'         => $r->status,
            'payload'        => $r->payload,
            'remarks'        => $r->remarks,
            'submitter_name' => $r->submitter?->name,
            'submitter_role' => $r->submitter?->role,
            'reviewer_name'  => $r->reviewer?->name,
            'reviewed_at'    => $r->reviewed_at,
            'submitted_at'   => $r->created_at,
        ];
    }
}
