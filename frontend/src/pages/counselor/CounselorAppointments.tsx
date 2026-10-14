import { useEffect, useState } from 'react'
import { wellnessApi } from '@/api/wellness'
import type { AppointmentItem } from '@/api/wellness'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import { STATUS_VARIANT, APPOINTMENT_STATUSES, fmtDateTime } from './counselorShared'
import type { AppointmentStatus } from './counselorShared'

function UpdateStatusModal({ apt, onClose, onSaved }: { apt: AppointmentItem; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<AppointmentStatus>('Approved')
  const [notes, setNotes] = useState('')
  const [rescheduledTo, setRescheduledTo] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await wellnessApi.updateAppointmentStatus(apt.id, {
      status,
      notes: notes || undefined,
      rescheduled_to: status === 'Rescheduled' ? rescheduledTo : undefined,
    })
    setSaving(false); onSaved()
  }

  return (
    <Modal
      title="Update Appointment"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving || (status === 'Rescheduled' && !rescheduledTo)}>
          {saving ? 'Saving…' : 'Update'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--sp-text-muted)]">{apt.student_name} · {fmtDateTime(apt.scheduled_at)}</p>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--sp-text-muted)]">New Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as AppointmentStatus)} className="input-field">
            {APPOINTMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {status === 'Rescheduled' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--sp-text-muted)]">New Date & Time</label>
            <input type="datetime-local" value={rescheduledTo} onChange={e => setRescheduledTo(e.target.value)} className="input-field" />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--sp-text-muted)]">Note <span className="opacity-60">(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="input-field" />
        </div>
      </div>
    </Modal>
  )
}

export default function CounselorAppointments() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [updating, setUpdating] = useState<AppointmentItem | null>(null)

  const load = () => {
    setLoading(true)
    wellnessApi.getCounselorAppointments({ status: filterStatus || undefined })
      .then(r => setAppointments(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filterStatus])

  return (
    <div className="space-y-6">
      <p className="text-base text-[var(--sp-text-muted)] leading-relaxed">
        Approve, reschedule or complete counseling sessions
      </p>

      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-auto">
        <option value="">All statuses</option>
        {['Pending','Approved','Declined','Rescheduled','Completed','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 sp-squircle-lg bg-[var(--sp-border)] animate-pulse" />)}</div>
      ) : (
        <Table headers={['Student','Scheduled','Status','Reason','Actions']} empty={appointments.length === 0} emptyMessage="No appointments found.">
          {appointments.map(a => (
            <tr key={a.id} className="hover:bg-[var(--sp-subtle)]">
              <td className="px-4 py-3 font-medium text-[var(--sp-text)]">{a.student_name}</td>
              <td className="px-4 py-3 text-[var(--sp-text-muted)]">
                {fmtDateTime(a.scheduled_at)}
                {a.rescheduled_to && <><br /><span className="text-xs text-sky-600">→ {fmtDateTime(a.rescheduled_to)}</span></>}
              </td>
              <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[a.status]}>{a.status}</Badge></td>
              <td className="px-4 py-3 text-[var(--sp-text-muted)] max-w-xs truncate">{a.reason ?? '—'}</td>
              <td className="px-4 py-3">
                {!['Completed','Cancelled','Declined'].includes(a.status) && (
                  <button onClick={() => setUpdating(a)} className="text-xs text-[var(--sp-primary)] hover:underline">Update</button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {updating && <UpdateStatusModal apt={updating} onClose={() => setUpdating(null)} onSaved={() => { setUpdating(null); load() }} />}
    </div>
  )
}
