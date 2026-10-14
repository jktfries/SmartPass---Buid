import api from './axios'

export interface ChatParticipant {
  id: number
  name: string
  nickname: string | null
  avatar_url: string | null
  role: string
}

export interface ChatAttachment {
  id: number
  original_name: string
  url: string
  mime_type: string
  file_size: number
}

export interface ReplyPreview {
  id: number
  body: string | null
  sender_name: string
  has_attachment: boolean
}

export interface ChatMessage {
  id: number
  body: string | null
  is_deleted: boolean
  is_mine: boolean
  sender: ChatParticipant
  reply_to: ReplyPreview | null
  attachments: ChatAttachment[]
  created_at: string
}

export interface ConversationItem {
  id: number
  type: 'direct' | 'group'
  name: string | null
  participants: ChatParticipant[]
  last_message: {
    id: number
    body: string | null
    sender_name: string
    has_attachment: boolean
    created_at: string
  } | null
  unread_count: number
}

export interface Contact {
  id: number
  name: string
  nickname: string | null
  email: string
  role: string
  avatar_url: string | null
}

export const chatApi = {
  getConversations: () =>
    api.get<ConversationItem[]>('/chat/conversations'),

  startConversation: (data: { target_user_id?: number; participants?: number[]; name?: string }) =>
    api.post<ConversationItem>('/chat/conversations', data),

  getMessages: (convId: number, params?: { after_id?: number; before_id?: number }) =>
    api.get<ChatMessage[]>(`/chat/conversations/${convId}/messages`, { params }),

  sendMessage: (convId: number, formData: FormData) =>
    api.post<ChatMessage>(`/chat/conversations/${convId}/messages`, formData),

  markRead: (convId: number) =>
    api.post(`/chat/conversations/${convId}/read`),

  hideConversation: (convId: number) =>
    api.delete(`/chat/conversations/${convId}`),

  deleteMessage: (msgId: number) =>
    api.delete(`/chat/messages/${msgId}`),

  getContacts: (search?: string) =>
    api.get<Contact[]>('/chat/contacts', { params: search ? { search } : undefined }),
}
