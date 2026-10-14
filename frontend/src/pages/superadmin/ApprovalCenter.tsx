import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { adminApi } from '@/api/admin'
import type { ApprovalItem } from '@/api/admin'
import { ROLE_LABEL } from '@/lib/roles'
import type { User } from '@/api/auth'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  Pending: 'warning', Approved: 'success', Rejected: 'danger',
}

function ReviewModal({ item, onClose, onReviewed }: {
  item: ApprovalItem
  onClose: () => void
  onReviewed: (updated: ApprovalItem) => void
}) {
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState<'Approved' | 'Rejected' | null>(null)
  const [error, setError] = useState('')

  async function handleReview(status: 'Approved' | 'Rejected') {
    setSubmitting(status); setError('')
    try {
      const r = await adminApi.reviewApproval(item.id, { status, remarks: remarks.trim() || undefined })
      onReviewed(r.data.approval)
      onClose()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed.')
      setSubmitting(null)
    }
  }

  return (
    <Modal
      title="Review Request"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={() => handleReview('Rejected')} disabled={!!submitting}>
          {submitting === 'Rejected' ? 'Rejecting…' : 'Reject'}
        </Button>
        <Button onClick={() => handleReview('Approved')} disabled={!!submitting} className="!bg-emerald-600 hover:!bg-emerald-700">
          {submitting === 'Approved' ? 'Approving…' : 'Approve'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <div className="sp-squircle-lg bg-[var(--sp-subtle)] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sp-text-muted)]">Type</span>
            <span className="text-sm font-medium text-[var(--sp-text)]">{item.type}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sp-text-muted)]">Submitted by</span>
            <span className="text-sm text-[var(--sp-text)]">
              {item.submitter_name} · {ROLE_LABEL[item.submitter_role as User['role']] ?? item.submitter_role}
            </span>
          </div>
          {item.payload && Object.keys(item.payload).length > 0 && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sp-text-muted)]">Payload</span>
              <pre className="mt-1 text-xs text-[var(--sp-text)] bg-[var(--sp-subtle)] sp-squircle-sm p-3 overflow-x-auto">
                {JSON.stringify(item.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--sp-text-muted)] mb-1">Remarks <span className="opacity-60">(optional)</span></label>
          <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="Add a note for the requester…"
            className="input-field resize-none" />
        </div>

        {error && <p className="sp-squircle-sm bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}

export default function ApprovalCenter() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [reviewing, setReviewing] = useState<ApprovalItem | null>(null)
  const [loadError, setLoadError] = useState('')

  const load = useCallback((p: number) => {
    setLoading(true)
    setLoadError('')
    adminApi.getApprovals({ status: statusFilter || undefined, page: p })
      .then(r => { setItems(r.data.data); setLastPage(r.data.last_page); setTotal(r.data.total) })
      // Without this the request could fail outright and the page would still
      // render "✅ No approval requests found" — a broken fetch looked
      // identical to an empty queue, which is how a 404 here went unnoticed.
      .catch((e: unknown) => {
        const err = e as { response?: { status?: number; data?: { message?: string } } }
        setItems([]); setTotal(0); setLastPage(1)
        setLoadError(err.response?.data?.message ?? `Couldn't load approvals (HTTP ${err.response?.status ?? '?'}).`)
      })
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { setPage(1) }, [statusFilter])
  useEffect(() => { load(page) }, [page, load])

  function handleReviewed(updated: ApprovalItem) {
    setItems(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  const pendingCount = items.filter(i => i.status === 'Pending').length

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--sp-text-muted)]">{total} requests · {pendingCount} pending</p>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Statuses</option>
          {['Pending','Approved','Rejected'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 sp-squircle-lg bg-[var(--sp-border)] animate-pulse" />)}</div>
      ) : loadError ? (
        <div className="sp-squircle-xl bg-[var(--sp-subtle)] py-16 text-center">
          <AlertTriangle size={28} className="mx-auto mb-3 text-red-500" />
          <p className="text-sm font-semibold text-[var(--sp-text)]">{loadError}</p>
          <button
            onClick={() => load(page)}
            className="mt-4 sp-squircle-sm bg-[var(--sp-primary)] text-[var(--sp-on-primary)] px-4 py-2 text-xs font-semibold"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="sp-squircle-xl border border-dashed border-[var(--sp-border)] py-16 text-center">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-[var(--sp-text-muted)] text-sm">No approval requests found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(a => (
            <div key={a.id} className="sp-squircle-lg bg-[var(--sp-surface)] px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--sp-primary)] text-[var(--sp-on-primary)] flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {a.submitter_name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--sp-text)]">{a.type}</span>
                    <Badge variant={STATUS_VARIANT[a.status]}>{a.status}</Badge>
                  </div>
                  <p className="text-xs text-[var(--sp-text-muted)]">
                    {a.submitter_name} · {ROLE_LABEL[a.submitter_role as User['role']] ?? a.submitter_role}
                    {' · '}{new Date(a.submitted_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </p>
                  {a.remarks && <p className="text-xs text-[var(--sp-text-muted)] mt-0.5 italic">"{a.remarks}"</p>}
                </div>
              </div>
              {a.status === 'Pending' && (
                <Button onClick={() => setReviewing(a)} size="sm">Review</Button>
              )}
            </div>
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3.5 py-2 sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] text-sm disabled:opacity-40 transition-colors">← Prev</button>
          <span className="text-sm text-[var(--sp-text-muted)]">{page} / {lastPage}</span>
          <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
            className="px-3.5 py-2 sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] text-sm disabled:opacity-40 transition-colors">Next →</button>
        </div>
      )}

      {reviewing && <ReviewModal item={reviewing} onClose={() => setReviewing(null)} onReviewed={handleReviewed} />}
    </div>
  )
}
