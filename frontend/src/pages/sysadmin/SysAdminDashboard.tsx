import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ticketsApi } from '@/api/tickets'
import type { AdminStats, SupportTicket } from '@/api/tickets'
import {
  BarChart, Bar, Cell, LabelList, PieChart, Pie,
  XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import {
  Ticket, ShieldCheck, AlertTriangle,
  Settings, BookOpen, UserCog, FileText, ChevronRight,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Kpi from '@/components/ui/Kpi'
import WidgetGrid from '@/components/dashboard/WidgetGrid'
import { chartHeight, TOOLTIP_STYLE, BAR_RADIUS } from '@/lib/chartTheme'
import Badge from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'
import AddMenu from '@/components/sysadmin/AddMenu'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: 'info', in_progress: 'primary', resolved: 'success', closed: 'neutral',
}
const PRIORITY_CLS: Record<string, string> = {
  low:    'text-slate-500',
  medium: 'text-amber-600',
  high:   'text-orange-600',
  urgent: 'text-red-600 font-bold',
}
// Teal-to-neutral ramp: keeps the charts monochromatic per the teal-and-neutrals rule.
const TEAL_RAMP = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#94a3b8']

const SEVERITY_CLS: Record<string, string> = {
  info:     'text-sky-600',
  warning:  'text-amber-600',
  critical: 'text-red-600',
}

function QuickLink({ icon: Icon, label, to }: {
  icon: React.ElementType; label: string; to: string
}) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(to)}
      className="flex flex-col items-center gap-2.5 sp-squircle-lg bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] p-5 text-center transition-colors group">
      <div className="w-12 h-12 sp-squircle-md bg-[var(--sp-surface)] flex items-center justify-center group-hover:scale-105 transition-transform">
        <Icon size={20} className="text-[var(--sp-primary)]" />
      </div>
      <span className="text-xs font-semibold text-[var(--sp-text-muted)] group-hover:text-[var(--sp-text)] transition-colors">{label}</span>
    </button>
  )
}

