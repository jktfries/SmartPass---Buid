import { useEffect, useState } from 'react'
import { wellnessApi } from '@/api/wellness'
import type { AppointmentItem } from '@/api/wellness'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  Pending: 'warning', Approved: 'success', Declined: 'danger',
  Rescheduled: 'info', Completed: 'neutral', Cancelled: 'neutral',
}

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

function RequestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!scheduledAt) { setError('Please select a date and time.'); return }
    setSaving(true); setError('')
    try {
      await wellnessApi.requestAppointment({ scheduled_at: scheduledAt, reason: reason.trim() || undefined })
      onSuccess()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Could not submit request.')
    } finally { setSaving(false) }
  }

  // Min datetime: now + 1 hour (rounded)
  const minDt = new Date(Date.now() + 3600000).toISOString().slice(0, 16)

  return (
    <Modal
      title="Request Counseling Appointment"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</Button>
      </>}
    >
      <div className="space-y-4">
        {error && <p className="sp-squircle-sm bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--sp-text-muted)]">Preferred Date & Time</label>
          <input
            type="datetime-local"
            min={minDt}
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--sp-text-muted)]">Reason / Note <span className="opacity-60">(optional)</span></label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="What would you like to discuss?"
            className="input-field"
          />
        </div>
      </div>
    </Modal>
  )
}

export default function StudentAppointments() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const load = () => {
    setLoading(true)
    wellnessApi.getStudentAppointments().then(r => setAppointments(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function handleSuccess() {
    setShowModal(false)
    setSuccessMsg('Appointment request submitted. Your counselor will review it shortly.')
    load()
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  async function handleCancel(id: number) {
    if (!window.confirm('Cancel this appointment request?')) return
    await wellnessApi.cancelAppointment(id)
    load()
  }

  const upcoming = appointments.filter(a => ['Pending','Approved','Rescheduled'].includes(a.status))
  const past     = appointments.filter(a => !['Pending','Approved','Rescheduled'].includes(a.status))

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)}>+ Request Appointment</Button>
      </div>

      {successMsg && (
        <div className="sp-squircle-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{successMsg}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-24 sp-squircle-lg bg-[var(--sp-border)] animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Upcoming */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--sp-text-muted)]">Upcoming / Pending</h3>
            {upcoming.length === 0
              ? <p className="text-sm text-[var(--sp-text-muted)]">No upcoming appointments.</p>
              : upcoming.map(a => <AppointmentCard key={a.id} apt={a} onCancel={() => handleCancel(a.id)} />)
            }
          </section>

          {/* Past */}
          {past.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--sp-text-muted)]">Past / Closed</h3>
              {past.map(a => <AppointmentCard key={a.id} apt={a} />)}
            </section>
          )}
        </>
      )}

      {showModal && <RequestModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
    </div>
  )
}

function AppointmentCard({ apt, onCancel }: { apt: AppointmentItem; onCancel?: () => void }) {
  return (
    <div className="sp-squircle-lg bg-[var(--sp-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[apt.status] ?? 'neutral'}>{apt.status}</Badge>
            {apt.status === 'Rescheduled' && apt.rescheduled_to && (
              <span className="text-xs text-sky-600">→ {formatDateTime(apt.rescheduled_to)}</span>
            )}
          </div>
          <p className="text-sm font-medium text-[var(--sp-text)]">
            {formatDateTime(apt.scheduled_at)}
            <span className="ml-2 text-xs text-[var(--sp-text-muted)]">with {apt.counselor_name ?? 'Counselor'}</span>
          </p>
          {apt.reason && <p className="text-xs text-[var(--sp-text-muted)]">{apt.reason}</p>}
          {apt.notes && (
            <div className="mt-2 sp-squircle-sm bg-[var(--sp-primary-soft-bg)] px-3 py-2">
              <p className="text-xs font-semibold text-[var(--sp-primary-soft-text)]">Counselor Note</p>
              <p className="text-xs text-[var(--sp-text)]">{apt.notes}</p>
            </div>
          )}
        </div>
        {onCancel && (
          <button onClick={onCancel} className="text-xs text-red-500 hover:underline">Cancel</button>
        )}
      </div>
    </div>
  )
}
