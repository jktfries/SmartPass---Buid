import { Bell, LogOut, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import Avatar from '@/components/ui/Avatar'
import AddMenu from '@/components/sysadmin/AddMenu'

const ROUTE_TITLES: Record<string, string> = {
  '/student/dashboard':      'Dashboard',
  '/student/attendance':     'Attendance',
  '/student/wellness':       'Wellness Check-In',
  '/student/appointments':   'Appointments',
  '/professor/dashboard':    'Dashboard',
  '/professor/classes':      'My Classes',
  '/counselor/dashboard':    'Dashboard',
  '/counselor/wellness-logs':'Wellness Logs',
  '/counselor/appointments': 'Appointments',
  '/admin/dashboard':        'Admin Reports',
  '/sysadmin/dashboard':     'Admin Dashboard',
  '/sysadmin/accounts':      'Accounts',
  '/sysadmin/academic':      'Academic Structure',
  '/sysadmin/enrollment':    'Enrollment',
  '/sysadmin/approvals':     'Approvals',
  '/sysadmin/audit-logs':    'Audit Logs',
  '/sysadmin/settings':      'System Settings',
  '/notifications':          'Notifications',
  '/messages':                'Messages',
  '/account':                 'My Account',
  '/tickets':                  'Support Tickets',
}

function getPageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (pathname.startsWith('/professor/class/')) return 'Class Attendance'
  return ''
}

export default function Topbar() {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()

  // Theme lives in ThemeContext now — it's a per-account preference, so it can't
  // be local component state keyed off a browser-global localStorage flag.
  const { resolvedDark, setPreference } = useTheme()
  const toggleDark = () => setPreference({ theme: resolvedDark ? 'light' : 'dark' })

  const pageTitle = getPageTitle(location.pathname)

  return (
    <header
      className="flex items-center justify-between pb-4 flex-shrink-0"
      style={{ paddingInline: 'var(--sp-page-pad-x)', paddingTop: 'var(--sp-topbar-pad-t)' }}
    >
      <h1 className="text-3xl font-bold tracking-tight text-[var(--sp-text)] truncate">{pageTitle}</h1>
      <div className="flex items-center gap-2">
        {(user?.role === 'system_admin' || user?.role === 'super_admin') && <AddMenu compact />}

        <button
          onClick={toggleDark}
          title={resolvedDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-10 h-10 flex items-center justify-center sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] text-[var(--sp-text-muted)] transition-colors"
        >
          {resolvedDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification bell */}
        <button
          onClick={() => navigate('/notifications')}
          title="Notifications"
          className="relative w-10 h-10 flex items-center justify-center sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] text-[var(--sp-text-muted)] transition-colors"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-[var(--sp-bg)]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Avatar + name — click to go to account page */}
        <button
          onClick={() => navigate('/account')}
          className="flex items-center gap-2.5 sp-squircle-sm pl-1 pr-3 py-1 hover:bg-[var(--sp-hover-bg)] transition-colors"
        >
          {user && <Avatar name={user.name} role={user.role} url={user.avatar_url} size="sm" />}
          <span className="text-sm font-medium text-[var(--sp-text)] hidden sm:block max-w-[120px] truncate">
            {user?.nickname || user?.name}
          </span>
        </button>

        <button
          onClick={logout}
          className="w-10 h-10 flex items-center justify-center sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 text-[var(--sp-text-muted)] transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
