import { useEffect, useState } from 'react'
import { wellnessApi } from '@/api/wellness'
import type { WellnessLogItem } from '@/api/wellness'
import MultimodalWellnessCheck from '@/components/multimodal/MultimodalWellnessCheck'
import { Pencil, Trash2, Lock, Sparkles } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'

// ─── Constants ────────────────────────────────────────────────────────────────

const MOODS = [
  { value: 'great',   label: 'Great',   emoji: '😄', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'good',    label: 'Good',    emoji: '🙂', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  { value: 'okay',    label: 'Okay',    emoji: '😐', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'bad',     label: 'Bad',     emoji: '😕', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'terrible','label': 'Terrible','emoji': '😢', color: 'bg-red-100 text-red-700 border-red-300' },
] as const

const FACTORS = [
  { value: 'academics',       label: 'Academic Pressure' },
  { value: 'family_issues',   label: 'Family Issues' },
  { value: 'financial',       label: 'Financial Concerns' },
  { value: 'social',          label: 'Social / Peer Issues' },
  { value: 'bullying',        label: 'Bullying' },
  { value: 'mental_health',   label: 'Mental Health' },
  { value: 'depression',      label: 'Depression' },
  { value: 'anxiety',         label: 'Anxiety' },
  { value: 'sleep',           label: 'Sleep Problems' },
  { value: 'health',          label: 'Physical Health' },
  { value: 'relationships',   label: 'Relationships' },
  { value: 'self_harm',       label: 'Self-Harm Thoughts' },
  { value: 'suicidal_thoughts','label': 'Suicidal Thoughts' },
]

const RISK_VARIANT: Record<string, BadgeVariant> = {
  normal: 'success', struggling: 'warning', critical: 'danger',
}

const MOOD_VARIANT: Record<string, BadgeVariant> = {
  great: 'success', good: 'info', okay: 'neutral', bad: 'warning', terrible: 'danger',
}

// ─── Log Form ─────────────────────────────────────────────────────────────────

function LogForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [step, setStep] = useState<'mood' | 'factors' | 'notes'>('mood')
  const [mood, setMood] = useState('')
  const [factors, setFactors] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function toggleFactor(v: string) {
    setFactors(f => f.includes(v) ? f.filter(x => x !== v) : [...f, v])
  }

  async function handleSubmit() {
    if (!mood) return
    setSubmitting(true); setError('')
    try {
      await wellnessApi.submitLog({ mood, contributing_factors: factors.length ? factors : undefined, notes: notes.trim() || undefined })
      onSubmitted()
    } catch {
      setError('Could not save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="How are you feeling today?">
      <div className="space-y-6">
        {error && <p className="sp-squircle-sm bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {/* Step 1: Mood */}
        <div>
          <p className="mb-3 text-sm font-medium text-[var(--sp-text-muted)]">Step 1 of 3 — Select your mood</p>
          <div className="flex flex-wrap gap-3">
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => { setMood(m.value); setStep('factors') }}
                className={`flex items-center gap-2 sp-squircle-lg border-2 px-5 py-3 text-sm font-semibold transition-all
                  ${mood === m.value ? m.color + ' border-current shadow-sm scale-105' : 'border-[var(--sp-border)] text-[var(--sp-text-muted)] hover:border-slate-300'}`}
              >
                <span className="text-xl">{m.emoji}</span> {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Contributing factors */}
        {(step === 'factors' || step === 'notes') && (
          <div>
            <p className="mb-3 text-sm font-medium text-[var(--sp-text-muted)]">Step 2 of 3 — Any contributing factors? <span className="text-xs opacity-60">(optional)</span></p>
            <div className="flex flex-wrap gap-2">
              {FACTORS.map(f => (
                <button
                  key={f.value}
                  onClick={() => toggleFactor(f.value)}
                  className={`sp-squircle-sm border px-3 py-1.5 text-xs font-medium transition-colors
                    ${factors.includes(f.value) ? 'bg-[var(--sp-primary)] text-[var(--sp-on-primary)] border-[var(--sp-primary)]' : 'border-[var(--sp-border)] text-[var(--sp-text-muted)] hover:border-slate-300'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setStep('notes')} className="text-sm text-[var(--sp-primary)] hover:underline">
                {factors.length > 0 ? 'Continue →' : 'Skip →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Notes */}
        {step === 'notes' && (
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--sp-text-muted)]">Step 3 of 3 — Anything you'd like to share? <span className="text-xs opacity-60">(optional)</span></p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Share how you're feeling in your own words…"
              rows={3}
              className="input-field"
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setStep('factors')}>Back</Button>
              <Button onClick={handleSubmit} disabled={submitting || !mood}>
                {submitting ? 'Submitting…' : 'Submit Wellness Log'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Edit Log Form ────────────────────────────────────────────────────────────

function EditLogForm({ log, onSaved, onCancel }: { log: WellnessLogItem; onSaved: () => void; onCancel: () => void }) {
  const [mood, setMood] = useState(log.mood)
  const [factors, setFactors] = useState<string[]>(log.contributing_factors ?? [])
  const [notes, setNotes] = useState(log.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleFactor(v: string) {
    setFactors(f => f.includes(v) ? f.filter(x => x !== v) : [...f, v])
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      await wellnessApi.updateLog(log.id, { mood, contributing_factors: factors.length ? factors : undefined, notes: notes.trim() || undefined })
      onSaved()
    } catch {
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="sp-squircle-sm bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--sp-text-muted)]">Mood</p>
        <div className="flex flex-wrap gap-2">
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              className={`flex items-center gap-1.5 sp-squircle-sm border-2 px-3 py-1.5 text-xs font-semibold transition-all
                ${mood === m.value ? m.color + ' border-current' : 'border-[var(--sp-border)] text-[var(--sp-text-muted)] hover:border-slate-300'}`}
            >
              <span>{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--sp-text-muted)]">Contributing factors</p>
        <div className="flex flex-wrap gap-1.5">
          {FACTORS.map(f => (
            <button
              key={f.value}
              onClick={() => toggleFactor(f.value)}
              className={`sp-squircle-sm border px-2.5 py-1 text-[11px] font-medium transition-colors
                ${factors.includes(f.value) ? 'bg-[var(--sp-primary)] text-[var(--sp-on-primary)] border-[var(--sp-primary)]' : 'border-[var(--sp-border)] text-[var(--sp-text-muted)] hover:border-slate-300'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--sp-text-muted)]">Notes</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="input-field"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

// ─── Log History ──────────────────────────────────────────────────────────────

function LogHistory({ logs, onChanged }: { logs: WellnessLogItem[]; onChanged: () => void }) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  if (logs.length === 0) {
    return <p className="text-sm text-[var(--sp-text-muted)]">No wellness logs yet.</p>
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this wellness log? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await wellnessApi.deleteLog(id)
      onChanged()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {logs.map(log => {
        const editable = log.reviewed_at === null
        const editing = editingId === log.id

        if (editing) {
          return (
            <div key={log.id} className="sp-squircle-lg border border-[var(--sp-primary)] bg-[var(--sp-surface)] p-4">
              <EditLogForm log={log} onCancel={() => setEditingId(null)} onSaved={() => { setEditingId(null); onChanged() }} />
            </div>
          )
        }

        return (
          <div key={log.id} className="sp-squircle-lg bg-[var(--sp-surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={MOOD_VARIANT[log.mood]}>{log.mood}</Badge>
                <Badge variant={RISK_VARIANT[log.risk_level]}>{log.risk_level}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--sp-text-muted)]">{new Date(log.logged_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</span>
                {editable ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingId(log.id)}
                      title="Edit"
                      className="p-1.5 sp-squircle-sm hover:bg-[var(--sp-hover-bg)] text-[var(--sp-text-muted)]"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      disabled={deletingId === log.id}
                      title="Delete"
                      className="p-1.5 sp-squircle-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <span title="Reviewed by a counselor — no longer editable" className="p-1.5 text-[var(--sp-text-muted)] opacity-50">
                    <Lock size={13} />
                  </span>
                )}
              </div>
            </div>
            {(log.contributing_factors?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {log.contributing_factors!.map(f => (
                  <span key={f} className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-[var(--sp-text-muted)]">{f.replace(/_/g, ' ')}</span>
                ))}
              </div>
            )}
            {log.notes && <p className="mt-2 text-sm text-[var(--sp-text)]">{log.notes}</p>}
            {log.counselor_notes && (
              <div className="mt-3 sp-squircle-sm bg-[var(--sp-primary-soft-bg)] px-3 py-2">
                <p className="text-xs font-semibold text-[var(--sp-primary-soft-text)] mb-0.5">Counselor Note</p>
                <p className="text-sm text-[var(--sp-text)]">{log.counselor_notes}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentWellness() {
  const [logs, setLogs] = useState<WellnessLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMultimodal, setShowMultimodal] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const loadLogs = () => {
    wellnessApi.getLogs().then(r => setLogs(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { loadLogs() }, [])

  function handleSubmitted() {
    setShowForm(false)
    setSuccessMsg('Wellness log submitted. A counselor has been notified if needed.')
    loadLogs()
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  function handleMultimodalSubmitted() {
    setShowMultimodal(false)
    setSuccessMsg('Enhanced wellness check-in complete.')
    loadLogs()
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  const todayLogged = logs.some(l => new Date(l.logged_at).toDateString() === new Date().toDateString())

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--sp-text-muted)]">Log how you're feeling and track your wellness over time.</p>
        {/* Both check-in actions stay available all day. Mood changes — a student
            who logs "good" in the morning and declines later has to be able to
            record that, and the API accepts multiple logs per day. "Logged Today"
            is informational context alongside them, not a replacement for them. */}
        {!showForm && (
          <div className="flex items-center gap-3">
            {!loading && todayLogged && <Badge variant="success">✓ Logged Today</Badge>}
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowMultimodal(true)} variant="secondary">
                <Sparkles size={15} /> MultiModal Analysis
              </Button>
              <Button onClick={() => setShowForm(true)}>+ Standard Log</Button>
            </div>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="sp-squircle-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {showForm && (
        <LogForm onSubmitted={handleSubmitted} />
      )}

      {showMultimodal && (
        <MultimodalWellnessCheck
          onClose={() => setShowMultimodal(false)}
          onSubmitted={handleMultimodalSubmitted}
        />
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--sp-text-muted)]">Past Logs</h3>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 sp-squircle-lg bg-[var(--sp-border)] animate-pulse" />)}
          </div>
        ) : (
          <LogHistory logs={logs} onChanged={loadLogs} />
        )}
      </div>
    </div>
  )
}
