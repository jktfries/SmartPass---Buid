<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use App\Models\AuditLog;
use App\Models\SupportTicket;
use App\Models\User;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    // GET /sysadmin/stats
    public function stats(Request $request): JsonResponse
    {
        // User counts by role
        $userCounts = User::whereNull('deleted_at')
            ->where('is_active', true)
            ->select('role', DB::raw('count(*) as total'))
            ->groupBy('role')
            ->pluck('total', 'role');

        // Ticket counts by status
        $ticketCounts = SupportTicket::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        // Approval counts
        $approvalPending = ApprovalRequest::where('status', 'Pending')->count();

        // System settings
        $maintenance = SystemSetting::where('key', 'maintenance_mode')->value('value');

        // Recent tickets (last 5 open/in-progress)
        $recentTickets = SupportTicket::with('submitter:id,name,role')
            ->whereIn('status', ['open', 'in_progress'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'ticket_number', 'subject', 'category', 'priority', 'status', 'submitter_id', 'created_at']);

        // Recent audit logs (last 5)
        $recentAudit = AuditLog::with('actor:id,name')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'actor_id', 'category', 'action', 'severity', 'created_at'])
            ->map(fn ($log) => [
                'id'         => $log->id,
                'actor_name' => $log->actor?->name,
                'category'   => $log->category,
                'action'     => $log->action,
                'severity'   => $log->severity,
                'created_at' => $log->created_at,
            ]);

        return response()->json([
            'users' => [
                'total'             => $userCounts->sum(),
                'student'           => $userCounts->get('student', 0),
                'professor'         => $userCounts->get('professor', 0),
                'guidance_counselor'=> $userCounts->get('guidance_counselor', 0),
                'admin_exec'        => $userCounts->get('admin_exec', 0),
                'system_admin'      => $userCounts->get('system_admin', 0),
                'super_admin'       => $userCounts->get('super_admin', 0),
            ],
            'tickets' => [
                'open'        => (int) $ticketCounts->get('open', 0),
                'in_progress' => (int) $ticketCounts->get('in_progress', 0),
                'resolved'    => (int) $ticketCounts->get('resolved', 0),
                'closed'      => (int) $ticketCounts->get('closed', 0),
            ],
            'approvals' => [
                'pending' => $approvalPending,
            ],
            'system' => [
                'maintenance_mode' => $maintenance === '1',
            ],
            'recent_tickets' => $recentTickets,
            'recent_audit'   => $recentAudit,
        ]);
    }
}
