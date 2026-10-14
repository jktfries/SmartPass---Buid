import { ROLE_COLOR } from '@/lib/roles'
import type { User } from '@/api/auth'

const SIZES = {
  sm: 'w-8 h-8 text-[10px] sp-squircle-sm',
  md: 'w-9 h-9 text-xs sp-squircle-sm',
  lg: 'w-12 h-12 text-sm sp-squircle-md',
  xl: 'w-28 h-28 text-3xl sp-squircle-xl',
} as const

interface AvatarProps {
  name: string
  role: User['role']
  url?: string | null
  size?: keyof typeof SIZES
  className?: string
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function Avatar({ name, role, url, size = 'md', className = '' }: AvatarProps) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${SIZES[size]} object-cover flex-shrink-0 ${className}`}
      />
    )
  }
  // Only `student` is tinted by --sp-primary; every other role is a fixed dark
  // colour where white always works. So the adaptive foreground applies to the
  // student case alone — using it everywhere would put dark initials on
  // sky-600 the moment someone picked a pale accent.
  const fg = role === 'student' ? 'text-[var(--sp-on-primary)]' : 'text-white'

  return (
    <div className={`${SIZES[size]} ${ROLE_COLOR[role]} flex items-center justify-center ${fg} font-bold select-none flex-shrink-0 ${className}`}>
      {initials(name || '?')}
    </div>
  )
}
