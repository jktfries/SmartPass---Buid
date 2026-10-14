import type { ButtonHTMLAttributes } from 'react'

const VARIANTS = {
  primary:   'bg-[var(--sp-primary)] text-[var(--sp-on-primary)] hover:bg-[var(--sp-primary-hover)]',
  secondary: 'bg-[var(--sp-subtle)] text-[var(--sp-text)] hover:bg-[var(--sp-hover-bg)]',
  ghost:     'text-[var(--sp-text-muted)] hover:bg-[var(--sp-hover-bg)]',
  danger:    'bg-red-600 text-white hover:bg-red-700',
} as const

const SIZES = {
  sm: 'px-3.5 py-2 text-xs sp-squircle-sm',
  md: 'px-5 py-2.5 text-sm sp-squircle-md',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
}

export default function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  )
}
