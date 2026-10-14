import { useEffect, useState } from 'react'
import { wellnessApi } from '@/api/wellness'
import type { WellnessLogItem } from '@/api/wellness'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import { RISK_VARIANT, MOOD_EMOJI, fmtDate } from './counselorShared'

function ReviewModal({ log, onClose, onSaved }: { log: WellnessLogItem; onClose: () => void; onSaved: () => void }) {
  const [notes, setNotes] = useState(log.counselor_notes ?? '')
  const [riskLevel, setRiskLevel] = useState(log.risk_level)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await wellnessApi.reviewLog(log.id, { counselor_notes: notes || undefined, risk_level: riskLevel })
    setSaving(false); onSaved()
  }

  return (
    <Modal
      title="Review Wellness Log"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Review'}</Button>
      </>}
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--sp-text-muted)]">{log.student_name} · {fmtDate(log.logged_at)}</p>
        <div className="sp-squircle-sm bg-[var(--sp-subtle)] p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">{MOOD_EMOJI[log.mood]}</span>
            <span className="font-semibold capitalize text-[var(--sp-text)]">{log.mood}</span>
            <Badge variant={RISK_VARIANT[riskLevel]} className="ml-auto">{riskLevel}</Badge>
          </div>
          {(log.contributing_factors?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {log.contributing_factors!.map(f => <span key={f} className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-[var(--sp-text-muted)]">{f.replace(/_/g,' ')}</span>)}
            </div>
          )}
          {log.notes && <p className="text-[var(--sp-text)]">{log.notes}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--sp-text-muted)]">Override Risk Level</label>
          <select value={riskLevel} onChange={e => setRiskLevel(e.target.value as typeof riskLevel)} className="input-field">
            <option value="normal">Normal</option>
            <option value="struggling">Struggling</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--sp-text-muted)]">Counselor Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Your notes for this student…" className="input-field" />
        </div>
      </div>
    </Modal>
  )
}

export default function CounselorWellnessLogs() {
  const [logs, setLogs] = useState<WellnessLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRisk, setFilterRisk] = useState('')
  const [filterUnreviewed, setFilterUnreviewed] = useState(false)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [reviewing, setReviewing] = useState<WellnessLogItem | null>(null)

  const load = (p = 1) => {
    setLoading(true)
    wellnessApi.getCounselorLogs({ risk_level: filterRisk || undefined, unreviewed: filterUnreviewed || undefined, page: p })
      .then(r => { setLogs(r.data.data); setLastPage(r.data.last_page) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page, filterRisk, filterUnreviewed])

  return (
    <div className="space-y-6">
      <p className="text-base text-[var(--sp-text-muted)] leading-relaxed">
        Review and triage wellness check-ins from your assigned students
      </p>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterRisk} onChange={e => { setFilterRisk(e.target.value); setPage(1) }} className="input-field w-auto">
          <option value="">All risk levels</option>
          <option value="normal">Normal</option>
          <option value="struggling">Struggling</option>
          <option value="critical">Critical</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--sp-text)]">
          <input type="checkbox" checked={filterUnreviewed} onChange={e => { setFilterUnreviewed(e.target.checked); setPage(1) }} />
          Unreviewed only
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 sp-squircle-lg bg-[var(--sp-border)] animate-pulse" />)}</div>
      ) : (
        <Table headers={['Student','Date','Mood','Risk','Reviewed','Actions']} empty={logs.length === 0} emptyMessage="No logs found.">
          {logs.map(l => (
            <tr key={l.id} className="hover:bg-[var(--sp-subtle)]">
              <td className="px-4 py-3 font-medium text-[var(--sp-text)]">{l.student_name}</td>
              <td className="px-4 py-3 text-[var(--sp-text-muted)]">{fmtDate(l.logged_at)}</td>
              <td className="px-4 py-3"><span className="text-lg">{MOOD_EMOJI[l.mood]}</span> <span className="text-xs capitalize text-[var(--sp-text-muted)]">{l.mood}</span></td>
              <td className="px-4 py-3"><Badge variant={RISK_VARIANT[l.risk_level]}>{l.risk_level}</Badge></td>
              <td className="px-4 py-3 text-xs text-[var(--sp-text-muted)]">{l.reviewed_at ? fmtDate(l.reviewed_at) : <span className="text-amber-500">Pending</span>}</td>
              <td className="px-4 py-3"><button onClick={() => setReviewing(l)} className="text-xs text-[var(--sp-primary)] hover:underline">Review</button></td>
            </tr>
          ))}
        </Table>
      )}

      {lastPage > 1 && (
        <div className="flex gap-2 justify-center">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`sp-squircle-sm px-3 py-1.5 text-sm ${p === page ? 'bg-[var(--sp-primary)] text-[var(--sp-on-primary)]' : 'bg-[var(--sp-subtle)] text-[var(--sp-text-muted)]'}`}>{p}</button>
          ))}
        </div>
      )}

      {reviewing && (
        <ReviewModal
          log={reviewing}
          onClose={() => setReviewing(null)}
          onSaved={() => { setReviewing(null); load(page) }}
        />
      )}
    </div>
  )
}
