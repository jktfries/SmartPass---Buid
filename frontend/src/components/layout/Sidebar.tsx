import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'
import type { User } from '@/api/auth'
import {
  LayoutDashboard, CalendarCheck, HeartPulse, CalendarClock,
  BookOpen, Users, Settings, ShieldCheck, FileText, MessageSquare, Bell, UserCircle, Ticket,
  GraduationCap,
} from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '@/context/ThemeContext'

type NavItem = { label: string; to: string; icon: React.ElementType; badge?: 'notif' | 'msg' }
type NavSection = { label: string; items: NavItem[] }

const navSectionsByRole: Record<User['role'], NavSection[]> = {
  student: [
    { label: 'Overview', items: [
      { label: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
    ] },
    { label: 'My Records', items: [
      { label: 'Attendance',   to: '/student/attendance',   icon: CalendarCheck },
      { label: 'Wellness',     to: '/student/wellness',     icon: HeartPulse },
      { label: 'Appointments', to: '/student/appointments', icon: CalendarClock },
    ] },
    { label: 'Communication', items: [
      { label: 'Notifications',   to: '/notifications', icon: Bell,          badge: 'notif' },
      { label: 'Messages',        to: '/messages',      icon: MessageSquare, badge: 'msg' },
      { label: 'Support Tickets', to: '/tickets',        icon: Ticket },
    ] },
    { label: 'Account', items: [
      { label: 'My Account', to: '/account', icon: UserCircle },
    ] },
  ],
  professor: [
    { label: 'Overview', items: [
      { label: 'Dashboard', to: '/professor/dashboard', icon: LayoutDashboard },
    ] },
    { label: 'Teaching', items: [
      { label: 'My Classes', to: '/professor/classes', icon: BookOpen },
    ] },
    { label: 'Communication', items: [
      { label: 'Notifications',   to: '/notifications', icon: Bell,          badge: 'notif' },
      { label: 'Messages',        to: '/messages',      icon: MessageSquare, badge: 'msg' },
      { label: 'Support Tickets', to: '/tickets',        icon: Ticket },
    ] },
    { label: 'Account', items: [
      { label: 'My Account', to: '/account', icon: UserCircle },
    ] },
  ],
  guidance_counselor: [
    { label: 'Overview', items: [
      { label: 'Dashboard', to: '/counselor/dashboard', icon: LayoutDashboard },
    ] },
    { label: 'Caseload', items: [
      { label: 'Wellness Logs', to: '/counselor/wellness-logs', icon: HeartPulse },
      { label: 'Appointments',  to: '/counselor/appointments',  icon: CalendarClock },
    ] },
    { label: 'Communication', items: [
      { label: 'Notifications',   to: '/notifications', icon: Bell,          badge: 'notif' },
      { label: 'Messages',        to: '/messages',      icon: MessageSquare, badge: 'msg' },
      { label: 'Support Tickets', to: '/tickets',        icon: Ticket },
    ] },
    { label: 'Account', items: [
      { label: 'My Account', to: '/account', icon: UserCircle },
    ] },
  ],
  admin_exec: [
    { label: 'Overview', items: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    ] },
    { label: 'Academic Operations', items: [
      { label: 'Academic',   to: '/sysadmin/academic',   icon: BookOpen },
      { label: 'Enrollment', to: '/sysadmin/enrollment', icon: CalendarCheck },
    ] },
    { label: 'Support & Comms', items: [
      { label: 'Support Queue',  to: '/tickets',        icon: Ticket },
      { label: 'Notifications',  to: '/notifications',  icon: Bell,          badge: 'notif' },
      { label: 'Messages',       to: '/messages',       icon: MessageSquare, badge: 'msg' },
    ] },
    { label: 'Account', items: [
      { label: 'My Account', to: '/account', icon: UserCircle },
    ] },
  ],
  // system_admin and super_admin share the exact same nav — there is no split experience
  system_admin: [
    { label: 'Overview', items: [
      { label: 'Dashboard', to: '/sysadmin/dashboard', icon: LayoutDashboard },
    ] },
    { label: 'Academic Operations', items: [
      { label: 'Academic',   to: '/sysadmin/academic',   icon: BookOpen },
      { label: 'Enrollment', to: '/sysadmin/enrollment', icon: CalendarCheck },
    ] },
    { label: 'Administration', items: [
      { label: 'Accounts',   to: '/sysadmin/accounts',    icon: Users },
      { label: 'Approvals',  to: '/sysadmin/approvals',   icon: ShieldCheck },
      { label: 'Audit Logs', to: '/sysadmin/audit-logs',  icon: FileText },
      { label: 'Settings',   to: '/sysadmin/settings',    icon: Settings },
    ] },
    { label: 'Support & Comms', items: [
      { label: 'Support Queue',  to: '/tickets',        icon: Ticket },
      { label: 'Notifications',  to: '/notifications',  icon: Bell,          badge: 'notif' },
      { label: 'Messages',       to: '/messages',       icon: MessageSquare, badge: 'msg' },
    ] },
    { label: 'Account', items: [
      { label: 'My Account', to: '/account', icon: UserCircle },
    ] },
  ],
  super_admin: [], // filled in below — identical to system_admin
}
navSectionsByRole.super_admin = navSectionsByRole.system_admin

