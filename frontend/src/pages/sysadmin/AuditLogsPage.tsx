import { useCallback, useEffect, useState } from 'react'
import { adminApi, triggerCsvDownload } from '@/api/admin'
import type { AuditLogItem } from '@/api/admin'
import { Download, Search, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'

const SEV_VARIANT: Record<string, BadgeVariant> = {
  info: 'info', warning: 'warning', critical: 'danger',
}
const SEV_DOT: Record<string, string> = {
  info:    'bg-sky-500',
  warning: 'bg-amber-500',
  critical:'bg-red-500',
}

const CATEGORIES = ['auth', 'attendance', 'wellness', 'user_management', 'system', 'data']
const SEVERITIES = ['info', 'warning', 'critical']

export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const load = useCallback((p: number) => {
    setLoading(true)
    adminApi.getAuditLogs({ category: category || undefined, severity: severity || undefined, from: from || undefined, to: to || undefined, search: search || undefined, page: p })
      .then(r => { setRows(r.data.data); setLastPage(r.data.last_page); setTotal(r.data.total) })
      .finally(() => setLoading(false))
  }, [category, severity, from, to, search])

  useEffect(() => { setPage(1) }, [category, severity, from, to, search])
  useEffect(() => { load(page) }, [page, load])

  async function handleDownload() {
    setDownloading(true)
    try {
      const r = await adminApi.downloadAuditCsv({ category: category || undefined, severity: severity || undefined, from: from || undefined, to: to || undefined })
      triggerCsvDownload(r.data as Blob, 'audit_logs.csv')
    } finally { setDownloading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--sp-text-muted)]">{total.toLocaleString()} total entries</p>
        <Button onClick={handleDownload} disabled={downloading} variant="secondary" size="sm">
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={category} onChange={e => setCategory(e.target.value)} className="input-field w-auto">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={severity} onChange={e => setSeverity(e.target.value)} className="input-field w-auto">
          <option value="">All Severities</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field w-auto" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field w-auto" />
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput) }} className="flex gap-1">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Search actions…"
            className="input-field w-44" />
          <Button type="submit" variant="secondary" size="sm">
            <Search size={14} />
          </Button>
        </form>
        {(category || severity || from || to || search) && (
          <Button onClick={() => { setCategory(''); setSeverity(''); setFrom(''); setTo(''); setSearch(''); setSearchInput('') }}
            variant="secondary" size="sm" className="!text-red-500 !border-red-200 hover:!bg-red-50">
            <X size={14} /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="sp-squircle-xl bg-[var(--sp-surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-[var(--sp-border)] bg-[var(--sp-subtle)]">
                {['Sev', 'Actor', 'Category', 'Action', 'Detail', 'IP', 'Time'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--sp-text-muted)] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sp-border)]">
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 sp-squircle-sm bg-[var(--sp-border)] animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--sp-text-muted)]">No audit logs found.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="hover:bg-[var(--sp-hover-bg)]">
                  <td className="px-4 py-2.5">
                    <div className={`w-2 h-2 rounded-full ${SEV_DOT[r.severity] ?? 'bg-slate-400'}`} title={r.severity} />
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-[var(--sp-text)] text-xs">{r.actor_name}</p>
                    {r.actor_role && <p className="text-[10px] text-[var(--sp-text-muted)] capitalize">{r.actor_role.replace('_',' ')}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={SEV_VARIANT[r.severity]}>{r.category.replace('_',' ')}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--sp-text)] text-xs font-medium max-w-[200px] truncate">{r.action}</td>
                  <td className="px-4 py-2.5 text-[var(--sp-text-muted)] text-xs max-w-[220px] truncate">{r.detail ?? '—'}</td>
                  <td className="px-4 py-2.5 text-[var(--sp-text-muted)] text-xs font-mono">{r.ip_address ?? '—'}</td>
                  <td className="px-4 py-2.5 text-[var(--sp-text-muted)] text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3.5 py-2 sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] text-sm disabled:opacity-40 transition-colors">← Prev</button>
          <span className="text-sm text-[var(--sp-text-muted)]">{page} / {lastPage}</span>
          <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
            className="px-3.5 py-2 sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] text-sm disabled:opacity-40 transition-colors">Next →</button>
        </div>
      )}
    </div>
  )
}
