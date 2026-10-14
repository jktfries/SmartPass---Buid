import type { ReactNode } from 'react'

// Header and body share the same horizontal padding — they used to diverge
// (header was hardcoded px-6 while the body followed the map), which misaligned
// the title against its own content at anything other than the default size.
const PADDING = {
  none: { head: 'sp-card-head', body: '' },
  sm:   { head: 'sp-card-head', body: 'sp-card-body-sm' },
  md:   { head: 'sp-card-head', body: 'sp-card-body' },
} as const

interface CardProps {
  title?: string
  subtitle?: string
  icon?: React.ElementType
  /** Optional solid override. Default is a soft accent tile, which is what the
   *  white canvas wants — a solid dark square reads far too heavy on it. */
  iconColor?: string
  /** Right-aligned slot in the header — actions, filters, "View all" links. */
  actions?: ReactNode
  padding?: keyof typeof PADDING
  className?: string
  children: ReactNode
}

export default function Card({
  title, subtitle, icon: Icon, iconColor, actions, padding = 'md', className = '', children,
}: CardProps) {
  const pad = PADDING[padding]
  const hasHeader = Boolean(title || subtitle || actions)

  return (
    <div className={`sp-block ${className}`}>
      {hasHeader && (
        <div className={`flex items-center gap-3 ${pad.head}`}>
          {Icon && (
            <div className={`w-9 h-9 sp-squircle-md flex items-center justify-center flex-shrink-0 ${iconColor ?? 'bg-[var(--sp-primary-soft-bg)]'}`}>
              <Icon size={16} className={iconColor ? 'text-white' : 'text-[var(--sp-primary-soft-text)]'} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title && <p className="text-xl font-semibold text-[var(--sp-text)] truncate">{title}</p>}
            {subtitle && <p className="text-sm text-[var(--sp-text-muted)] truncate">{subtitle}</p>}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={hasHeader ? `${pad.body} sp-card-has-head` : pad.body}>{children}</div>
    </div>
  )
}