export default function Sidebar() {
  const { user } = useAuth()
  const { unreadCount, messageUnreadCount } = useNotifications()
  const { sidebarCollapsed: rail } = useTheme()
  if (!user) return null

  const sections = navSectionsByRole[user.role]

  function badgeCount(badge?: 'notif' | 'msg') {
    if (badge === 'notif') return unreadCount
    if (badge === 'msg')   return messageUnreadCount
    return 0
  }

  return (
    <aside className={clsx(
      'flex flex-col flex-shrink-0 py-5 gap-5 transition-[width] duration-200',
      rail ? 'w-20 items-center' : 'w-64 px-4',
    )}>
      {/* Brand mark */}
      <div className={clsx('flex items-center gap-3 flex-shrink-0', !rail && 'px-2')}>
        <div className="w-11 h-11 sp-squircle-md bg-[var(--sp-primary)] flex items-center justify-center flex-shrink-0">
          <GraduationCap size={20} className="text-[var(--sp-on-primary)]" />
        </div>
        {!rail && <span className="text-lg font-bold tracking-tight text-[var(--sp-text)] truncate">SmartPass</span>}
      </div>

      {/* Icon rail — sections become spacing + a hairline divider, since the
          section labels have no room to live in a rail this narrow.
          Deliberately NOT scrollable: any overflow value other than `visible`
          creates a clipping context and eats the hover labels (a single
          non-visible axis forces the other one to compute to `auto` too).
          The tallest role, SysAdmin, is 12 items ≈ 660px including the brand,
          which fits comfortably. */}
      <nav className={clsx('flex-1 flex flex-col gap-1 w-full', rail && 'items-center')}>
        {sections.map((section, si) => (
          <div key={section.label} className={clsx('flex flex-col gap-1 w-full', rail && 'items-center')}>
            {rail
              ? si > 0 && <div className="w-6 h-px bg-[var(--sp-border)] my-1" aria-hidden="true" />
              : <p className="px-3 mt-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--sp-text-muted)]">
                  {section.label}
                </p>}
            {section.items.map(item => {
              const count = badgeCount(item.badge)
              return (
                <NavLink
                  key={item.label + item.to}
                  to={item.to}
                  aria-label={item.label}
                  title={rail ? item.label : undefined}
                  className={({ isActive }) =>
                    clsx(
                      'group relative flex items-center sp-squircle-md transition-colors',
                      rail ? 'justify-center w-11 h-11' : 'gap-3 px-3 py-2.5 w-full',
                      isActive
                        ? 'bg-[var(--sp-primary)] text-[var(--sp-on-primary)]'
                        : 'text-[var(--sp-text-muted)] hover:bg-[var(--sp-hover-bg)] hover:text-[var(--sp-text)]'
                    )
                  }
                >
                  <item.icon size={19} className="flex-shrink-0" />

                  {!rail && <span className="flex-1 text-sm font-medium truncate">{item.label}</span>}

                  {/* Rail: unread is a corner dot, since a sibling pill would
                      force the rail wider than the icon. Expanded: a real count. */}
                  {count > 0 && (rail ? (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[var(--sp-bg)]" />
                  ) : (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {count > 99 ? '99+' : count}
                    </span>
                  ))}

                  {/* Hover/focus label — only needed when there's no visible text. */}
                  {rail && (
                    <span
                      className="sp-rail-label pointer-events-none absolute left-full ml-3 z-50
                                 whitespace-nowrap sp-squircle-sm bg-[var(--sp-text)]
                                 text-[var(--sp-bg)] px-2.5 py-1.5 text-xs font-semibold"
                    >
                      {item.label}
                      {count > 0 && ` (${count > 99 ? '99+' : count})`}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
