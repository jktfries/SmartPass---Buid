import {
  useCallback, useEffect, useRef, useState,
} from 'react'
import { chatApi } from '@/api/chat'
import type { ChatAttachment, ChatMessage, ConversationItem, Contact } from '@/api/chat'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'
import {
  Search, Plus, Send, Paperclip, X, Reply, Trash2,
  File, FileVideo, Users, MessageCircle, ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import type { User } from '@/api/auth'
import { ROLE_COLOR } from '@/lib/roles'

// ─── Helpers ────────────────────────────────────────────────────────────────

// Labels only — the colour map lives in lib/roles.ts. These are deliberately
// shorter than ROLE_LABEL there, because they render in a narrow list column.
const ROLE_LABEL: Record<string, string> = {
  student: 'Student', professor: 'Professor',
  guidance_counselor: 'Counselor', admin_exec: 'Admin',
  system_admin: 'SysAdmin', super_admin: 'SuperAdmin',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function formatMsgTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  if (diffDays < 7) return d.toLocaleDateString('en-PH', { weekday: 'short' }) + ' ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function formatDateSeparator(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function isImageMime(mime: string) { return mime.startsWith('image/') }
function isVideoMime(mime: string) { return mime.startsWith('video/') }

// ─── Sub-components ──────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, role, size = 8 }: {
  name: string; avatarUrl: string | null; role: string; size?: number
}) {
  const solid = ROLE_COLOR[role as User['role']] ?? 'bg-slate-600'
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="sp-squircle-sm object-cover flex-shrink-0"
        style={{ width: size * 4, height: size * 4 }}
      />
    )
  }
  return (
    <div
      className={clsx(
        'sp-squircle-sm flex-shrink-0 flex items-center justify-center font-bold select-none',
        solid,
        // Only `student` is accent-tinted; other roles are fixed dark colours.
        role === 'student' ? 'text-[var(--sp-on-primary)]' : 'text-white',
      )}
      style={{ width: size * 4, height: size * 4, fontSize: size * 2 }}
    >
      {initials(name)}
    </div>
  )
}

function AttachmentView({ a }: { a: ChatAttachment }) {
  if (isImageMime(a.mime_type)) {
    return (
      <a href={a.url} target="_blank" rel="noreferrer" className="block max-w-xs">
        <img
          src={a.url}
          alt={a.original_name}
          className="max-h-64 sp-squircle-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
        />
      </a>
    )
  }
  if (isVideoMime(a.mime_type)) {
    return (
      <video
        controls
        src={a.url}
        className="max-h-64 max-w-xs sp-squircle-lg"
        preload="metadata"
      />
    )
  }
  return (
    <a
      href={a.url}
      download={a.original_name}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 sp-squircle-lg bg-[var(--sp-subtle)] px-3 py-2 max-w-xs hover:bg-[var(--sp-hover-bg)] transition-colors"
    >
      <File size={20} className="text-[var(--sp-primary)] flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--sp-text)] truncate">{a.original_name}</p>
        <p className="text-[10px] text-[var(--sp-text-muted)]">{formatBytes(a.file_size)}</p>
      </div>
    </a>
  )
}

