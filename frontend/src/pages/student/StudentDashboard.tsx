import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { attendanceApi } from '@/api/attendance'
import type { StudentDashboardData } from '@/api/attendance'
import { trendsApi } from '@/api/trends'
import type { StudentTrends } from '@/api/trends'
import { useAuth } from '@/context/AuthContext'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  Tooltip, ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts'
import AttendanceRing from '@/components/charts/AttendanceRing'
import SkeletonCard from '@/components/ui/SkeletonCard'
import Card from '@/components/ui/Card'
import Kpi from '@/components/ui/Kpi'
import WidgetGrid from '@/components/dashboard/WidgetGrid'
import { chartHeight, TOOLTIP_STYLE, AXIS_PROPS, LINE_CAPS } from '@/lib/chartTheme'
import {
  CalendarCheck, HeartPulse, CalendarClock, MessageSquare,
  TrendingUp, BookOpen, ChevronRight, Zap,
} from 'lucide-react'

const MOOD_SCORE_COLOR = (score: number) =>
  score >= 4 ? '#10b981' : score === 3 ? '#f59e0b' : '#ef4444'

const MOOD_LABEL: Record<string, string> = {
  great: '😄 Great', good: '🙂 Good', okay: '😐 Okay', bad: '😕 Not Great', terrible: '😢 Struggling',
}


