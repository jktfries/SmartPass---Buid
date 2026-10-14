import api from './axios'

export type TicketCategory = 'account' | 'attendance' | 'technical' | 'wellness' | 'other'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface SupportTicket {
  id: number
  ticket_number: string
  subject: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  resolution_notes: string | null
  submitter: { id: number; name: string; role: string; email?: string } | null
  assignee:  { id: number; name: string } | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminStats {
  users: {
    total: number; student: number; professor: number
    guidance_counselor: number; admin_exec: number; system_admin: number; super_admin: number
  }
  tickets: { open: number; in_progress: number; resolved: number; closed: number }
  approvals: { pending: number }
  system: { maintenance_mode: boolean }
  recent_tickets: SupportTicket[]
  recent_audit: Array<{
    id: number; actor_name: string | null; category: string
    action: string; severity: string; created_at: string
  }>
}

export const ticketsApi = {
  list: (params?: { status?: string; category?: string; priority?: string; search?: string; page?: number }) =>
    api.get<{ data: SupportTicket[]; total: number; last_page: number }>('/tickets', { params }),

  create: (data: { subject: string; description: string; category: TicketCategory; priority: TicketPriority }) =>
    api.post<SupportTicket>('/tickets', data),

  show: (id: number) =>
    api.get<SupportTicket>(`/tickets/${id}`),

  update: (id: number, data: { status?: TicketStatus; resolution_notes?: string; assigned_to?: number | null; priority?: TicketPriority }) =>
    api.patch<SupportTicket>(`/sysadmin/tickets/${id}`, data),

  adminStats: () =>
    api.get<AdminStats>('/sysadmin/stats'),
}
