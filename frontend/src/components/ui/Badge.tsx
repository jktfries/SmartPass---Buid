import type { ReactNode } from 'react'

const VARIANTS = {
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  primary: 'bg-[var(--sp-primary-soft-bg)] text-[var(--sp-primary-soft-text)]',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info:    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
} as const

export type BadgeVariant = keyof typeof VARIANTS

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export default function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  )
}
