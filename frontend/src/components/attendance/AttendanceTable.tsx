import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AttendanceSummary } from '@/api/attendance'
import { StatusPill } from './StatusPill'

interface Props {
  summaries: AttendanceSummary[]
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="sp-squircle-md bg-[var(--sp-subtle)] px-4 py-3 min-w-[5.5rem] text-center">
      <div className={`text-2xl font-bold leading-none ${color}`}>{value}</div>
      <div className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sp-text-muted)]">
        {label}
      </div>
    </div>
  )
}

function CourseCard({ summary: s }: { summary: AttendanceSummary }) {
  const [expanded, setExpanded] = useState(false)
  const records = s.records ?? []

  return (
    <div className="sp-block overflow-hidden">
      <div className="p-6 space-y-5">
        {/* Course identity */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-[var(--sp-text)]">{s.course_code}</h3>
            <p className="text-base text-[var(--sp-text-muted)] leading-relaxed">{s.course_name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--sp-text-muted)]">
            {s.room && <span>{s.room}</span>}
            <span>{s.schedule_days}</span>
            <span>{formatTime(s.time_start)} – {formatTime(s.time_end)}</span>
            <span className={`font-semibold ${s.attendance_rate >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {s.attendance_rate}%
            </span>
          </div>
        </div>

        {/* Summary — Excused only appears when it's actually been used. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <Stat label="Present" value={s.present} color="text-emerald-600 dark:text-emerald-400" />
            <Stat label="Late"    value={s.late}    color="text-amber-600  dark:text-amber-400" />
            <Stat label="Absent"  value={s.absent}  color="text-red-600    dark:text-red-400" />
            {s.excused > 0 && (
              <Stat label="Excused" value={s.excused} color="text-blue-600 dark:text-blue-400" />
            )}
          </div>

          {records.length > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              className="flex items-center gap-1.5 sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)]
                         px-4 py-2.5 text-sm font-semibold text-[var(--sp-text)] transition-colors"
            >
              {expanded ? 'View Less' : 'View More'}
              <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Detailed breakdown */}
      {expanded && records.length > 0 && (
        <div className="overflow-x-auto border-t border-[var(--sp-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sp-subtle)] text-[var(--sp-text-muted)]">
              <tr>
                <th className="px-6 py-2.5 text-left font-semibold">Date</th>
                <th className="px-6 py-2.5 text-left font-semibold">Status</th>
                <th className="px-6 py-2.5 text-left font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sp-border)]">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--sp-subtle)] transition-colors">
                  <td className="px-6 py-2.5 text-[var(--sp-text)]">{formatDate(r.date)}</td>
                  <td className="px-6 py-2.5"><StatusPill status={r.status} /></td>
                  <td className="px-6 py-2.5 text-[var(--sp-text-muted)]">{r.remarks ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {records.length === 0 && (
        <p className="px-6 pb-6 -mt-1 text-sm text-[var(--sp-text-muted)]">
          No attendance recorded for this class yet.
        </p>
      )}
    </div>
  )
}

export function AttendanceTable({ summaries }: Props) {
  if (!summaries.length) {
    return (
      <p className="text-center py-8 text-[var(--sp-text-muted)]">
        No enrolled classes found.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {summaries.map((s) => (
        <CourseCard key={s.class_section_id} summary={s} />
      ))}
    </div>
  )
}
