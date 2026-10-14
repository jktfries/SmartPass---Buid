import api from './axios'

export interface MessageItem {
  id: number
  subject: string | null
  body: string
  sender_name: string | null
  sender_role?: string
  is_read?: boolean
  read_at?: string | null
  received_at?: string
  sent_at?: string
  recipient_type?: string
  group_target?: string | null
  recipient_count?: number
  is_own?: boolean
}

export interface ComposePayload {
  subject?: string
  body: string
  recipient_type: 'individual' | 'group' | 'broadcast'
  recipient_user_id?: number
  group_target?: string
}

export const messageApi = {
  inbox: (page = 1) =>
    api.get<{ data: MessageItem[]; total: number; last_page: number; unread_count: number }>(
      '/messages/inbox', { params: { page } }
    ),
  sent: (page = 1) =>
    api.get<{ data: MessageItem[]; total: number; last_page: number }>('/messages/sent', { params: { page } }),
  show: (id: number) => api.get<MessageItem>(`/messages/${id}`),
  compose: (data: ComposePayload) =>
    api.post<{ message: string; recipient_count: number }>('/messages', data),
}