function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData]       = useState<StudentDashboardData | null>(null)
  const [trends, setTrends]   = useState<StudentTrends | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      attendanceApi.getStudentDashboard(),
      trendsApi.studentTrends().catch(() => null),
    ]).then(([d, tr]) => {
      setData(d.data)
      if (tr) setTrends(tr.data)
    }).finally(() => setLoading(false))
  }, [])

  const latestMood = trends?.mood_history?.[trends.mood_history.length - 1]

  const quickActions = [
    { label: 'Attendance',   sub: 'View your record',    icon: CalendarCheck, to: '/student/attendance' },
    { label: 'Log Mood',     sub: 'Daily wellness check', icon: HeartPulse,    to: '/student/wellness' },
    { label: 'Appointments', sub: 'Book or review',       icon: CalendarClock, to: '/student/appointments' },
    { label: 'Messages',     sub: 'Talk to your team',    icon: MessageSquare, to: '/messages' },
  ]

  return (
    <div className="sp-page">
      <p className="text-base text-[var(--sp-text-muted)] leading-relaxed">
        {greeting()}, {user?.name?.split(' ')[0] ?? 'Student'} — {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      <WidgetGrid widgets={{
        'attendance-hero': (
      <Card padding="md">
        {loading ? <SkeletonCard rows={2} height="h-12" /> : (
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <AttendanceRing rate={data?.overall_attendance_rate ?? 0} size={150} />
            </div>
            <div className="flex-1 min-w-0 w-full">
              {data && (
                <p className="text-sm text-[var(--sp-text-muted)] mb-4">
                  {data.program} · {data.section} · {data.student_id}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Kpi label="Present" value={data?.overall_present ?? 0} tone="success" />
                <Kpi label="Absent"  value={data?.overall_absent  ?? 0} tone="danger" />
                <Kpi label="Late"    value={data?.overall_late    ?? 0} tone="warning" />
              </div>
            </div>
          </div>
        )}
      </Card>
        ),
        'attendance-trend': (span: number) => (
        <Card title="Attendance Trend" subtitle="Your weekly rate over time" icon={TrendingUp}>
          {!trends?.weeks?.length ? (
            <div className="flex items-center justify-center text-sm text-[var(--sp-text-muted)]" style={{ height: chartHeight(span) }}>No trend data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight(span)}>
              <AreaChart data={trends.weeks} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="studAttGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--sp-primary)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--sp-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week_label" {...AXIS_PROPS} />
                <YAxis domain={[0, 100]} {...AXIS_PROPS} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v)}%`, 'Attendance']} />
                <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Area
                  type="monotone" dataKey="rate" stroke="var(--sp-primary)" strokeWidth={3}
                  {...LINE_CAPS}
                  fill="url(#studAttGrad)" dot={false} activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
        ),
        // Zap, not TrendingUp — that belongs to Attendance Trend, and two cards
        // on one screen sharing an icon reads as a rendering bug. Deliberately
        // not a gear either: that's Settings elsewhere in the app.
        'quick-actions': (
        <Card title="Quick Actions" icon={Zap}>
          <div className="space-y-3">
            {quickActions.map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                className="group w-full flex items-center gap-3 sp-squircle-lg bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] px-4 py-3 text-left transition-colors"
              >
                <span className="w-10 h-10 sp-squircle-md bg-[var(--sp-surface)] flex items-center justify-center flex-shrink-0">
                  <a.icon size={17} className="text-[var(--sp-primary)]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-[var(--sp-text)]">{a.label}</span>
                  <span className="block text-xs text-[var(--sp-text-muted)] truncate">{a.sub}</span>
                </span>
                <ChevronRight size={16} className="text-[var(--sp-text-muted)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </Card>
        ),
        'class-breakdown': (
        <Card title="Class Breakdown" subtitle="Attendance rate per class" icon={BookOpen}>
          {loading ? <SkeletonCard rows={3} /> : !data?.summaries?.length ? (
            <div className="flex items-center justify-center text-sm text-[var(--sp-text-muted)]" style={{ minHeight: 180 }}>No enrolled classes</div>
          ) : (
            <div className="space-y-4">
              {data.summaries.map(s => (
                <div key={s.class_section_id} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--sp-text)] truncate">
                      {s.course_code}
                      <span className="text-[var(--sp-text-muted)] font-normal ml-1.5">{s.course_name}</span>
                    </span>
                    {/* Emerald, not the accent: this is a "good / bad" signal and has
                        to keep meaning the same whatever accent the user picks. */}
                    <span className={`text-base font-bold flex-shrink-0 ${s.attendance_rate >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {s.attendance_rate}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--sp-subtle)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.attendance_rate}%`,
                        background: s.attendance_rate >= 75 ? '#10b981' : s.attendance_rate >= 60 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-[var(--sp-text-muted)]">
                    <span><span className="text-emerald-600 font-semibold">{s.present}</span> present</span>
                    <span><span className="text-amber-500 font-semibold">{s.late}</span> late</span>
                    <span><span className="text-red-500 font-semibold">{s.absent}</span> absent</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        ),
        'mood': (span: number) => (
        <Card
          title="Mood"
          subtitle="Last 14 days"
          icon={HeartPulse}
          actions={latestMood && (
            <span className="sp-squircle-sm bg-[var(--sp-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--sp-text)]">
              {MOOD_LABEL[latestMood.mood] ?? latestMood.mood}
            </span>
          )}
        >
          {!trends?.mood_history?.length ? (
            <div className="flex items-center justify-center text-sm text-[var(--sp-text-muted)]" style={{ height: chartHeight(span) }}>No mood data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight(span)}>
              <LineChart data={trends.mood_history} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <XAxis dataKey="date" tickFormatter={d => d.slice(5)} {...AXIS_PROPS} />
                <YAxis domain={[1, 4]} ticks={[1,2,3,4]} {...AXIS_PROPS} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(_v, _n, item) => [String((item?.payload as { mood?: string })?.mood ?? ''), 'Mood']}
                />
                <Line
                  type="monotone" dataKey="mood_score" stroke="var(--sp-primary)" strokeWidth={3}
                  {...LINE_CAPS}
                  dot={(props: { cx?: number; cy?: number; payload?: { mood_score?: number } }) => (
                    <Dot cx={props.cx} cy={props.cy} r={5}
                      fill={MOOD_SCORE_COLOR(props.payload?.mood_score ?? 3)}
                      stroke="var(--sp-surface)" strokeWidth={2} />
                  )}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
        ),
      }} />
    </div>
  )
}
