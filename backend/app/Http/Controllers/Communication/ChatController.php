<?php

namespace App\Http\Controllers\Communication;

use App\Http\Controllers\Controller;
use App\Models\ChatAttachment;
use App\Models\ChatMessage;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    // ─── GET /chat/conversations ────────────────────────────────────────────────
    public function conversations(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $convIds = ConversationParticipant::where('user_id', $userId)
            ->whereNull('hidden_at')
            ->pluck('conversation_id');

        $conversations = Conversation::whereIn('id', $convIds)
            ->with([
                'participants.user:id,name,nickname,avatar_url,role',
                'latestMessage.sender:id,name,nickname',
                'latestMessage.attachments',
            ])
            ->get()
            ->sortByDesc(fn($c) => optional($c->latestMessage)->created_at ?? $c->created_at)
            ->values();

        $participants = ConversationParticipant::where('user_id', $userId)
            ->whereIn('conversation_id', $convIds)
            ->get()
            ->keyBy('conversation_id');

        $result = $conversations->map(fn($conv) => $this->formatConversation($conv, $userId, $participants[$conv->id] ?? null));

        return response()->json($result);
    }

    // ─── POST /chat/conversations ────────────────────────────────────────────────
    public function startConversation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_user_id'  => ['required_without:participants', 'nullable', 'integer', 'exists:users,id'],
            'participants'    => ['required_without:target_user_id', 'nullable', 'array', 'min:2'],
            'participants.*'  => ['integer', 'exists:users,id'],
            'name'            => ['nullable', 'string', 'max:150'],
        ]);

        $user   = $request->user();
        $userId = $user->id;

        // Collect all target IDs (direct or group) and validate against contact matrix
        $targetIds = isset($validated['target_user_id'])
            ? [$validated['target_user_id']]
            : ($validated['participants'] ?? []);

        foreach ($targetIds as $tid) {
            abort_unless(
                $this->canContact($user, (int) $tid),
                403,
                'You are not permitted to start a conversation with one or more of these users.'
            );
        }

        // Direct conversation
        if (isset($validated['target_user_id'])) {
            $targetId = $validated['target_user_id'];

            // Return existing direct conversation if one already exists
            $existing = Conversation::where('type', 'direct')
                ->whereHas('participants', fn($q) => $q->where('user_id', $userId))
                ->whereHas('participants', fn($q) => $q->where('user_id', $targetId))
                ->first();

            if ($existing) {
                $existing->load('participants.user:id,name,nickname,avatar_url,role', 'latestMessage.sender:id,name,nickname', 'latestMessage.attachments');
                $participant = ConversationParticipant::where('conversation_id', $existing->id)->where('user_id', $userId)->first();
                return response()->json($this->formatConversation($existing, $userId, $participant));
            }

            $conv = DB::transaction(function () use ($userId, $targetId) {
                $c = Conversation::create(['type' => 'direct', 'created_by' => $userId]);
                ConversationParticipant::insert([
                    ['conversation_id' => $c->id, 'user_id' => $userId,   'joined_at' => now()],
                    ['conversation_id' => $c->id, 'user_id' => $targetId, 'joined_at' => now()],
                ]);
                return $c;
            });
        } else {
            // Group conversation
            $allIds = array_unique(array_merge([$userId], $validated['participants']));
            $conv = DB::transaction(function () use ($userId, $allIds, $validated) {
                $c = Conversation::create([
                    'type'       => 'group',
                    'name'       => $validated['name'] ?? null,
                    'created_by' => $userId,
                ]);
                ConversationParticipant::insert(array_map(fn($id) => [
                    'conversation_id' => $c->id,
                    'user_id'         => $id,
                    'joined_at'       => now(),
                ], $allIds));
                return $c;
            });
        }

        $conv->load('participants.user:id,name,nickname,avatar_url,role', 'latestMessage.sender:id,name,nickname', 'latestMessage.attachments');
        $participant = ConversationParticipant::where('conversation_id', $conv->id)->where('user_id', $userId)->first();

        return response()->json($this->formatConversation($conv, $userId, $participant), 201);
    }

    // ─── GET /chat/conversations/{id}/messages ───────────────────────────────────
    public function messages(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;
        $this->assertParticipant($id, $userId);

        $afterId  = $request->query('after_id');
        $beforeId = $request->query('before_id');

        $query = ChatMessage::withTrashed()
            ->where('conversation_id', $id)
            ->with([
                'sender:id,name,nickname,avatar_url,role',
                'attachments',
                'replyTo' => fn($q) => $q->with('sender:id,name,nickname', 'attachments')->withTrashed(),
            ]);

        if ($afterId) {
            // Polling: only new messages
            $query->where('id', '>', (int) $afterId)->orderBy('id');
        } elseif ($beforeId) {
            // Scrollback: older messages
            $query->where('id', '<', (int) $beforeId)->orderByDesc('id')->limit(30);
        } else {
            // Initial load: last 30
            $query->orderByDesc('id')->limit(30);
        }

        $messages = $query->get();

        // For initial + scrollback, reverse so oldest is first in array
        if (!$afterId) {
            $messages = $messages->reverse()->values();
        }

        // Mark as read
        ConversationParticipant::where('conversation_id', $id)
            ->where('user_id', $userId)
            ->update(['last_read_at' => now()]);

        return response()->json($messages->map(fn($m) => $this->formatMessage($m, $userId)));
    }

    // ─── POST /chat/conversations/{id}/messages ──────────────────────────────────
    public function send(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;
        $this->assertParticipant($id, $userId);

        $request->validate([
            'body'        => ['nullable', 'string', 'max:5000'],
            'reply_to_id' => ['nullable', 'integer', 'exists:chat_messages,id'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => ['file', 'max:20480'], // 20 MB per file
        ]);

        $body    = trim($request->input('body', ''));
        $files   = $request->file('attachments', []);
        $replyId = $request->input('reply_to_id');

        if ($body === '' && empty($files)) {
            return response()->json(['message' => 'Message cannot be empty.'], 422);
        }

        $message = DB::transaction(function () use ($id, $userId, $body, $replyId, $files) {
            $msg = ChatMessage::create([
                'conversation_id' => $id,
                'sender_id'       => $userId,
                'body'            => $body ?: null,
                'reply_to_id'     => $replyId ?: null,
            ]);

            foreach ($files as $file) {
                $ext  = $file->getClientOriginalExtension();
                $path = 'chat/' . Str::uuid() . '.' . $ext;
                $file->storeAs('', $path, 'public');

                ChatAttachment::create([
                    'message_id'    => $msg->id,
                    'original_name' => $file->getClientOriginalName(),
                    'stored_path'   => $path,
                    'mime_type'     => $file->getMimeType(),
                    'file_size'     => $file->getSize(),
                ]);
            }

            // Update conversation updated_at for ordering
            Conversation::where('id', $id)->touch();

            // A new message revives the conversation for anyone who had hidden/deleted it
            ConversationParticipant::where('conversation_id', $id)
                ->update(['hidden_at' => null]);

            // Mark sender as read
            ConversationParticipant::where('conversation_id', $id)
                ->where('user_id', $userId)
                ->update(['last_read_at' => now()]);

            return $msg;
        });

        $message->load('sender:id,name,nickname,avatar_url,role', 'attachments', 'replyTo.sender:id,name,nickname', 'replyTo.attachments');
        $message->replyTo?->loadMissing('sender:id,name,nickname');

        return response()->json($this->formatMessage($message, $userId), 201);
    }

    // ─── POST /chat/conversations/{id}/read ─────────────────────────────────────
    public function markRead(Request $request, int $id): JsonResponse
    {
        ConversationParticipant::where('conversation_id', $id)
            ->where('user_id', $request->user()->id)
            ->update(['last_read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    // ─── DELETE /chat/conversations/{id} ────────────────────────────────────────
    // Hides the conversation from this user's list only — the other participant(s)
    // are unaffected, and it reappears for this user if a new message arrives.
    public function hideConversation(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;
        $this->assertParticipant($id, $userId);

        ConversationParticipant::where('conversation_id', $id)
            ->where('user_id', $userId)
            ->update(['hidden_at' => now()]);

        return response()->json(['message' => 'Conversation removed']);
    }

    // ─── DELETE /chat/messages/{msgId} ──────────────────────────────────────────
    public function deleteMessage(Request $request, int $msgId): JsonResponse
    {
        $msg = ChatMessage::where('id', $msgId)
            ->where('sender_id', $request->user()->id)
            ->firstOrFail();

        $msg->delete(); // soft delete

        return response()->json(['ok' => true]);
    }

    // ─── GET /chat/contacts ──────────────────────────────────────────────────────
    //
    // Contact matrix (enforced here and in startConversation):
    //   Student   → professors from any enrolled class (all terms), assigned counselors
    //               (all assignments, active + past), all system_admin / super_admin
    //   Professor → students from any of their class sections (all terms),
    //               all counselors, all system_admin / super_admin
    //   Counselor → students ever assigned to them (active + past),
    //               all professors, all system_admin / super_admin
    //   SysAdmin / SuperAdmin / AdminExec → everyone (portal-wide support)
    public function contacts(Request $request): JsonResponse
    {
        $user   = $request->user();
        $search = $request->query('search', '');
        $userId = $user->id;

        switch ($user->role) {

            case 'student': {
                $student = $user->student;
                $sid     = $student?->student_id;

                // All professors from every class section ever enrolled in (any term, any status)
                $professorIds = DB::table('student_enrollments')
                    ->join('class_sections', 'class_sections.id', '=', 'student_enrollments.class_section_id')
                    ->where('student_enrollments.student_id', $sid)
                    ->pluck('class_sections.professor_id')
                    ->unique();

                // All counselors ever assigned (active + past)
                $counselorIds = DB::table('student_counselor_assignments')
                    ->where('student_id', $sid)
                    ->pluck('counselor_id')
                    ->unique();

                // System admins and super admins (portal/account concerns)
                $sysIds = User::whereIn('role', ['system_admin', 'super_admin'])
                    ->pluck('id');

                $contactIds = $professorIds->merge($counselorIds)->merge($sysIds)->unique();
                $query = User::whereIn('id', $contactIds);
                break;
            }

            case 'professor': {
                // All students ever enrolled in any class section taught by this professor
                $studentUserIds = DB::table('student_enrollments')
                    ->join('class_sections', 'class_sections.id', '=', 'student_enrollments.class_section_id')
                    ->join('students', 'students.student_id', '=', 'student_enrollments.student_id')
                    ->where('class_sections.professor_id', $userId)
                    ->pluck('students.user_id')
                    ->unique();

                // All guidance counselors
                $counselorIds = User::where('role', 'guidance_counselor')->pluck('id');

                // System admins / super admins
                $sysIds = User::whereIn('role', ['system_admin', 'super_admin'])->pluck('id');

                $contactIds = $studentUserIds->merge($counselorIds)->merge($sysIds)->unique();
                $query = User::whereIn('id', $contactIds);
                break;
            }

            case 'guidance_counselor': {
                // All students ever assigned to this counselor (active + past)
                $studentUserIds = DB::table('student_counselor_assignments')
                    ->join('students', 'students.student_id', '=', 'student_counselor_assignments.student_id')
                    ->where('student_counselor_assignments.counselor_id', $userId)
                    ->pluck('students.user_id')
                    ->unique();

                // All professors
                $professorIds = User::where('role', 'professor')->pluck('id');

                // System admins / super admins
                $sysIds = User::whereIn('role', ['system_admin', 'super_admin'])->pluck('id');

                $contactIds = $studentUserIds->merge($professorIds)->merge($sysIds)->unique();
                $query = User::whereIn('id', $contactIds);
                break;
            }

            default:
                // system_admin, super_admin, admin_exec — portal support, can reach anyone
                $query = User::where('email', 'not like', '%@smartpass.system')
                    ->whereNull('deleted_at')
                    ->where('is_active', true);
                break;
        }

        if ($search) {
            $query->where(fn($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
        }

        return response()->json(
            $query->select('id', 'name', 'nickname', 'email', 'role', 'avatar_url')
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->where('id', '!=', $userId)
                ->orderBy('role')
                ->orderBy('name')
                ->get()
        );
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private function assertParticipant(int $conversationId, int $userId): void
    {
        abort_unless(
            ConversationParticipant::where('conversation_id', $conversationId)->where('user_id', $userId)->exists(),
            403,
            'Not a participant of this conversation.'
        );
    }

    // Returns true when $actor is allowed to initiate a conversation with $targetId.
    // Mirrors the contact matrix in contacts() — keep both in sync.
    private function canContact(User $actor, int $targetId): bool
    {
        if ($actor->id === $targetId) return false;

        $target = User::find($targetId);
        if (!$target || !$target->is_active || $target->deleted_at) return false;

        // Portal admins can reach anyone
        if (in_array($actor->role, ['system_admin', 'super_admin', 'admin_exec'])) {
            return !str_ends_with($target->email, '@smartpass.system');
        }

        switch ($actor->role) {

            case 'student': {
                $student = $actor->student;
                $sid     = $student?->student_id;

                // May contact: own professor (any term), own counselor (any assignment), system_admin/super_admin
                if (in_array($target->role, ['system_admin', 'super_admin'])) return true;

                if ($target->role === 'professor') {
                    return DB::table('student_enrollments')
                        ->join('class_sections', 'class_sections.id', '=', 'student_enrollments.class_section_id')
                        ->where('student_enrollments.student_id', $sid)
                        ->where('class_sections.professor_id', $targetId)
                        ->exists();
                }

                if ($target->role === 'guidance_counselor') {
                    return DB::table('student_counselor_assignments')
                        ->where('student_id', $sid)
                        ->where('counselor_id', $targetId)
                        ->exists();
                }

                return false;
            }

            case 'professor': {
                // May contact: own students (any term), all counselors, system_admin/super_admin
                if (in_array($target->role, ['system_admin', 'super_admin', 'guidance_counselor'])) return true;

                if ($target->role === 'student') {
                    $targetStudent = $target->student;
                    if (!$targetStudent) return false;
                    return DB::table('student_enrollments')
                        ->join('class_sections', 'class_sections.id', '=', 'student_enrollments.class_section_id')
                        ->where('class_sections.professor_id', $actor->id)
                        ->where('student_enrollments.student_id', $targetStudent->student_id)
                        ->exists();
                }

                return false;
            }

            case 'guidance_counselor': {
                // May contact: own students (any assignment), all professors, system_admin/super_admin
                if (in_array($target->role, ['system_admin', 'super_admin', 'professor'])) return true;

                if ($target->role === 'student') {
                    $targetStudent = $target->student;
                    if (!$targetStudent) return false;
                    return DB::table('student_counselor_assignments')
                        ->where('counselor_id', $actor->id)
                        ->where('student_id', $targetStudent->student_id)
                        ->exists();
                }

                return false;
            }
        }

        return false;
    }

    private function formatMessage(ChatMessage $msg, int $authId): array
    {
        $isDeleted = $msg->deleted_at !== null;
        return [
            'id'         => $msg->id,
            'body'       => $isDeleted ? null : $msg->body,
            'is_deleted' => $isDeleted,
            'is_mine'    => $msg->sender_id === $authId,
            'sender'     => [
                'id'         => $msg->sender->id,
                'name'       => $msg->sender->name,
                'nickname'   => $msg->sender->nickname,
                'avatar_url' => $msg->sender->avatar_url,
                'role'       => $msg->sender->role,
            ],
            'reply_to'   => $msg->replyTo ? [
                'id'             => $msg->replyTo->id,
                'body'           => $msg->replyTo->deleted_at ? null : $msg->replyTo->body,
                'sender_name'    => $msg->replyTo->sender?->name ?? 'Unknown',
                'has_attachment' => $msg->replyTo->attachments->isNotEmpty(),
            ] : null,
            'attachments'=> $msg->attachments->map(fn($a) => [
                'id'            => $a->id,
                'original_name' => $a->original_name,
                'url'           => $a->url,
                'mime_type'     => $a->mime_type,
                'file_size'     => $a->file_size,
            ])->values(),
            'created_at' => $msg->created_at,
        ];
    }

    private function formatConversation(Conversation $conv, int $userId, ?ConversationParticipant $myParticipant): array
    {
        $others = $conv->participants->where('user_id', '!=', $userId);

        // Unread count: messages not from me, newer than my last_read_at
        $lastReadAt = $myParticipant?->last_read_at;
        $unreadQuery = $conv->messages()->where('sender_id', '!=', $userId)->whereNull('deleted_at');
        if ($lastReadAt) {
            $unreadQuery->where('created_at', '>', $lastReadAt);
        }
        $unreadCount = $unreadQuery->count();

        $lm = $conv->latestMessage;

        return [
            'id'   => $conv->id,
            'type' => $conv->type,
            'name' => $conv->name ?? ($others->count() === 1 ? ($others->first()?->user?->name) : null),
            'participants' => $others->map(fn($p) => [
                'id'         => $p->user->id,
                'name'       => $p->user->name,
                'nickname'   => $p->user->nickname,
                'avatar_url' => $p->user->avatar_url,
                'role'       => $p->user->role,
            ])->values(),
            'last_message' => $lm ? [
                'id'             => $lm->id,
                'body'           => $lm->deleted_at ? null : $lm->body,
                'sender_name'    => $lm->sender?->name ?? '',
                'has_attachment' => $lm->attachments?->isNotEmpty() ?? false,
                'created_at'     => $lm->created_at,
            ] : null,
            'unread_count' => $unreadCount,
        ];
    }
}
