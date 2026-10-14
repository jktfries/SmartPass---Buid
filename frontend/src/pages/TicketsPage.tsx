import { useCallback, useEffect, useState } from 'react'
import { ticketsApi } from '@/api/tickets'
import type { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from '@/api/tickets'
import { useAuth } from '@/context/AuthContext'
import { ROLE_LABEL } from '@/lib/roles'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import BadgeComponent from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'
import { Plus, ChevronRight, RefreshCw, Filter } from 'lucide-react'
import clsx from 'clsx'

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  account:    'Account / Access',
  attendance: 'Attendance',
  technical:  'Technical Issue',
  wellness:   'Wellness / Counseling',
  other:      'Other',
}

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
}
const PRIORITY_VARIANT: Record<TicketPriority, BadgeVariant> = {
  low: 'neutral', medium: 'warning', high: 'warning', urgent: 'danger',
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
}
const STATUS_VARIANT: Record<TicketStatus, BadgeVariant> = {
  open: 'info', in_progress: 'primary', resolved: 'success', closed: 'neutral',
}

const ADMIN_ROLES = ['system_admin', 'super_admin', 'admin_exec']

function PriorityBadge({ p }: { p: TicketPriority }) { return <BadgeComponent variant={PRIORITY_VARIANT[p]}>{PRIORITY_LABEL[p]}</BadgeComponent> }
function StatusBadge({ s }: { s: TicketStatus }) { return <BadgeComponent variant={STATUS_VARIANT[s]}>{STATUS_LABEL[s]}</BadgeComponent> }

// ─── New Ticket Form ──────────────────────────────────────────────────────────

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: SupportTicket) => void }) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('account')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!subject.trim() || !description.trim()) return
    setSubmitting(true); setError('')
    try {
      const r = await ticketsApi.create({ subject: subject.trim(), description: description.trim(), category, priority })
      onCreated(r.data)
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to submit ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Submit Support Ticket"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!subject.trim() || !description.trim() || submitting}>
          {submitting ? 'Submitting…' : 'Submit Ticket'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        {error && <p className="sp-squircle-sm bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div>
          <label className="block text-xs font-medium text-[var(--sp-text-muted)] mb-1">Subject *</label>
          <input
            value={subject} onChange={e => setSubject(e.target.value)} required maxLength={255}
            placeholder="Brief summary of your issue"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--sp-text-muted)] mb-1">Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value as TicketCategory)} className="input-field">
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--sp-text-muted)] mb-1">Priority *</label>
            <select value={priority} onChange={e => setPriority(e.target.value as TicketPriority)} className="input-field">
              {Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--sp-text-muted)] mb-1">Description *</label>
          <textarea
            value={description} onChange={e => setDescription(e.target.value)} required maxLength={5000} rows={5}
            placeholder="Describe your issue in detail — include any error messages, what you were trying to do, and steps to reproduce if applicable."
            className="input-field resize-none"
          />
          <p className="text-xs text-[var(--sp-text-muted)] text-right mt-0.5">{description.length}/5000</p>
        </div>
      </div>
    </Modal>
  )
}

// ─── Ticket Detail Modal ──────────────────────────────────────────────────────

