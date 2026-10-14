import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { attendanceApi } from '@/api/attendance'
import type { ClassSectionSummary } from '@/api/attendance'
import CountUp from '@/components/ui/CountUp'
import SkeletonCard from '@/components/ui/SkeletonCard'
import Card from '@/components/ui/Card'
import { BookOpen, Users, ChevronRight } from 'lucide-react'

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${m} ${ampm}`
}

export default function ProfessorClasses() {
  const [classes, setClasses] = useState<ClassSectionSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    attendanceApi.getProfessorClassSections()
      .then(r => setClasses(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalEnrolled = classes.reduce((s, c) => s + c.enrolled_count, 0)

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--sp-text-muted)]">
        {loading ? 'Loading your class sections…'
          : `${classes.length} class section${classes.length === 1 ? '' : 's'} · ${totalEnrolled} students enrolled`}
      </p>

      <Card title="My Classes" icon={BookOpen}>
        {loading ? <SkeletonCard rows={4} /> : classes.length === 0 ? (
          <div className="sp-squircle-lg border border-dashed border-[var(--sp-border)] p-10 text-center text-[var(--sp-text-muted)]">
            No class sections assigned for the current term.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map(cs => (
              <Link
                key={cs.id}
                to={`/professor/class/${cs.id}/attendance`}
                className="group block sp-squircle-lg bg-[var(--sp-subtle)] p-4 transition-all hover:border-sky-400 hover:shadow-[var(--sp-shadow-md)] hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-[var(--sp-text)] leading-tight">{cs.course_code}</p>
                    <p className="text-xs text-[var(--sp-text-muted)] truncate">{cs.course_name}</p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-sky-100 dark:bg-sky-900/40 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                    <Users size={11} />
                    <CountUp to={cs.enrolled_count} />
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--sp-text-muted)] mb-2">
                  <span>{cs.section}</span>
                  {cs.room && <span>· {cs.room}</span>}
                  <span>· {cs.schedule_days}</span>
                  <span>· {formatTime(cs.time_start)} – {formatTime(cs.time_end)}</span>
                </div>
                {cs.term && (
                  <span className="rounded-full bg-[var(--sp-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--sp-text-muted)]">
                    {cs.term}
                  </span>
                )}
                <div className="flex items-center gap-1 mt-2 text-xs text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  View attendance <ChevronRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
