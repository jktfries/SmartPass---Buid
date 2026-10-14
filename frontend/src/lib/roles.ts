import type { User } from '@/api/auth'
import type { BadgeVariant } from '@/components/ui/Badge'

export const ROLE_LABEL: Record<User['role'], string> = {
  student:            'Student',
  professor:          'Professor',
  guidance_counselor: 'Guidance Counselor',
  admin_exec:         'Admin / Exec',
  system_admin:       'System Admin',
  super_admin:        'System Admin',
}

// Solid (non-gradient) background color per role — used by Avatar and any
// role badge/pill. system_admin and super_admin share one color since the
// app already treats them as a single unified experience everywhere else.
export const ROLE_COLOR: Record<User['role'], string> = {
  student:            'bg-[var(--sp-primary)]',
  professor:          'bg-sky-600',
  guidance_counselor: 'bg-emerald-600',
  admin_exec:         'bg-amber-600',
  system_admin:       'bg-slate-600',
  super_admin:        'bg-slate-600',
}

// Badge variant per role — for role pills in tables/lists (Badge only has 6
// semantic variants, mapped loosely onto the 6 roles for visual variety).
export const ROLE_VARIANT: Record<User['role'], BadgeVariant> = {
  student:            'primary',
  professor:          'info',
  guidance_counselor: 'success',
  admin_exec:         'warning',
  system_admin:       'neutral',
  super_admin:        'neutral',
}