function TicketDetailModal({ ticket, isAdmin, onClose, onUpdated }: {
  ticket: SupportTicket; isAdmin: boolean
  onClose: () => void; onUpdated: (t: SupportTicket) => void
}) {
  const [status, setStatus]   = useState<TicketStatus>(ticket.status)
  const [notes, setNotes]     = useState(ticket.resolution_notes ?? '')
  const [saving, setSaving]   = useState(false)

  async function handleSave() {
    if (!isAdmin) return
    setSaving(true)
    try {
      const r = await ticketsApi.update(ticket.id, {
        status,
        resolution_notes: notes.trim() || undefined,
      })
      onUpdated(r.data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={ticket.subject}
      onClose={onClose}
      size="lg"
      footer={isAdmin ? <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
      </> : undefined}
    >
      <div className="space-y-5">
        <p className="text-xs font-bold text-[var(--sp-primary)] -mt-2">{ticket.ticket_number}</p>

        {/* Meta */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge s={ticket.status} />
          <PriorityBadge p={ticket.priority} />
          <BadgeComponent>{CATEGORY_LABELS[ticket.category]}</BadgeComponent>
        </div>

        {ticket.submitter && (
          <p className="text-xs text-[var(--sp-text-muted)]">
            Submitted by <strong className="text-[var(--sp-text)]">{ticket.submitter.name}</strong>
            {' '}({ROLE_LABEL[ticket.submitter.role as keyof typeof ROLE_LABEL] ?? ticket.submitter.role})
            {' · '}{new Date(ticket.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
          </p>
        )}

        {/* Description */}
        <div>
          <p className="text-xs font-semibold text-[var(--sp-text-muted)] uppercase tracking-wider mb-1.5">Description</p>
          <p className="text-sm text-[var(--sp-text)] whitespace-pre-wrap leading-relaxed bg-[var(--sp-subtle)] sp-squircle-lg p-4 border border-[var(--sp-border)]">
            {ticket.description}
          </p>
        </div>

        {/* Resolution notes (read-only for users) */}
        {!isAdmin && ticket.resolution_notes && (
          <div>
            <p className="text-xs font-semibold text-[var(--sp-text-muted)] uppercase tracking-wider mb-1.5">Admin Response</p>
            <p className="text-sm text-[var(--sp-text)] whitespace-pre-wrap leading-relaxed bg-emerald-50 dark:bg-emerald-900/20 sp-squircle-lg p-4 border border-emerald-200 dark:border-emerald-800">
              {ticket.resolution_notes}
            </p>
          </div>
        )}

        {/* Admin controls */}
        {isAdmin && (
          <div className="space-y-3 pt-1">
            <div className="h-px bg-[var(--sp-border)]" />
            <p className="text-xs font-bold text-[var(--sp-text-muted)] uppercase tracking-wider">Admin Actions</p>

            <div>
              <label className="block text-xs font-medium text-[var(--sp-text-muted)] mb-1">Update Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TicketStatus)} className="input-field">
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--sp-text-muted)] mb-1">Resolution Notes / Response</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)} rows={4} maxLength={5000}
                placeholder="Explain what was done or provide guidance to the user…"
                className="input-field resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const { user } = useAuth()
  const isAdmin  = ADMIN_ROLES.includes(user?.role ?? '')

  const [tickets, setTickets]   = useState<SupportTicket[]>([])
  const [total, setTotal]       = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)
  const [selected, setSelected] = useState<SupportTicket | null>(null)

  // Admin filters
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [search, setSearch]                 = useState('')
  const [showFilters, setShowFilters]       = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params: Record<string, string | number> = { page }
    if (filterStatus)   params.status   = filterStatus
    if (filterCategory) params.category = filterCategory
    if (filterPriority) params.priority = filterPriority
    if (search)         params.search   = search
    ticketsApi.list(params)
      .then(r => { setTickets(r.data.data); setTotal(r.data.total); setLastPage(r.data.last_page) })
      .finally(() => setLoading(false))
  }, [page, filterStatus, filterCategory, filterPriority, search])

  useEffect(() => { load() }, [load])

  function handleCreated(t: SupportTicket) {
    setTickets(prev => [t, ...prev])
    setTotal(n => n + 1)
  }

  function handleUpdated(t: SupportTicket) {
    setTickets(prev => prev.map(x => x.id === t.id ? t : x))
    setSelected(t)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--sp-text-muted)]">
          {isAdmin
            ? 'Manage and respond to user-submitted support requests.'
            : 'Submit requests for account changes, technical issues, or portal help.'}
        </p>
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={() => setShowFilters(f => !f)}
              className={clsx('flex items-center gap-2 sp-squircle-sm border px-3 py-2 text-sm font-medium transition-colors',
                showFilters ? 'border-[var(--sp-primary)] bg-[var(--sp-primary-soft-bg)] text-[var(--sp-primary-soft-text)]' : 'border-[var(--sp-border)] text-[var(--sp-text-muted)] hover:text-[var(--sp-text)] hover:bg-[var(--sp-hover-bg)]')}>
              <Filter size={14} /> Filters
            </button>
          )}
          <button onClick={load} className="flex items-center gap-2 sp-squircle-sm border border-[var(--sp-border)] px-3 py-2 text-sm text-[var(--sp-text-muted)] hover:text-[var(--sp-text)] hover:bg-[var(--sp-hover-bg)] transition-colors">
            <RefreshCw size={14} />
          </button>
          {!isAdmin && (
            <Button onClick={() => setShowNew(true)}>
              <Plus size={14} /> New Ticket
            </Button>
          )}
        </div>
      </div>

      {/* Admin filters panel */}
      {isAdmin && showFilters && (
        <div className="sp-squircle-lg bg-[var(--sp-surface)] p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--sp-text-muted)] mb-1">Status</label>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} className="input-field">
              <option value="">All</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--sp-text-muted)] mb-1">Category</label>
            <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1) }} className="input-field">
              <option value="">All</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--sp-text-muted)] mb-1">Priority</label>
            <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1) }} className="input-field">
              <option value="">All</option>
              {Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--sp-text-muted)] mb-1">Search</label>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Ticket #, subject, user…" className="input-field" />
          </div>
        </div>
      )}

      {/* Stats bar for admin */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          {[
            { s: '',            label: `All (${total})` },
            { s: 'open',        label: `Open` },
            { s: 'in_progress', label: `In Progress` },
            { s: 'resolved',    label: `Resolved` },
            { s: 'closed',      label: `Closed` },
          ].map(item => (
            <button key={item.s}
              onClick={() => { setFilterStatus(item.s); setPage(1) }}
              className={clsx('rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                filterStatus === item.s
                  ? 'bg-[var(--sp-primary)] text-[var(--sp-on-primary)]'
                  : 'bg-[var(--sp-surface)] border border-[var(--sp-border)] text-[var(--sp-text-muted)] hover:text-[var(--sp-text)]')}>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Ticket list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 sp-squircle-lg bg-[var(--sp-border)] animate-pulse" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="sp-squircle-xl border border-dashed border-[var(--sp-border)] py-16 text-center">
          <p className="text-3xl mb-2">🎫</p>
          <p className="text-[var(--sp-text-muted)] text-sm font-medium">No tickets found</p>
          {!isAdmin && <p className="text-[var(--sp-text-muted)] text-xs mt-1">Need help? Submit a support ticket above.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <button key={t.id} onClick={() => setSelected(t)}
              className="w-full text-left sp-squircle-lg bg-[var(--sp-surface)] hover:bg-[var(--sp-hover-bg)] px-4 py-3.5 flex items-center gap-4 transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[11px] font-bold text-[var(--sp-primary)]">{t.ticket_number}</span>
                  <StatusBadge s={t.status} />
                  <PriorityBadge p={t.priority} />
                </div>
                <p className="text-sm font-semibold text-[var(--sp-text)] truncate">{t.subject}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[var(--sp-text-muted)]">{CATEGORY_LABELS[t.category]}</span>
                  {isAdmin && t.submitter && (
                    <>
                      <span className="text-[var(--sp-border)]">·</span>
                      <span className="text-xs text-[var(--sp-text-muted)]">{t.submitter.name}</span>
                    </>
                  )}
                  <span className="text-[var(--sp-border)]">·</span>
                  <span className="text-xs text-[var(--sp-text-muted)]">
                    {new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-[var(--sp-text-muted)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3.5 py-2 sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] text-sm disabled:opacity-40 transition-colors">← Prev</button>
          <span className="text-sm text-[var(--sp-text-muted)]">{page} / {lastPage}</span>
          <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
            className="px-3.5 py-2 sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] text-sm disabled:opacity-40 transition-colors">Next →</button>
        </div>
      )}

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}

      {selected && (
        <TicketDetailModal
          ticket={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
