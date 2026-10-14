<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuditLogController extends Controller
{
    // GET /sysadmin/audit-logs
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('actor:id,name,role')
            ->orderByDesc('created_at');

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }
        if ($request->filled('severity')) {
            $query->where('severity', $request->query('severity'));
        }
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->query('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->query('to'));
        }
        if ($request->filled('search')) {
            $term = '%' . $request->query('search') . '%';
            $query->where(fn ($q) =>
                $q->where('action', 'like', $term)
                  ->orWhere('detail', 'like', $term)
            );
        }

        $logs = $query->paginate(50);

        return response()->json([
            'data'      => collect($logs->items())->map(fn ($l) => $this->format($l)),
            'total'     => $logs->total(),
            'last_page' => $logs->lastPage(),
        ]);
    }

    // GET /sysadmin/audit-logs/csv
    public function csv(Request $request): Response
    {
        $query = AuditLog::with('actor:id,name')->orderByDesc('created_at');

        if ($request->filled('category')) $query->where('category', $request->query('category'));
        if ($request->filled('severity'))  $query->where('severity', $request->query('severity'));
        if ($request->filled('from'))      $query->whereDate('created_at', '>=', $request->query('from'));
        if ($request->filled('to'))        $query->whereDate('created_at', '<=', $request->query('to'));

        $logs = $query->limit(5000)->get();

        $lines = ['ID,Actor,Category,Severity,Action,Detail,IP,Created At'];
        foreach ($logs as $l) {
            $actor  = $l->actor?->name ?? 'System';
            $detail = str_replace(["\n", "\r", '"'], [' ', ' ', "'"], $l->detail ?? '');
            $lines[] = implode(',', [
                $l->id, "\"{$actor}\"", $l->category, $l->severity,
                "\"{$l->action}\"", "\"{$detail}\"",
                $l->ip_address ?? '', $l->created_at->toDateTimeString(),
            ]);
        }

        return response(implode("\n", $lines), 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="audit_logs.csv"',
        ]);
    }

    private function format(AuditLog $l): array
    {
        return [
            'id'         => $l->id,
            'actor_id'   => $l->actor_id,
            'actor_name' => $l->actor?->name ?? 'System',
            'actor_role' => $l->actor?->role,
            'category'   => $l->category,
            'severity'   => $l->severity,
            'action'     => $l->action,
            'detail'     => $l->detail,
            'ip_address' => $l->ip_address,
            'created_at' => $l->created_at,
        ];
    }
}
