<?php

namespace App\Http\Controllers\Communication;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    private const COMPOSE_ROLES = ['guidance_counselor', 'admin_exec', 'system_admin', 'super_admin'];

    // GET /messages/inbox
    public function inbox(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $rows = MessageRecipient::with(['message.sender'])
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'data'         => collect($rows->items())->map(fn ($mr) => $this->formatInboxItem($mr)),
            'total'        => $rows->total(),
            'last_page'    => $rows->lastPage(),
            'unread_count' => MessageRecipient::where('user_id', $userId)->where('is_read', false)->count(),
        ]);
    }

    // GET /messages/sent
    public function sent(Request $request): JsonResponse
    {
        if (!in_array($request->user()->role, self::COMPOSE_ROLES)) {
            return response()->json(['data' => [], 'total' => 0, 'last_page' => 1]);
        }

        $rows = Message::where('sender_id', $request->user()->id)
            ->withCount('recipients')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'data'      => collect($rows->items())->map(fn ($m) => [
                'id'             => $m->id,
                'subject'        => $m->subject,
                'body'           => substr($m->body, 0, 120),
                'recipient_type' => $m->recipient_type,
                'group_target'   => $m->group_target,
                'recipient_count'=> $m->recipients_count,
                'sent_at'        => $m->created_at,
                'is_own'         => true,
            ]),
            'total'     => $rows->total(),
            'last_page' => $rows->lastPage(),
        ]);
    }

    // GET /messages/{id}
    public function show(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        // Check inbox first
        $mr = MessageRecipient::with('message.sender')
            ->where('message_id', $id)
            ->where('user_id', $userId)
            ->first();

        if ($mr) {
            if (!$mr->is_read) {
                $mr->update(['is_read' => true, 'read_at' => now()]);
            }
            return response()->json($this->formatInboxItem($mr, fullBody: true));
        }

        // Fall back to sent
        $msg = Message::with('sender')
            ->where('id', $id)
            ->where('sender_id', $userId)
            ->firstOrFail();

        return response()->json([
            'id'             => $msg->id,
            'subject'        => $msg->subject,
            'body'           => $msg->body,
            'sender_name'    => $msg->sender?->name,
            'recipient_type' => $msg->recipient_type,
            'group_target'   => $msg->group_target,
            'sent_at'        => $msg->created_at,
            'is_own'         => true,
        ]);
    }

    // POST /messages
    public function compose(Request $request): JsonResponse
    {
        if (!in_array($request->user()->role, self::COMPOSE_ROLES)) {
            return response()->json(['message' => 'Forbidden — insufficient role'], 403);
        }

        $v = $request->validate([
            'subject'           => ['nullable', 'string', 'max:255'],
            'body'              => ['required', 'string', 'max:5000'],
            'recipient_type'    => ['required', 'in:individual,group,broadcast'],
            'recipient_user_id' => ['required_if:recipient_type,individual', 'nullable', 'integer', 'exists:users,id'],
            'group_target'      => ['required_if:recipient_type,group', 'nullable', 'string', 'max:100'],
        ]);

        $recipientIds = $this->resolveRecipients(
            $v['recipient_type'],
            $v['recipient_user_id'] ?? null,
            $v['group_target'] ?? null,
            $request->user()->id
        );

        if (empty($recipientIds)) {
            return response()->json(['message' => 'No recipients found for the selected target.'], 422);
        }

        DB::transaction(function () use ($v, $request, $recipientIds) {
            $msg = Message::create([
                'sender_id'      => $request->user()->id,
                'recipient_type' => $v['recipient_type'],
                'group_target'   => $v['group_target'] ?? null,
                'subject'        => $v['subject'] ?? null,
                'body'           => $v['body'],
            ]);

            $now = now();
            $msgRows = array_map(fn ($uid) => [
                'message_id' => $msg->id,
                'user_id'    => $uid,
                'is_read'    => false,
                'created_at' => $now,
                'updated_at' => $now,
            ], $recipientIds);
            MessageRecipient::insert($msgRows);

            // Create an in-app notification for each recipient
            $title   = 'New message: ' . ($v['subject'] ?? 'No subject');
            $preview = substr($v['body'], 0, 200);
            $notifRows = array_map(fn ($uid) => [
                'user_id'    => $uid,
                'type'       => 'new_message',
                'title'      => $title,
                'body'       => $preview,
                'is_read'    => false,
                'created_at' => $now,
                'updated_at' => $now,
            ], $recipientIds);
            UserNotification::insert($notifRows);
        });

        return response()->json([
            'message'         => 'Message sent successfully.',
            'recipient_count' => count($recipientIds),
        ], 201);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function resolveRecipients(
        string $type,
        ?int $individualId,
        ?string $groupTarget,
        int $senderId
    ): array {
        if ($type === 'individual' && $individualId) {
            return [$individualId];
        }

        if ($type === 'broadcast') {
            return User::where('id', '!=', $senderId)
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
        }

        // group
        if (!$groupTarget) return [];
        [$targetType, $targetValue] = array_pad(explode(':', $groupTarget, 2), 2, null);

        return match ($targetType) {
            'role' => User::where('role', $targetValue)
                ->where('id', '!=', $senderId)
                ->pluck('id')
                ->toArray(),
            'section' => Student::where('section_id', $targetValue)
                ->pluck('user_id')
                ->filter()
                ->toArray(),
            'class' => StudentEnrollment::where('class_section_id', $targetValue)
                ->whereNull('dropped_at')
                ->join('students', 'student_enrollments.student_id', '=', 'students.student_id')
                ->pluck('students.user_id')
                ->toArray(),
            default => [],
        };
    }

    private function formatInboxItem(MessageRecipient $mr, bool $fullBody = false): array
    {
        $msg = $mr->message;
        return [
            'id'          => $msg->id,
            'subject'     => $msg->subject,
            'body'        => $fullBody ? $msg->body : substr($msg->body, 0, 120),
            'sender_name' => $msg->sender?->name,
            'sender_role' => $msg->sender?->role,
            'is_read'     => $mr->is_read,
            'read_at'     => $mr->read_at,
            'received_at' => $mr->created_at,
        ];
    }
}
