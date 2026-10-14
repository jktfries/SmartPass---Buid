import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, UserPlus, BookPlus, ClipboardPlus, Megaphone } from 'lucide-react'
import AnnouncementModal from '@/components/sysadmin/AnnouncementModal'

const ADD_OPTIONS = [
  { key: 'user',         label: 'New User',         hint: 'Create a login for any role',        icon: UserPlus },
  { key: 'class',        label: 'New Class',        hint: 'Open a new class section',           icon: BookPlus },
  { key: 'enrollment',   label: 'New Enrollment',   hint: 'Enroll a student in a class',        icon: ClipboardPlus },
  { key: 'announcement', label: 'New Announcement', hint: 'Broadcast to every user’s inbox',    icon: Megaphone },
] as const

export default function AddMenu({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handlePick(key: typeof ADD_OPTIONS[number]['key']) {
    setOpen(false)
    if (key === 'user') navigate('/sysadmin/accounts?new=1')
    else if (key === 'class') navigate('/sysadmin/academic?tab=classes&new=1')
    else if (key === 'enrollment') navigate('/sysadmin/enrollment')
    else if (key === 'announcement') setShowAnnouncement(true)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Add new…"
        className={compact
          ? 'flex items-center justify-center p-2 sp-squircle-sm bg-[var(--sp-primary)] hover:bg-[var(--sp-primary-hover)] text-[var(--sp-on-primary)] transition-colors'
          : 'flex items-center gap-1.5 sp-squircle-sm bg-[var(--sp-primary)] hover:bg-[var(--sp-primary-hover)] text-[var(--sp-on-primary)] text-xs font-semibold px-3 py-1.5 transition-colors'}
      >
        <Plus size={compact ? 18 : 14} />{!compact && ' Add'}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 sp-squircle-lg bg-[var(--sp-surface)] shadow-lg p-1.5">
          {ADD_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => handlePick(opt.key)}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left sp-squircle-sm hover:bg-[var(--sp-hover-bg)] transition-colors">
              <opt.icon size={16} className="text-[var(--sp-primary)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--sp-text)]">{opt.label}</p>
                <p className="text-xs text-[var(--sp-text-muted)]">{opt.hint}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showAnnouncement && <AnnouncementModal onClose={() => setShowAnnouncement(false)} />}
    </div>
  )
}
