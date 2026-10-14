<?php

namespace App\Http\Controllers\Communication;

use App\Http\Controllers\Controller;
use App\Models\ConversationParticipant;
use App\Models\ChatMessage;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // GET /notifications — paginated list for auth user
    public function index(Request $request): JsonResponse
    {
        $rows = UserNotification::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'data'      => $rows->items(),
            'total'     => $rows->total(),
            'last_page' => $rows->lastPage(),
        ]);
    }

    // GET /notifications/unread-count — polled every 30s by client
    public function unreadCount(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        return response()->json([
            'count'                => UserNotification::where('user_id', $userId)->where('is_read', false)->count(),
            'message_unread_count' => $this->chatUnreadCount($userId),
        ]);
    }

    // PATCH /notifications/{id}/read
    public function markRead(Request $request, int $id): JsonResponse
    {
        UserNotification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'Marked as read']);
    }

    private function chatUnreadCount(int $userId): int
    {
        $parts = ConversationParticipant::where('user_id', $userId)->get();
        $total = 0;
        foreach ($parts as $p) {
            $q = ChatMessage::where('conversation_id', $p->conversation_id)
                ->where('sender_id', '!=', $userId)
                ->whereNull('deleted_at');
            if ($p->last_read_at) {
                $q->where('created_at', '>', $p->last_read_at);
            }
            $total += $q->count();
        }
        return $total;
    }

    // PATCH /notifications/read-all
    public function markAllRead(Request $request): JsonResponse
    {
        UserNotification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'All marked as read']);
    }

    // PATCH /notifications/{id}/unread
    public function markUnread(Request $request, int $id): JsonResponse
    {
        UserNotification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update(['is_read' => false, 'read_at' => null]);

        return response()->json(['message' => 'Marked as unread']);
    }

    // DELETE /notifications/{id}
    public function destroy(Request $request, int $id): JsonResponse
    {
        UserNotification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'Notification deleted']);
    }

    // DELETE /notifications
    public function destroyAll(Request $request): JsonResponse
    {
        UserNotification::where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'All notifications cleared']);
    }
}
