import { useEffect, useState } from 'react'
import { adminApi, triggerCsvDownload } from '@/api/admin'
import type { AttendanceSummary, AttendanceRow, WellnessSummary, WellnessFlaggedRow } from '@/api/admin'
import { trendsApi } from '@/api/trends'
import type { AdminTrends } from '@/api/trends'
import {
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie,
  XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, LabelList,
} from 'recharts'
import SkeletonCard from '@/components/ui/SkeletonCard'
import Card from '@/components/ui/Card'
import Kpi from '@/components/ui/Kpi'
import WidgetGrid from '@/components/dashboard/WidgetGrid'
import { chartHeight, TOOLTIP_STYLE, AXIS_PROPS, LINE_CAPS } from '@/lib/chartTheme'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import { TrendingUp, Users, HeartPulse } from 'lucide-react'

function rateVariant(rate: number): 'success' | 'warning' | 'danger' {
  return rate >= 80 ? 'success' : rate >= 60 ? 'warning' : 'danger'
}

function riskVariant(risk: string): 'success' | 'warning' | 'danger' {
  if (risk === 'critical') return 'danger'
  if (risk === 'struggling') return 'warning'
  return 'success'
}

export default function AdminDashboard() {
  const [attSummary, setAttSummary] = useState<AttendanceSummary | null>(null)
  const [attRows, setAttRows]       = useState<AttendanceRow[]>([])
  const [wellSummary, setWellSummary] = useState<WellnessSummary | null>(null)
  const [flagged, setFlagged]       = useState<WellnessFlaggedRow[]>([])
  const [trends, setTrends]         = useState<AdminTrends | null>(null)
  const [, setLoading]              = useState(true)
  const [downloading, setDownloading] = useState<'att' | 'well' | null>(null)
  const [activeReport, setActiveReport] = useState<'attendance' | 'wellness'>('attendance')

  useEffect(() => {
    Promise.all([
      adminApi.getAttendanceReport(),
      adminApi.getWellnessReport(),
      trendsApi.adminTrends().catch(() => null),
    ]).then(([att, well, tr]) => {
      setAttSummary(att.data.summary)
      setAttRows(att.data.data)
      setWellSummary(well.data.summary)
      setFlagged(well.data.recent_flagged)
      if (tr) setTrends(tr.data)
    }).finally(() => setLoading(false))
  }, [])

  async function downloadAttCsv() {
    setDownloading('att')
    try { const r = await adminApi.downloadAttendanceCsv(); triggerCsvDownload(r.data as Blob, 'attendance_report.csv') }
    finally { setDownloading(null) }
  }
  async function downloadWellCsv() {
    setDownloading('well')
    try { const r = await adminApi.downloadWellnessCsv(); triggerCsvDownload(r.data as Blob, 'wellness_report.csv') }
    finally { setDownloading(null) }
  }

  return (
    <div className="sp-page">
      <p className="text-base text-[var(--sp-text-muted)] leading-relaxed">Attendance and wellness analytics</p>

      <WidgetGrid widgets={{
        'kpis': (
      <div className="grid grid-cols-2 lg:grid-cols-4 sp-grid">
        <Kpi label="Students"       value={attSummary?.total_students ?? 0} tone="primary" />
        <Kpi label="Avg Attendance" value={attSummary?.avg_attendance  ?? 0} suffix="%" tone="success" />
        <Kpi label="Total Absences" value={attSummary?.total_absences  ?? 0} tone="danger" />
        <Kpi label="Wellness Logs"  value={wellSummary?.total_logs     ?? 0} tone="neutral" />
      </div>
        ),
        'attendance-trend': (span: number) => (
        <Card title="Attendance Trend" icon={TrendingUp}>
          {!trends?.attendance_trend?.length ? (
            <div className="flex items-center justify-center text-sm text-[var(--sp-text-muted)]" style={{ height: chartHeight(span) }}>No trend data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight(span)}>
              <AreaChart data={trends.attendance_trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--sp-primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--sp-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week_label" {...AXIS_PROPS} />
                <YAxis domain={[0, 100]} {...AXIS_PROPS} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [`${Number(v)}%`, 'Attendance Rate']}
                />
                <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="avg_rate" stroke="var(--sp-primary)" strokeWidth={3} {...LINE_CAPS} fill="url(#attGrad)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
        ),
        'wellness-donut': (
        <Card title="Wellness Distribution" icon={HeartPulse}>
          {!wellSummary ? <SkeletonCard rows={2} /> : (
            <div className="relative flex items-center justify-center h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: 'Normal',     value: wellSummary.normal,     fill: '#10b981' },
                    { name: 'Struggling', value: wellSummary.struggling, fill: '#f59e0b' },
                    { name: 'Critical',   value: wellSummary.critical,   fill: '#ef4444' },
                  ].filter(d => d.value > 0)} innerRadius={52} outerRadius={76} dataKey="value" paddingAngle={4} cornerRadius={99}>
                    {[...Array(3)].map((_, i) => <Cell key={i} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold tracking-tight text-[var(--sp-text)]">{wellSummary.total_logs}</span>
                <span className="text-xs text-[var(--sp-text-muted)]">logs</span>
              </div>
            </div>
          )}
        </Card>
        ),
        'program-breakdown': (span: number) => (
        <Card title="Per-Program Rates" icon={Users}>
          {!trends?.program_breakdown?.length ? (
            <div className="flex items-center justify-center text-sm text-[var(--sp-text-muted)]" style={{ height: chartHeight(span) }}>No program data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight(span)}>
              <BarChart layout="vertical" data={trends.program_breakdown} margin={{ top: 0, right: 44, bottom: 0, left: 0 }}>
                <XAxis type="number" domain={[0, 100]} {...AXIS_PROPS} />
                <YAxis type="category" dataKey="program" {...AXIS_PROPS} width={54} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v)}%`, 'Avg Rate']} />
                <Bar dataKey="avg_rate" radius={[10, 10, 10, 10]} barSize={18}>
                  {trends.program_breakdown.map((p, i) => (
                    <Cell key={i} fill={p.avg_rate >= 80 ? '#10b981' : p.avg_rate >= 60 ? '#f59e0b' : '#ef4444'} />
                  ))}
                  <LabelList dataKey="avg_rate" position="right" formatter={(v) => `${Number(v)}%`}
                    style={{ fontSize: 11, fill: 'var(--sp-text)', fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        ),
        'reports': (
        <Card padding="none">
          <div className="flex items-center justify-between px-7 pt-6 pb-4">
            <div className="flex gap-1.5">
              {(['attendance', 'wellness'] as const).map(t => (
                <button key={t} onClick={() => setActiveReport(t)}
                  className={`sp-squircle-sm px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                    activeReport === t ? 'bg-[var(--sp-primary)] text-[var(--sp-on-primary)]' : 'bg-[var(--sp-subtle)] text-[var(--sp-text-muted)] hover:text-[var(--sp-text)]'
                  }`}>{t} Report</button>
              ))}
            </div>
            <Button
              variant="secondary" size="sm"
              onClick={activeReport === 'attendance' ? downloadAttCsv : downloadWellCsv}
              disabled={!!downloading}
            >
              {downloading ? '⏳' : '⬇️'} Export CSV
            </Button>
          </div>
          <div className="px-7 pb-7">
            {activeReport === 'attendance' && (
              <Table headers={['Student', 'Present', 'Late', 'Absent', 'Excused', 'Rate']} empty={attRows.length === 0} emptyMessage="No records yet.">
                {attRows.map(r => (
                  <tr key={r.student_id} className="hover:bg-[var(--sp-hover-bg)]">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-[var(--sp-text)]">{r.student_name}</p>
                      <p className="text-xs text-[var(--sp-text-muted)]">{r.student_id}</p>
                    </td>
                    <td className="px-4 py-2.5 text-emerald-600 font-semibold">{r.present}</td>
                    <td className="px-4 py-2.5 text-amber-600 font-semibold">{r.late}</td>
                    <td className="px-4 py-2.5 text-red-600 font-semibold">{r.absent}</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.excused}</td>
                    <td className="px-4 py-2.5"><Badge variant={rateVariant(r.rate)}>{r.rate}%</Badge></td>
                  </tr>
                ))}
              </Table>
            )}
            {activeReport === 'wellness' && (
              <Table headers={['Student', 'Mood', 'Risk Level', 'Logged At']} empty={flagged.length === 0} emptyMessage="No flagged logs yet.">
                {flagged.map(r => (
                  <tr key={r.id} className="hover:bg-[var(--sp-hover-bg)]">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-[var(--sp-text)]">{r.student_name}</p>
                      <p className="text-xs text-[var(--sp-text-muted)]">{r.student_id}</p>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-[var(--sp-text)]">{r.mood}</td>
                    <td className="px-4 py-2.5"><Badge variant={riskVariant(r.risk_level)}>{r.risk_level}</Badge></td>
                    <td className="px-4 py-2.5 text-[var(--sp-text-muted)] text-xs">
                      {new Date(r.logged_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </Card>
        ),
      }} />
    </div>
  )
}
