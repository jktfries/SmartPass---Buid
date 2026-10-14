import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { attendanceApi } from '@/api/attendance'
import type { ClassSectionSummary } from '@/api/attendance'
import CountUp from '@/components/ui/CountUp'
import SkeletonCard from '@/components/ui/SkeletonCard'
import Card from '@/components/ui/Card'
import Kpi from '@/components/ui/Kpi'
import WidgetGrid from '@/components/dashboard/WidgetGrid'
import { BookOpen, Users, ChevronRight, Lock } from 'lucide-react'

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${m} ${ampm}`
}

export default function ProfessorDashboard() {
  const [classes, setClasses] = useState<ClassSectionSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    attendanceApi.getProfessorClassSections()
      .then(r => setClasses(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalEnrolled = classes.reduce((s, c) => s + c.enrolled_count, 0)
  const avgClassSize = classes.length > 0 ? Math.round(totalEnrolled / classes.length) : 0

  return (
    <div className="sp-page">
      <p className="text-base text-[var(--sp-text-muted)] leading-relaxed">Your classes and enrollment overview</p>

      <WidgetGrid widgets={{
        'kpis': (
          <>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 sp-grid"><SkeletonCard rows={1} height="h-12" /><SkeletonCard rows={1} height="h-12" /><SkeletonCard rows={1} height="h-12" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 sp-grid">
          <Kpi label="Total Classes"  value={classes.length} tone="primary" />
          <Kpi label="Total Enrolled" value={totalEnrolled}  tone="neutral" />
          <Kpi label="Avg Class Size" value={avgClassSize}   tone="success" />
        </div>
      )}
          </>
        ),
        'my-classes': (
        <Card title="My Classes" subtitle="Open a class to take attendance" icon={BookOpen}>
          {loading ? <SkeletonCard rows={3} /> : classes.length === 0 ? (
            <div className="sp-squircle-lg bg-[var(--sp-subtle)] p-10 text-center text-sm text-[var(--sp-text-muted)]">
              No class sections assigned for the current term.
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map(cs => (
                <Link
                  key={cs.id}
                  to={`/professor/class/${cs.id}/attendance`}
                  className="group flex items-center gap-4 sp-squircle-lg bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] px-5 py-4 transition-colors"
                >
                  <span className="w-11 h-11 sp-squircle-md bg-[var(--sp-surface)] flex items-center justify-center flex-shrink-0">
                    <BookOpen size={18} className="text-[var(--sp-primary)]" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="text-base font-bold text-[var(--sp-text)]">{cs.course_code}</span>
                      <span className="text-sm text-[var(--sp-text-muted)] truncate">{cs.course_name}</span>
                    </span>
                    <span className="block text-xs text-[var(--sp-text-muted)] mt-0.5 truncate">
                      {cs.section}{cs.room && ` · ${cs.room}`} · {cs.schedule_days} · {formatTime(cs.time_start)} – {formatTime(cs.time_end)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--sp-primary-soft-bg)] px-3 py-1 text-xs font-semibold text-[var(--sp-primary-soft-text)] flex-shrink-0">
                    <Users size={12} />
                    <CountUp to={cs.enrolled_count} />
                  </span>
                  <ChevronRight size={16} className="text-[var(--sp-text-muted)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </Card>
        ),
        'at-risk': (
        <Card title="At-Risk Students" subtitle="Coming soon" icon={Users}>
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="w-14 h-14 sp-squircle-md bg-[var(--sp-subtle)] flex items-center justify-center">
              <Lock size={22} className="text-[var(--sp-text-muted)]" />
            </div>
            <p className="text-sm text-[var(--sp-text-muted)] max-w-[200px] leading-relaxed">
              Requires attendance data analysis — coming in a future update.
            </p>
          </div>
        </Card>
        ),
      }} />
    </div>
  )
}
