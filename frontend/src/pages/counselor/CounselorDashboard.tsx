import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { trendsApi } from '@/api/trends'
import type { CounselorWellnessStats } from '@/api/trends'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import CountUp from '@/components/ui/CountUp'
import SkeletonCard from '@/components/ui/SkeletonCard'
import Card from '@/components/ui/Card'
import Kpi from '@/components/ui/Kpi'
import WidgetGrid from '@/components/dashboard/WidgetGrid'
import Badge from '@/components/ui/Badge'
import { chartHeight, TOOLTIP_STYLE, AXIS_PROPS } from '@/lib/chartTheme'
import { HeartPulse, CalendarClock, ChevronRight } from 'lucide-react'

export default function CounselorDashboard() {
  // The fetch lives here rather than in a wrapper component: each analytic is an
  // independently reorderable/hideable widget now, and they all read one response.
  const [stats, setStats] = useState<CounselorWellnessStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    trendsApi.counselorWellnessStats()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const donutData = stats ? [
    { name: 'Normal',     value: stats.risk_distribution.normal,     fill: '#10b981' },
    { name: 'Struggling', value: stats.risk_distribution.struggling, fill: '#f59e0b' },
    { name: 'Critical',   value: stats.risk_distribution.critical,   fill: '#ef4444' },
  ].filter(d => d.value > 0) : []

  const shortcuts = (
    <div className="grid grid-cols-1 sm:grid-cols-2 sp-grid">
      {[
        { to: '/counselor/wellness-logs', icon: HeartPulse,    label: 'Wellness Logs', sub: 'Review and triage student check-ins' },
        { to: '/counselor/appointments',  icon: CalendarClock, label: 'Appointments',  sub: 'Approve, reschedule or complete sessions' },
      ].map(l => (
        <Link
          key={l.to}
          to={l.to}
          className="group flex items-center gap-4 sp-block px-6 py-5 hover:bg-[var(--sp-subtle)] transition-colors"
        >
          <span className="w-12 h-12 sp-squircle-md bg-[var(--sp-primary-soft-bg)] flex items-center justify-center flex-shrink-0">
            <l.icon size={20} className="text-[var(--sp-primary-soft-text)]" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-lg font-semibold text-[var(--sp-text)]">{l.label}</span>
            <span className="block text-sm text-[var(--sp-text-muted)]">{l.sub}</span>
          </span>
          <ChevronRight size={18} className="text-[var(--sp-text-muted)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ))}
    </div>
  )

  return (
    <div className="sp-page">
      <p className="text-base text-[var(--sp-text-muted)] leading-relaxed">
        Caseload overview — wellness risk across your assigned students
      </p>

      <WidgetGrid widgets={{
        'risk-distribution': (
          <Card title="Risk Distribution" subtitle="All assigned students">
            {loading || !stats ? <SkeletonCard rows={3} /> : (
              <div className="flex items-center gap-6">
                <div className="relative flex-shrink-0" style={{ width: 160, height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={4} cornerRadius={99}>
                        {donutData.map((_, i) => <Cell key={i} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold tracking-tight text-[var(--sp-text)]">{stats.total_students}</span>
                    <span className="text-xs text-[var(--sp-text-muted)]">students</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Normal',     count: stats.risk_distribution.normal,     variant: 'success' as const },
                    { label: 'Struggling', count: stats.risk_distribution.struggling, variant: 'warning' as const },
                    { label: 'Critical',   count: stats.risk_distribution.critical,   variant: 'danger' as const },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-3">
                      <Badge variant={r.variant} className="min-w-[5.5rem] justify-center">{r.label}</Badge>
                      <span className="text-lg font-bold text-[var(--sp-text)]"><CountUp to={r.count} /></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ),
        'caseload-kpis': (
          <div className="flex flex-col gap-4 h-full">
            <Kpi label="Assigned Students" value={stats?.total_students ?? 0} tone="neutral" className="flex-1" />
            <Kpi label="Unreviewed Logs" value={stats?.unreviewed_count ?? 0}
              tone={(stats?.unreviewed_count ?? 0) > 0 ? 'warning' : 'neutral'} className="flex-1" />
            <Kpi label="Critical Cases" value={stats?.critical_count ?? 0}
              tone={(stats?.critical_count ?? 0) > 0 ? 'danger' : 'neutral'} className="flex-1" />
          </div>
        ),
        'risk-trend': (span: number) => (
          <Card title="8-Week Risk Trend" subtitle="Weekly wellness risk split">
            {loading || !stats ? <SkeletonCard rows={3} /> : (
              <ResponsiveContainer width="100%" height={chartHeight(span)}>
                <BarChart data={stats.risk_trend} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                  <XAxis dataKey="week_label" {...AXIS_PROPS} />
                  <YAxis {...AXIS_PROPS} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="normal"     name="Normal"     stackId="a" fill="#10b981" barSize={22} />
                  <Bar dataKey="struggling" name="Struggling" stackId="a" fill="#f59e0b" barSize={22} />
                  <Bar dataKey="critical"   name="Critical"   stackId="a" fill="#ef4444" barSize={22} radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        ),
        'shortcuts': shortcuts,
      }} />
    </div>
  )
}
