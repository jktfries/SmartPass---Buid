import api from './axios'

export interface NotificationItem {
  id: number
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export const notificationApi = {
  list: (page = 1) =>
    api.get<{ data: NotificationItem[]; total: number; last_page: number }>('/notifications', { params: { page } }),
  unreadCount: () =>
    api.get<{ count: number; message_unread_count: number }>('/notifications/unread-count'),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markUnread: (id: number) => api.patch(`/notifications/${id}/unread`),
  markAllRead: () => api.patch('/notifications/read-all'),
  remove: (id: number) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications'),
}