export default function SysAdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats]     = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ticketsApi.adminStats()
      .then(r => setStats(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="sp-page">
        <div className="h-8 w-48 sp-squircle-sm bg-[var(--sp-subtle)] animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 sp-grid">
          {[1,2,3,4].map(i => <div key={i} className="h-28 sp-squircle-xl bg-[var(--sp-subtle)] animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const openTickets = stats.tickets.open + stats.tickets.in_progress

  return (
    <div className="sp-page">
      {/* Maintenance banner */}
      {stats.system.maintenance_mode && (
        <div className="flex items-center gap-2.5 sp-squircle-md bg-amber-50 dark:bg-amber-900/20 px-4 py-3 w-fit">
          <AlertTriangle size={16} className="text-amber-600" />
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Maintenance Mode Active</span>
        </div>
      )}

      <WidgetGrid widgets={{
        'kpis': (
      <div className="grid grid-cols-2 lg:grid-cols-4 sp-grid">
        <Kpi label="Total Users" value={stats.users.total} tone="primary"
          sub={`${stats.users.student} students · ${stats.users.professor} professors`} />
        <Kpi label="Open Tickets" value={openTickets} tone={openTickets > 0 ? 'warning' : 'success'}
          sub={openTickets > 0 ? `${stats.tickets.open} open · ${stats.tickets.in_progress} in progress` : 'All clear'} />
        <Kpi label="Pending Approvals" value={stats.approvals.pending} tone={stats.approvals.pending > 0 ? 'danger' : 'neutral'}
          sub={stats.approvals.pending > 0 ? 'Awaiting review' : 'None pending'} />
        <Kpi label="Staff" value={stats.users.professor + stats.users.guidance_counselor + stats.users.admin_exec} tone="neutral"
          sub={`${stats.users.guidance_counselor} counselors · ${stats.users.admin_exec} admins`} />
      </div>
        ),
        'user-breakdown': (span: number) => (
      <Card title="User Breakdown">
        <div className="flex sp-grid items-center">
          {/* Vertical bar chart */}
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={chartHeight(span)}>
              <BarChart
                layout="vertical"
                data={[
                  { label: 'Students',     count: stats.users.student },
                  { label: 'Professors',   count: stats.users.professor },
                  { label: 'Counselors',   count: stats.users.guidance_counselor },
                  { label: 'Admin/Exec',   count: stats.users.admin_exec },
                  { label: 'Sys Admin',    count: stats.users.system_admin + stats.users.super_admin },
                ]}
                margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" hide />
                <Bar dataKey="count" radius={BAR_RADIUS} barSize={18}>
                  {TEAL_RAMP.map((fill, i) => <Cell key={i} fill={fill} />)}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 12, fill: 'var(--sp-text)', fontWeight: 700 }} />
                  <LabelList dataKey="label" position="insideLeft" style={{ fontSize: 11, fill: '#fff', fontWeight: 600 }} />
                </Bar>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Donut */}
          <div className="w-36 h-36 flex-shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Students',   value: stats.users.student },
                    { name: 'Professors', value: stats.users.professor },
                    { name: 'Counselors', value: stats.users.guidance_counselor },
                    { name: 'Admins',     value: stats.users.admin_exec + stats.users.system_admin + stats.users.super_admin },
                  ].filter(d => d.value > 0)}
                  innerRadius={42}
                  outerRadius={62}
                  dataKey="value"
                  paddingAngle={4}
                  cornerRadius={99}
                >
                  {TEAL_RAMP.slice(0, 4).map((fill, i) => <Cell key={i} fill={fill} />)}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold tracking-tight text-[var(--sp-text)]">{stats.users.total}</span>
              <span className="text-xs text-[var(--sp-text-muted)]">total</span>
            </div>
          </div>
        </div>
      </Card>
        ),
        'open-tickets': (
        <Card title="Open Tickets" icon={Ticket} actions={
          <button onClick={() => navigate('/tickets')}
            className="text-xs text-[var(--sp-primary)] hover:opacity-80 font-semibold flex items-center gap-1">
            View all <ChevronRight size={12} />
          </button>
        }>
          {stats.recent_tickets.length === 0 ? (
            <p className="text-sm text-[var(--sp-text-muted)] text-center py-6">No open tickets 🎉</p>
          ) : (
            <div className="space-y-2.5">
              {stats.recent_tickets.map((t: SupportTicket) => (
                <button key={t.id} onClick={() => navigate('/tickets')}
                  className="w-full text-left flex items-center gap-3 sp-squircle-md bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] px-4 py-3 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-bold text-[var(--sp-primary)]">{t.ticket_number}</span>
                      <span className={`text-[11px] font-semibold ${PRIORITY_CLS[t.priority]}`}>
                        {t.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[var(--sp-text)] truncate">{t.subject}</p>
                    <p className="text-xs text-[var(--sp-text-muted)]">{t.submitter?.name ?? '—'}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[t.status]}>{t.status.replace('_', ' ')}</Badge>
                </button>
              ))}
            </div>
          )}
        </Card>
        ),
        'recent-activity': (
        <Card title="Recent Activity" icon={FileText} actions={
          <button onClick={() => navigate('/sysadmin/audit-logs')}
            className="text-xs text-[var(--sp-primary)] hover:opacity-80 font-semibold flex items-center gap-1">
            Full log <ChevronRight size={12} />
          </button>
        }>
          {stats.recent_audit.length === 0 ? (
            <p className="text-sm text-[var(--sp-text-muted)] text-center py-6">No recent activity</p>
          ) : (
            <div className="space-y-2.5">
              {stats.recent_audit.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3 sp-squircle-md bg-[var(--sp-subtle)]">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${(SEVERITY_CLS[entry.severity] ?? 'text-slate-400').replace('text-', 'bg-')}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--sp-text)] truncate">{entry.action}</p>
                    <p className="text-xs text-[var(--sp-text-muted)]">
                      {entry.actor_name ?? 'System'} · {entry.category}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${SEVERITY_CLS[entry.severity]}`}>
                    {entry.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        ),
        'quick-access': (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-[var(--sp-text)]">Quick Access</h3>
          <AddMenu />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          <QuickLink icon={UserCog}    label="Accounts"      to="/sysadmin/accounts" />
          <QuickLink icon={BookOpen}   label="Academic"      to="/sysadmin/academic" />
          <QuickLink icon={Ticket}     label="Support Queue" to="/tickets" />
          <QuickLink icon={ShieldCheck}label="Approvals"     to="/sysadmin/approvals" />
          <QuickLink icon={FileText}   label="Audit Logs"    to="/sysadmin/audit-logs" />
          <QuickLink icon={Settings}   label="Settings"      to="/sysadmin/settings" />
        </div>
      </div>
        ),
      }} />
    </div>
  )
}
