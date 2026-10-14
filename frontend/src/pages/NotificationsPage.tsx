import { useEffect, useState, useCallback } from 'react'
import { notificationApi } from '@/api/notifications'
import type { NotificationItem } from '@/api/notifications'
import { useNotifications } from '@/context/NotificationContext'
import { Trash2, MailOpen, Mail, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import Button from '@/components/ui/Button'

const TYPE_META: Record<string, { icon: string; color: string }> = {
  attendance_breach: { icon: '📋', color: 'text-orange-500' },
  appointment_update:{ icon: '📅', color: 'text-sky-500' },
  wellness_flag:     { icon: '💚', color: 'text-[var(--sp-primary)]' },
  new_message:       { icon: '✉️',  color: 'text-[var(--sp-primary)]' },
}

function NotifIcon({ type }: { type: string }) {
  const meta = TYPE_META[type] ?? { icon: '🔔', color: 'text-slate-400' }
  return (
    <div className={`w-9 h-9 sp-squircle-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 flex-shrink-0 text-lg ${meta.color}`}>
      {meta.icon}
    </div>
  )
}

export default function NotificationsPage() {
  const { refresh } = useNotifications()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [marking, setMarking] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const load = useCallback((p: number) => {
    setLoading(true)
    notificationApi.list(p)
      .then(r => {
        setItems(r.data.data)
        setLastPage(r.data.last_page)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page) }, [page, load])

  async function handleMarkAll() {
    setMarking(true)
    try {
      await notificationApi.markAllRead()
      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
      refresh()
    } finally {
      setMarking(false)
    }
  }

  async function handleClearAll() {
    if (!window.confirm('Clear all notifications? This cannot be undone.')) return
    setClearing(true)
    try {
      await notificationApi.clearAll()
      setItems([])
      setLastPage(1)
      refresh()
    } finally {
      setClearing(false)
    }
  }

  function handleToggleExpand(n: NotificationItem) {
    setExpandedId(prev => prev === n.id ? null : n.id)
    if (!n.is_read) {
      notificationApi.markRead(n.id).then(() => {
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
        refresh()
      })
    }
  }

  async function handleToggleRead(e: React.MouseEvent, n: NotificationItem) {
    e.stopPropagation()
    if (n.is_read) {
      await notificationApi.markUnread(n.id)
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: false } : x))
    } else {
      await notificationApi.markRead(n.id)
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
    }
    refresh()
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    await notificationApi.remove(id)
    setItems(prev => prev.filter(n => n.id !== id))
    if (expandedId === id) setExpandedId(null)
    refresh()
  }

  const hasUnread = items.some(n => !n.is_read)

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header actions */}
      {(hasUnread || items.length > 0) && (
        <div className="flex items-center justify-end gap-2">
          {hasUnread && (
            <Button onClick={handleMarkAll} disabled={marking} variant="secondary" size="sm">
              {marking ? 'Marking…' : 'Mark all as read'}
            </Button>
          )}
          {items.length > 0 && (
            <Button onClick={handleClearAll} disabled={clearing} variant="secondary" size="sm" className="!text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20">
              {clearing ? 'Clearing…' : 'Clear all'}
            </Button>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 sp-squircle-lg bg-[var(--sp-border)] animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="sp-squircle-xl border border-dashed border-[var(--sp-border)] py-16 text-center">
          <p className="text-4xl mb-2">🔔</p>
          <p className="text-[var(--sp-text-muted)] text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(n => {
            const expanded = expandedId === n.id
            return (
              <div
                key={n.id}
                onClick={() => handleToggleExpand(n)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') handleToggleExpand(n) }}
                className={clsx(
                  'group w-full text-left sp-squircle-lg border px-4 py-3 flex gap-3 items-start transition-colors cursor-pointer',
                  n.is_read
                    ? 'border-[var(--sp-border)] bg-[var(--sp-surface)] opacity-70'
                    : 'border-transparent bg-[var(--sp-primary-soft-bg)] hover:opacity-90',
                )}
              >
                <NotifIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${n.is_read ? 'text-[var(--sp-text-muted)]' : 'text-[var(--sp-text)]'}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-[var(--sp-primary)]" />}
                      <time className="text-xs text-[var(--sp-text-muted)]">
                        {new Date(n.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </time>
                      {/* Hover actions */}
                      <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                        <button
                          onClick={e => handleToggleRead(e, n)}
                          title={n.is_read ? 'Mark as unread' : 'Mark as read'}
                          className="p-1 sp-squircle-sm hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--sp-text-muted)]"
                        >
                          {n.is_read ? <Mail size={13} /> : <MailOpen size={13} />}
                        </button>
                        <button
                          onClick={e => handleDelete(e, n.id)}
                          title="Delete"
                          className="p-1 sp-squircle-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {n.body && (
                    <p className={clsx(
                      'text-xs text-[var(--sp-text-muted)] mt-0.5',
                      expanded ? '' : 'line-clamp-2',
                    )}>
                      {n.body}
                    </p>
                  )}
                  {n.body && n.body.length > 100 && (
                    <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] text-[var(--sp-primary)] font-medium">
                      {expanded ? 'Show less' : 'Show more'}
                      <ChevronDown size={11} className={clsx('transition-transform', expanded && 'rotate-180')} />
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-2 sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] text-sm disabled:opacity-40 transition-colors"
          >← Prev</button>
          <span className="text-sm text-[var(--sp-text-muted)]">{page} / {lastPage}</span>
          <button
            onClick={() => setPage(p => Math.min(lastPage, p + 1))}
            disabled={page === lastPage}
            className="px-3.5 py-2 sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] text-sm disabled:opacity-40 transition-colors"
          >Next →</button>
        </div>
      )}
    </div>
  )
}
