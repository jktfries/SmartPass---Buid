<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportTicketController extends Controller
{
    private const ADMIN_ROLES = ['system_admin', 'super_admin', 'admin_exec'];

    // GET /tickets
    // Regular users: own tickets only
    // Admins: all tickets, filterable by status / category / priority
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = SupportTicket::with(['submitter:id,name,role', 'assignee:id,name']);

        if (in_array($user->role, self::ADMIN_ROLES)) {
            foreach (['status', 'category', 'priority'] as $filter) {
                if ($request->filled($filter)) {
                    $query->where($filter, $request->input($filter));
                }
            }
            if ($request->filled('search')) {
                $s = $request->input('search');
                $query->where(fn($q) => $q
                    ->where('ticket_number', 'like', "%{$s}%")
                    ->orWhere('subject', 'like', "%{$s}%")
                    ->orWhereHas('submitter', fn($u) => $u->where('name', 'like', "%{$s}%"))
                );
            }
        } else {
            $query->where('submitter_id', $user->id);
        }

        $tickets = $query->orderByDesc('created_at')->paginate(20);

        return response()->json([
            'data'      => $tickets->items(),
            'total'     => $tickets->total(),
            'last_page' => $tickets->lastPage(),
        ]);
    }

    // POST /tickets — all authenticated users
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject'     => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'category'    => ['required', 'in:account,attendance,technical,wellness,other'],
            'priority'    => ['required', 'in:low,medium,high,urgent'],
        ]);

        $year   = date('Y');
        $seq    = SupportTicket::whereYear('created_at', $year)->count() + 1;
        $number = 'SP-' . $year . '-' . str_pad($seq, 5, '0', STR_PAD_LEFT);

        $ticket = SupportTicket::create([
            ...$validated,
            'submitter_id'  => $request->user()->id,
            'ticket_number' => $number,
            'status'        => 'open',
        ]);

        $ticket->load('submitter:id,name,role');
        return response()->json($ticket, 201);
    }

    // GET /tickets/{id}
    public function show(Request $request, int $id): JsonResponse
    {
        $user   = $request->user();
        $ticket = SupportTicket::with(['submitter:id,name,role,email', 'assignee:id,name'])->findOrFail($id);

        abort_unless(
            $ticket->submitter_id === $user->id || in_array($user->role, self::ADMIN_ROLES),
            403, 'Access denied.'
        );

        return response()->json($ticket);
    }

    // PATCH /tickets/{id} — admin only
    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless(in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $ticket = SupportTicket::findOrFail($id);

        $validated = $request->validate([
            'status'           => ['sometimes', 'in:open,in_progress,resolved,closed'],
            'resolution_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'assigned_to'      => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'priority'         => ['sometimes', 'in:low,medium,high,urgent'],
        ]);

        if (
            isset($validated['status'])
            && in_array($validated['status'], ['resolved', 'closed'])
            && !$ticket->resolved_at
        ) {
            $validated['resolved_at'] = now();
        }

        if (isset($validated['assigned_to']) && $validated['assigned_to'] === null) {
            $ticket->assigned_to = null;
        }

        $ticket->fill($validated)->save();

        // Notify submitter on status change
        if (isset($validated['status'])) {
            $label = ucwords(str_replace('_', ' ', $validated['status']));
            UserNotification::create([
                'user_id' => $ticket->submitter_id,
                'type'    => 'ticket_update',
                'title'   => "Ticket {$ticket->ticket_number} — {$label}",
                'body'    => match($validated['status']) {
                    'in_progress' => 'Your support request is being reviewed by the admin team.',
                    'resolved'    => 'Your support request has been resolved. ' . ($validated['resolution_notes'] ? 'See the resolution notes.' : ''),
                    'closed'      => 'Your support ticket has been closed.',
                    default       => "Your ticket status changed to {$label}.",
                },
                'data'    => json_encode(['ticket_id' => $ticket->id, 'ticket_number' => $ticket->ticket_number]),
            ]);
        }

        return response()->json($ticket->fresh(['submitter:id,name,role', 'assignee:id,name']));
    }
}
