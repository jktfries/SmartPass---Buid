import type { ReactNode, MouseEvent } from 'react'
import { X } from 'lucide-react'

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const

interface ModalProps {
  title: string
  onClose: () => void
  size?: keyof typeof SIZES
  footer?: ReactNode
  children: ReactNode
}

export default function Modal({ title, onClose, size = 'md', footer, children }: ModalProps) {
  function stop(e: MouseEvent) { e.stopPropagation() }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`w-full ${SIZES[size]} sp-squircle-xl bg-[var(--sp-surface)] shadow-2xl max-h-[90vh] flex flex-col`}
        onClick={stop}
      >
        <div className="flex items-center justify-between px-7 pt-6 pb-4 flex-shrink-0">
          <h3 className="text-xl font-semibold text-[var(--sp-text)]">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 sp-squircle-sm hover:bg-[var(--sp-hover-bg)] text-[var(--sp-text-muted)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-7 pb-2 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 px-7 pt-4 pb-6 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
