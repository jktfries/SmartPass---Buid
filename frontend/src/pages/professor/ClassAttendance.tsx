import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { attendanceApi } from '@/api/attendance'
import type { ProfessorClassAttendance } from '@/api/attendance'
import { StatusPill } from '@/components/attendance/StatusPill'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import { ScanLine, ClipboardPlus } from 'lucide-react'

const STATUS_OPTIONS = ['present', 'late', 'absent', 'excused'] as const
const todayStr = () => new Date().toISOString().slice(0, 10)

export default function ClassAttendance() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ProfessorClassAttendance | null>(null)
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState<'scan' | 'log' | null>(null)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [logDate, setLogDate] = useState(todayStr())
  const [logStatus, setLogStatus] = useState<typeof STATUS_OPTIONS[number]>('present')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  function load() {
    if (!id) return
    setLoading(true)
    attendanceApi.getClassAttendance(Number(id))
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  function openModal(mode: 'scan' | 'log') {
    setSelectedStudent(data?.students[0]?.student_id ?? '')
    setLogDate(todayStr())
    setLogStatus('present')
    setFeedback(null)
    setModal(mode)
  }
  function closeModal() { setModal(null); setFeedback(null) }

  async function handleSimulateScan() {
    if (!id || !selectedStudent) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await attendanceApi.simulateScan(Number(id), selectedStudent)
      if (res.data.success) {
        setFeedback({ ok: true, text: `Scanned in as ${res.data.status}.` })
        load()
      } else {
        setFeedback({ ok: false, text: res.data.message ?? 'Scan failed.' })
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setFeedback({ ok: false, text: err.response?.data?.message ?? 'Scan failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogAttendance() {
    if (!id || !selectedStudent) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await attendanceApi.logAttendance(Number(id), {
        student_id: selectedStudent, date: logDate, status: logStatus,
      })
      if (res.data.success) {
        setFeedback({ ok: true, text: 'Attendance recorded.' })
        load()
      } else {
        setFeedback({ ok: false, text: res.data.message ?? 'Could not save.' })
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setFeedback({ ok: false, text: err.response?.data?.message ?? 'Could not save.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 sp-squircle-sm bg-[var(--sp-border)]" />
        <div className="h-64 sp-squircle-lg bg-[var(--sp-border)]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-[var(--sp-text-muted)]">
        Class not found or you don't have access.
        <br />
        <Link to="/professor/dashboard" className="mt-2 inline-block text-sky-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const cs = data.class_section
  const allDates = Array.from(
    new Set(data.students.flatMap((s) => s.records.map((r) => r.date)))
  ).sort()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/professor/dashboard" className="text-sm text-sky-600 hover:underline">
            ← My Classes
          </Link>
          <p className="mt-1 text-lg font-semibold text-[var(--sp-text)]">
            {cs.course_code} — {cs.section}
          </p>
          <p className="text-sm text-[var(--sp-text-muted)]">
            {cs.course_name} · {cs.room} · {cs.schedule_days} · {cs.term}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => openModal('scan')}>
            <ScanLine size={14} /> Simulate RFID Scan
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openModal('log')}>
            <ClipboardPlus size={14} /> Log Attendance
          </Button>
          <div className="ml-2 text-sm text-[var(--sp-text-muted)] whitespace-nowrap">
            {data.students.length} students enrolled
          </div>
        </div>
      </div>

      {/* Student summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.students.map((s) => (
          <div key={s.student_id} className="sp-squircle-lg bg-[var(--sp-surface)] p-4">
            <div className="font-medium text-[var(--sp-text)]">{s.name}</div>
            <div className="text-xs text-[var(--sp-text-muted)] mb-2">{s.student_id}</div>
            <div className="flex gap-3 text-sm">
              <span className="text-emerald-600 font-medium">{s.present}P</span>
              <span className="text-amber-600 font-medium">{s.late}L</span>
              <span className="text-red-600 font-medium">{s.absent}A</span>
              <span className={`ml-auto font-bold ${s.attendance_rate >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                {s.attendance_rate}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Date × Student matrix */}
      {allDates.length > 0 && (
        <div className="overflow-x-auto sp-squircle-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--sp-subtle)] text-[var(--sp-text-muted)]">
              <tr>
                <th className="sticky left-0 z-10 bg-[var(--sp-subtle)] px-4 py-3 text-left font-medium whitespace-nowrap">
                  Student
                </th>
                {allDates.map((d) => (
                  <th key={d} className="px-3 py-3 text-center font-medium whitespace-nowrap">
                    {d.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sp-border)]">
              {data.students.map((s) => {
                const byDate = Object.fromEntries(s.records.map((r) => [r.date, r.status]))
                return (
                  <tr key={s.student_id} className="hover:bg-[var(--sp-subtle)]">
                    <td className="sticky left-0 z-10 bg-[var(--sp-surface)] px-4 py-2.5 font-medium text-[var(--sp-text)] whitespace-nowrap">
                      {s.name}
                    </td>
                    {allDates.map((d) => (
                      <td key={d} className="px-3 py-2.5 text-center">
                        {byDate[d] ? <StatusPill status={byDate[d]} /> : <span className="text-[var(--sp-text-muted)]">—</span>}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'scan' && (
        <Modal title="Simulate RFID Scan" onClose={closeModal}>
          <div className="space-y-4">
            <p className="text-sm text-[var(--sp-text-muted)]">
              Simulates the student badging in right now, using their stored RFID tag — same present/late logic as a real scan.
            </p>
            <FormField label="Student" required>
              <select
                className="input-field"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                {data.students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>{s.name} — {s.student_id}</option>
                ))}
              </select>
            </FormField>
            {feedback && (
              <p className={`text-sm px-3 py-2 sp-squircle-sm ${feedback.ok
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                {feedback.text}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>Close</Button>
              <Button onClick={handleSimulateScan} disabled={submitting || !selectedStudent}>
                {submitting ? 'Scanning…' : 'Simulate Scan'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'log' && (
        <Modal title="Log Attendance" onClose={closeModal}>
          <div className="space-y-4">
            <FormField label="Student" required>
              <select
                className="input-field"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                {data.students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>{s.name} — {s.student_id}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Date" required>
              <input type="date" className="input-field" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
            </FormField>
            <FormField label="Status" required>
              <select className="input-field" value={logStatus} onChange={(e) => setLogStatus(e.target.value as typeof logStatus)}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </select>
            </FormField>
            {feedback && (
              <p className={`text-sm px-3 py-2 sp-squircle-sm ${feedback.ok
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                {feedback.text}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>Close</Button>
              <Button onClick={handleLogAttendance} disabled={submitting || !selectedStudent}>
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