function MessageBubble({ msg, onReply, onDelete, showAvatar }: {
  msg: ChatMessage
  onReply: (msg: ChatMessage) => void
  onDelete: (id: number) => void
  showAvatar: boolean
}) {
  const [hover, setHover] = useState(false)

  return (
    <div
      className={clsx('flex gap-2 group', msg.is_mine ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar — only on first message in a sender block */}
      <div className="flex-shrink-0 self-end" style={{ width: 32 }}>
        {showAvatar && !msg.is_mine && (
          <Avatar
            name={msg.sender.name}
            avatarUrl={msg.sender.avatar_url}
            role={msg.sender.role}
            size={8}
          />
        )}
      </div>

      <div className={clsx('flex flex-col max-w-[70%]', msg.is_mine ? 'items-end' : 'items-start')}>
        {showAvatar && !msg.is_mine && (
          <span className="text-[11px] font-semibold text-[var(--sp-text-muted)] mb-0.5 ml-1">
            {msg.sender.nickname || msg.sender.name}
          </span>
        )}

        <div className={clsx(
          'relative sp-squircle-xl px-3.5 py-2.5 shadow-sm',
          msg.is_mine
            ? 'bg-[var(--sp-primary)] text-[var(--sp-on-primary)] rounded-br-sm'
            : 'bg-[var(--sp-subtle)] text-[var(--sp-text)] rounded-bl-sm',
          msg.is_deleted && 'opacity-60 italic',
        )}>
          {/* Inline reply preview */}
          {msg.reply_to && (
            <div className={clsx(
              'mb-2 sp-squircle-sm px-2.5 py-1.5 border-l-4 text-xs',
              msg.is_mine
                ? 'bg-black/15 border-white/40'
                : 'bg-slate-100 dark:bg-slate-700 border-[var(--sp-primary)]',
            )}>
              <p className="font-semibold mb-0.5">{msg.reply_to.sender_name}</p>
              <p className="opacity-80 truncate">
                {msg.reply_to.body ?? (msg.reply_to.has_attachment ? '📎 Attachment' : 'This message was deleted')}
              </p>
            </div>
          )}

          {msg.is_deleted ? (
            <span className="text-sm">This message was deleted</span>
          ) : (
            <>
              {msg.body && (
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
              )}
              {msg.attachments.length > 0 && (
                <div className={clsx('flex flex-col gap-2', msg.body && 'mt-2')}>
                  {msg.attachments.map(a => <AttachmentView key={a.id} a={a} />)}
                </div>
              )}
            </>
          )}
        </div>

        <span className="text-[10px] text-[var(--sp-text-muted)] mt-0.5 mx-1">
          {formatMsgTime(msg.created_at)}
        </span>
      </div>

      {/* Hover actions */}
      {hover && !msg.is_deleted && (
        <div className={clsx(
          'flex items-center gap-1 self-center opacity-0 group-hover:opacity-100 transition-opacity',
          msg.is_mine ? 'flex-row-reverse' : 'flex-row',
        )}>
          <button
            onClick={() => onReply(msg)}
            className="p-1.5 sp-squircle-sm hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--sp-text-muted)]"
            title="Reply"
          >
            <Reply size={14} />
          </button>
          {msg.is_mine && (
            <button
              onClick={() => onDelete(msg.id)}
              className="p-1.5 sp-squircle-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FilePreviewChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImg = file.type.startsWith('image/')
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!isImg) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isImg])

  return (
    <div className="relative group flex-shrink-0">
      {preview ? (
        <img src={preview} alt={file.name} className="h-16 w-16 sp-squircle-sm object-cover border border-[var(--sp-border)]" />
      ) : (
        <div className="h-16 w-24 sp-squircle-sm border border-[var(--sp-border)] bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-1 px-2">
          {file.type.startsWith('video/') ? (
            <FileVideo size={18} className="text-[var(--sp-primary)]" />
          ) : (
            <File size={18} className="text-slate-400" />
          )}
          <span className="text-[9px] text-[var(--sp-text-muted)] truncate w-full text-center">{file.name}</span>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={10} />
      </button>
    </div>
  )
}

// ─── New Chat Modal ───────────────────────────────────────────────────────────

function NewChatModal({ onClose, onStarted }: {
  onClose: () => void
  onStarted: (conv: ConversationItem) => void
}) {
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact[]>([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    setLoading(true)
    chatApi.getContacts(search || undefined)
      .then(r => setContacts(r.data))
      .finally(() => setLoading(false))
  }, [search])

  function toggle(c: Contact) {
    setSelected(prev =>
      prev.find(p => p.id === c.id)
        ? prev.filter(p => p.id !== c.id)
        : [...prev, c],
    )
  }

  async function start() {
    if (selected.length === 0) return
    setStarting(true)
    try {
      let res
      if (selected.length === 1) {
        res = await chatApi.startConversation({ target_user_id: selected[0].id })
      } else {
        res = await chatApi.startConversation({
          participants: selected.map(c => c.id),
          name: groupName.trim() || undefined,
        })
      }
      onStarted(res.data)
      onClose()
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md bg-[var(--sp-surface)] sp-squircle-xl shadow-2xl flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--sp-border)]">
          <h3 className="font-bold text-[var(--sp-text)]">New Conversation</h3>
          <button onClick={onClose} className="text-[var(--sp-text-muted)] hover:text-[var(--sp-text)]">
            <X size={18} />
          </button>
        </div>

        {selected.length > 1 && (
          <div className="px-4 pt-3">
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
              className="input-field"
            />
          </div>
        )}

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {selected.map(c => (
              <span
                key={c.id}
                className="flex items-center gap-1 rounded-full bg-[var(--sp-primary-soft-bg)] text-[var(--sp-primary-soft-text)] text-xs px-2.5 py-1 font-medium"
              >
                {c.name}
                <button onClick={() => toggle(c)}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}

        <div className="px-4 py-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sp-text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search people…"
              className="input-field pl-8"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-[var(--sp-text-muted)]">Searching…</div>
          ) : contacts.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--sp-text-muted)]">No contacts found</div>
          ) : (() => {
            // Group contacts by role, preserving server sort order (role → name)
            const ROLE_GROUP_LABEL: Record<string, string> = {
              professor:          'Professors',
              guidance_counselor: 'Counselors',
              student:            'Students',
              system_admin:       'Support',
              super_admin:        'Support',
              admin_exec:         'Administration',
            }
            const groups: Record<string, Contact[]> = {}
            contacts.forEach(c => {
              const g = ROLE_GROUP_LABEL[c.role] ?? 'Other'
              if (!groups[g]) groups[g] = []
              groups[g].push(c)
            })
            return Object.entries(groups).map(([groupLabel, members]) => (
              <div key={groupLabel}>
                {!search && (
                  <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sp-text-muted)]">
                    {groupLabel}
                  </p>
                )}
                {members.map(c => {
                  const isSelected = !!selected.find(p => p.id === c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(c)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 sp-squircle-lg text-left transition-colors',
                        isSelected
                          ? 'bg-[var(--sp-primary-soft-bg)]'
                          : 'hover:bg-[var(--sp-hover-bg)]',
                      )}
                    >
                      <Avatar name={c.name} avatarUrl={c.avatar_url} role={c.role} size={9} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--sp-text)] truncate">{c.name}</p>
                        <p className="text-xs text-[var(--sp-text-muted)]">{ROLE_LABEL[c.role] ?? c.role}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[var(--sp-primary)] flex items-center justify-center text-[var(--sp-on-primary)] text-[10px]">✓</div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          })()}
        </div>

        <div className="p-4 border-t border-[var(--sp-border)]">
          <button
            onClick={start}
            disabled={selected.length === 0 || starting}
            className="w-full sp-squircle-lg bg-[var(--sp-primary)] hover:bg-[var(--sp-primary-hover)] disabled:opacity-40 text-[var(--sp-on-primary)] font-semibold py-2.5 text-sm transition-colors"
          >
            {starting ? 'Starting…' : selected.length > 1 ? `Create Group (${selected.length})` : 'Start Chat'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MSG_FILTER_KEY = (userId: number) => `sp-msg-filter:${userId}`

export default function MessagesPage() {
  const { user } = useAuth()
  const { refresh: refreshNotifs } = useNotifications()

  const [convFilter, setConvFilter] = useState<'all' | 'unread'>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // `user` hydrates asynchronously, so the stored preference is read once it
  // lands rather than in a lazy useState initializer.
  useEffect(() => {
    if (!user) return
    try {
      const saved = localStorage.getItem(MSG_FILTER_KEY(user.id))
      if (saved === 'all' || saved === 'unread') setConvFilter(saved)
    } catch { /* storage unavailable (private mode) — keep the default */ }
  }, [user?.id])

  function pickFilter(next: 'all' | 'unread') {
    setConvFilter(next)
    setFilterOpen(false)
    if (!user) return
    try {
      localStorage.setItem(MSG_FILTER_KEY(user.id), next)
    } catch { /* non-fatal */ }
  }

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeId, setActiveId]           = useState<number | null>(null)
  const [messages, setMessages]           = useState<ChatMessage[]>([])
  const [body, setBody]                   = useState('')
  const [replyTo, setReplyTo]             = useState<ChatMessage | null>(null)
  const [files, setFiles]                 = useState<File[]>([])
  const [sending, setSending]             = useState(false)
  const [newChatOpen, setNewChatOpen]     = useState(false)
  const [convSearch, setConvSearch]       = useState('')
  const [hasMore, setHasMore]             = useState(false)
  const [loadingMore, setLoadingMore]     = useState(false)

  const messagesEndRef     = useRef<HTMLDivElement>(null)
  const fileInputRef       = useRef<HTMLInputElement>(null)
  const textareaRef        = useRef<HTMLTextAreaElement>(null)
  const lastMsgIdRef       = useRef<number>(0)
  const convPollRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const msgPollRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const atBottomRef        = useRef(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // ── Conversation list ──────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    const r = await chatApi.getConversations()
    setConversations(r.data)
  }, [])

  useEffect(() => {
    loadConversations()
    convPollRef.current = setInterval(loadConversations, 10000)
    return () => { if (convPollRef.current) clearInterval(convPollRef.current) }
  }, [loadConversations])

  // ── Messages for active conversation ─────────────────────────────────────

  const loadMessages = useCallback(async (id: number) => {
    const r = await chatApi.getMessages(id)
    setMessages(r.data)
    if (r.data.length > 0) lastMsgIdRef.current = r.data[r.data.length - 1].id
    setHasMore(r.data.length >= 30)
    refreshNotifs()
  }, [refreshNotifs])

  const pollMessages = useCallback(async (id: number) => {
    if (lastMsgIdRef.current === 0) return
    const r = await chatApi.getMessages(id, { after_id: lastMsgIdRef.current })
    if (r.data.length > 0) {
      setMessages(prev => [...prev, ...r.data])
      lastMsgIdRef.current = r.data[r.data.length - 1].id
      await chatApi.markRead(id)
      refreshNotifs()
      loadConversations()
    }
  }, [refreshNotifs, loadConversations])

  useEffect(() => {
    if (!activeId) return
    lastMsgIdRef.current = 0
    loadMessages(activeId)
    if (msgPollRef.current) clearInterval(msgPollRef.current)
    msgPollRef.current = setInterval(() => pollMessages(activeId), 3000)
    return () => { if (msgPollRef.current) clearInterval(msgPollRef.current) }
  }, [activeId, loadMessages, pollMessages])

  // Auto-scroll to bottom when messages arrive (only if already at bottom)
  useEffect(() => {
    if (atBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  function handleScroll() {
    const el = scrollContainerRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  async function loadOlderMessages() {
    if (!activeId || !hasMore || loadingMore || messages.length === 0) return
    setLoadingMore(true)
    try {
      const firstId = messages[0].id
      const r = await chatApi.getMessages(activeId, { before_id: firstId })
      if (r.data.length > 0) {
        const el = scrollContainerRef.current
        const prevScrollHeight = el?.scrollHeight ?? 0
        setMessages(prev => [...r.data, ...prev])
        setHasMore(r.data.length >= 30)
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevScrollHeight
        })
      } else {
        setHasMore(false)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  function handleScrollUp(e: React.UIEvent<HTMLDivElement>) {
    handleScroll()
    if (e.currentTarget.scrollTop < 60) loadOlderMessages()
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  async function handleSend() {
    if ((!body.trim() && files.length === 0) || !activeId || sending) return
    setSending(true)
    try {
      const fd = new FormData()
      if (body.trim()) fd.append('body', body.trim())
      if (replyTo) fd.append('reply_to_id', String(replyTo.id))
      files.forEach(f => fd.append('attachments[]', f))

      const r = await chatApi.sendMessage(activeId, fd)
      setMessages(prev => [...prev, r.data])
      lastMsgIdRef.current = r.data.id
      setBody('')
      setFiles([])
      setReplyTo(null)
      atBottomRef.current = true
      await loadConversations()
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    setFiles(prev => [...prev, ...picked].slice(0, 10))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(msgId: number) {
    await chatApi.deleteMessage(msgId)
    setMessages(prev =>
      prev.map(m => m.id === msgId ? { ...m, is_deleted: true, body: null, attachments: [] } : m),
    )
  }

  async function handleHideConversation(e: React.MouseEvent, convId: number) {
    e.stopPropagation()
    if (!window.confirm('Remove this conversation from your inbox? It will reappear if the other person sends a new message.')) return
    await chatApi.hideConversation(convId)
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (activeId === convId) setActiveId(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...dropped].slice(0, 10))
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const activeConv = conversations.find(c => c.id === activeId)

  const unreadConvCount = conversations.filter(c => c.unread_count > 0).length

  const filteredConvs = conversations.filter(c => {
    if (convFilter === 'unread' && c.unread_count === 0) return false
    if (!convSearch) return true
    const name = c.name ?? c.participants[0]?.name ?? ''
    return name.toLowerCase().includes(convSearch.toLowerCase())
  })

  const convName = activeConv?.name ?? activeConv?.participants[0]?.name ?? 'Chat'
  const convSub = activeConv?.participants.map(p => p.nickname || p.name).join(', ') ?? ''

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    // A normal floating block like every other page. This used to break out of
    // the shell with -mx-8/-mb-10/-mt-2, but those cancel <main>'s padding only
    // at Comfortable density — <main> pads with var(--sp-page-pad-*), so on
    // Compact the page over-pulled by 12px horizontally and hung outside the
    // content area with square, full-bleed corners.
    //
    // h-full rather than a calc against the topbar: <main> is a flex-1 child of
    // the h-screen shell, so its height is definite and h-full resolves against
    // its content box — the block lands exactly inside the padding.
    <div className="sp-block h-full flex overflow-hidden">
      {/* ── Left panel: conversation list ── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-[var(--sp-border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--sp-border)]">
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              className="flex items-center gap-1.5 sp-squircle-sm px-2 py-1 -ml-2 text-base font-bold text-[var(--sp-text)] hover:bg-[var(--sp-hover-bg)] transition-colors"
            >
              {convFilter === 'all' ? 'All' : 'Unread'}
              {convFilter === 'unread' && unreadConvCount > 0 && (
                <span className="rounded-full bg-[var(--sp-primary)] text-[var(--sp-on-primary)] text-[10px] font-bold px-1.5 py-0.5">
                  {unreadConvCount}
                </span>
              )}
              <ChevronDown size={14} className="text-[var(--sp-text-muted)]" />
            </button>

            {filterOpen && (
              <div className="absolute left-0 z-20 mt-1 w-44 sp-squircle-lg bg-[var(--sp-surface)] shadow-lg overflow-hidden">
                <button
                  onClick={() => pickFilter('all')}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-sm text-[var(--sp-text)] sp-squircle-sm hover:bg-[var(--sp-hover-bg)] transition-colors"
                >
                  All
                  <span className="text-xs text-[var(--sp-text-muted)]">{conversations.length}</span>
                </button>
                <button
                  onClick={() => pickFilter('unread')}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-sm text-[var(--sp-text)] sp-squircle-sm hover:bg-[var(--sp-hover-bg)] transition-colors"
                >
                  Unread
                  <span className="text-xs text-[var(--sp-text-muted)]">{unreadConvCount}</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setNewChatOpen(true)}
            className="flex items-center gap-1.5 sp-squircle-sm bg-[var(--sp-primary)] hover:bg-[var(--sp-primary-hover)] text-[var(--sp-on-primary)] text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            <Plus size={13} /> New
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sp-text-muted)]" />
            <input
              value={convSearch}
              onChange={e => setConvSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full sp-squircle-md bg-[var(--sp-subtle)] text-[var(--sp-text)] text-sm pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary)]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--sp-text-muted)]">
              <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
              No conversations yet
            </div>
          ) : filteredConvs.map(conv => {
            const name = conv.name ?? conv.participants[0]?.name ?? 'Unknown'
            const ap = conv.participants[0]
            const preview = conv.last_message
              ? (conv.last_message.body ?? (conv.last_message.has_attachment ? '📎 Attachment' : ''))
              : 'No messages yet'

            return (
              <div
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') setActiveId(conv.id) }}
                className={clsx(
                  'group w-full flex items-center gap-3 px-3 py-3 text-left transition-colors sp-squircle-md cursor-pointer',
                  activeId === conv.id
                    ? 'bg-[var(--sp-primary-soft-bg)]'
                    : 'hover:bg-[var(--sp-hover-bg)]',
                )}
              >
                <div className="relative flex-shrink-0">
                  {ap ? (
                    <Avatar name={ap.name} avatarUrl={ap.avatar_url} role={ap.role} size={10} />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <Users size={16} className="text-slate-400" />
                    </div>
                  )}
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-[var(--sp-primary)] text-[var(--sp-on-primary)] text-[9px] font-bold flex items-center justify-center">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className={clsx(
                      'text-sm truncate',
                      conv.unread_count > 0 ? 'font-bold text-[var(--sp-text)]' : 'font-medium text-[var(--sp-text)]',
                    )}>
                      {name}
                    </span>
                    <span className="flex-shrink-0 flex items-center gap-1">
                      {conv.last_message && (
                        <span className="text-[10px] text-[var(--sp-text-muted)] group-hover:hidden">
                          {formatMsgTime(conv.last_message.created_at)}
                        </span>
                      )}
                      <button
                        onClick={e => handleHideConversation(e, conv.id)}
                        title="Remove conversation"
                        className="hidden group-hover:flex p-1 sp-squircle-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </div>
                  <p className={clsx(
                    'text-xs truncate mt-0.5',
                    conv.unread_count > 0 ? 'text-[var(--sp-text)] font-medium' : 'text-[var(--sp-text-muted)]',
                  )}>
                    {preview}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right panel: chat ── */}
      {!activeId ? (
        <div className="flex-1 flex items-center justify-center bg-[var(--sp-bg)]">
          <div className="text-center space-y-2">
            <MessageCircle size={48} className="mx-auto text-[var(--sp-text-muted)] opacity-30" />
            <p className="text-[var(--sp-text-muted)] text-sm">Select a conversation or start a new one</p>
            <button
              onClick={() => setNewChatOpen(true)}
              className="mt-3 sp-squircle-lg bg-[var(--sp-primary)] hover:bg-[var(--sp-primary-hover)] text-[var(--sp-on-primary)] text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              + New Conversation
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--sp-border)] bg-[var(--sp-surface)] flex-shrink-0">
            {activeConv?.participants[0] && (
              <Avatar
                name={activeConv.participants[0].name}
                avatarUrl={activeConv.participants[0].avatar_url}
                role={activeConv.participants[0].role}
                size={9}
              />
            )}
            <div>
              <h3 className="font-bold text-sm text-[var(--sp-text)]">{convName}</h3>
              {convSub && (
                <p className="text-xs text-[var(--sp-text-muted)] truncate max-w-md">{convSub}</p>
              )}
            </div>
          </div>

          {/* Scrollable messages */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScrollUp}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
          >
            {loadingMore && (
              <div className="text-center text-xs text-[var(--sp-text-muted)] py-2">Loading older messages…</div>
            )}
            {hasMore && !loadingMore && (
              <button
                onClick={loadOlderMessages}
                className="w-full flex items-center justify-center gap-1 text-xs text-[var(--sp-primary)] hover:opacity-80 py-1 mb-2"
              >
                <ChevronDown size={13} /> Load older messages
              </button>
            )}

            {messages.map((msg, idx) => {
              const prev = messages[idx - 1]
              const showDateSep = !prev || !isSameDay(prev.created_at, msg.created_at)
              const showAvatar = !prev
                || prev.sender.id !== msg.sender.id
                || showDateSep
                || (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) > 300000

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-[var(--sp-border)]" />
                      <span className="text-[11px] text-[var(--sp-text-muted)] font-medium px-2">
                        {formatDateSeparator(msg.created_at)}
                      </span>
                      <div className="flex-1 h-px bg-[var(--sp-border)]" />
                    </div>
                  )}
                  <MessageBubble
                    msg={msg}
                    onReply={setReplyTo}
                    onDelete={handleDelete}
                    showAvatar={showAvatar}
                  />
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            className="flex-shrink-0 border-t border-[var(--sp-border)] bg-[var(--sp-surface)] px-4 py-3"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            {/* Reply bar */}
            {replyTo && (
              <div className="flex items-start gap-2 sp-squircle-lg bg-[var(--sp-primary-soft-bg)] border border-[var(--sp-primary)]/30 px-3 py-2 mb-2">
                <Reply size={14} className="text-[var(--sp-primary)] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--sp-primary-soft-text)]">
                    {replyTo.sender.nickname || replyTo.sender.name}
                  </p>
                  <p className="text-xs text-[var(--sp-text-muted)] truncate">
                    {replyTo.body ?? (replyTo.attachments.length > 0 ? '📎 Attachment' : '')}
                  </p>
                </div>
                <button onClick={() => setReplyTo(null)} className="text-[var(--sp-text-muted)] hover:text-[var(--sp-text)]">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* File previews */}
            {files.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {files.map((f, i) => (
                  <FilePreviewChip
                    key={i}
                    file={f}
                    onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
            )}

            {/* Message row */}
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 sp-squircle-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-[var(--sp-text-muted)] flex-shrink-0 transition-colors"
                title="Attach file"
              >
                <Paperclip size={18} />
              </button>

              <textarea
                ref={textareaRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="flex-1 resize-none sp-squircle-xl bg-[var(--sp-subtle)] text-[var(--sp-text)] text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary)] transition-colors overflow-y-auto"
                style={{ minHeight: 42, maxHeight: 144 }}
                onInput={e => {
                  const t = e.currentTarget
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 144) + 'px'
                }}
              />

              <button
                onClick={handleSend}
                disabled={(!body.trim() && files.length === 0) || sending}
                className="p-2.5 sp-squircle-lg bg-[var(--sp-primary)] hover:bg-[var(--sp-primary-hover)] disabled:opacity-40 text-[var(--sp-on-primary)] flex-shrink-0 transition-colors"
                title="Send (Enter)"
              >
                <Send size={16} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
            />
          </div>
        </div>
      )}

      {newChatOpen && (
        <NewChatModal
          onClose={() => setNewChatOpen(false)}
          onStarted={conv => {
            setConversations(prev => {
              const exists = prev.find(c => c.id === conv.id)
              return exists ? prev : [conv, ...prev]
            })
            setActiveId(conv.id)
          }}
        />
      )}
    </div>
  )
}
