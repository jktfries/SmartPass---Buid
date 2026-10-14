import type { BadgeVariant } from '@/components/ui/Badge'

// Shared by the three counselor pages (dashboard, wellness logs, appointments).

export const RISK_VARIANT: Record<string, BadgeVariant> = {
  normal: 'success', struggling: 'warning', critical: 'danger',
}
export const MOOD_EMOJI: Record<string, string> = {
  great:'😄', good:'🙂', okay:'😐', bad:'😕', terrible:'😢',
}
export const STATUS_VARIANT: Record<string, BadgeVariant> = {
  Pending: 'warning', Approved: 'success', Declined: 'danger',
  Rescheduled: 'info', Completed: 'neutral', Cancelled: 'neutral',
}
export const APPOINTMENT_STATUSES = ['Approved','Declined','Rescheduled','Completed','Cancelled'] as const
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number]

export function fmtDate(dt: string) { return new Date(dt).toLocaleDateString('en-PH', { dateStyle: 'medium' }) }
export function fmtDateTime(dt: string) { return new Date(dt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) }
