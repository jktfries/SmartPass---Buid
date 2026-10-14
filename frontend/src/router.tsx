import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { User } from '@/api/auth'
import type { ReactNode } from 'react'

import LoginPage from '@/pages/auth/LoginPage'
import StudentDashboard from '@/pages/student/StudentDashboard'
import StudentAttendance from '@/pages/student/StudentAttendance'
import StudentWellness from '@/pages/student/StudentWellness'
import StudentAppointments from '@/pages/student/StudentAppointments'
import ProfessorDashboard from '@/pages/professor/ProfessorDashboard'
import ProfessorClasses from '@/pages/professor/ProfessorClasses'
import ClassAttendance from '@/pages/professor/ClassAttendance'
import CounselorDashboard from '@/pages/counselor/CounselorDashboard'
import CounselorWellnessLogs from '@/pages/counselor/CounselorWellnessLogs'
import CounselorAppointments from '@/pages/counselor/CounselorAppointments'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import SysAdminDashboard from '@/pages/sysadmin/SysAdminDashboard'
import AccountsManager from '@/pages/sysadmin/AccountsManager'
import AcademicStructure from '@/pages/sysadmin/AcademicStructure'
import EnrollmentManager from '@/pages/sysadmin/EnrollmentManager'
import AppShell from '@/components/layout/AppShell'
import NotificationsPage from '@/pages/NotificationsPage'
import MessagesPage from '@/pages/MessagesPage'
import AccountPage from '@/pages/AccountPage'
import AuditLogsPage from '@/pages/sysadmin/AuditLogsPage'
import SystemSettings from '@/pages/sysadmin/SystemSettings'
import ApprovalCenter from '@/pages/superadmin/ApprovalCenter'
import TicketsPage from '@/pages/TicketsPage'
import MaintenancePage from '@/pages/MaintenancePage'

function roleDashboard(role: User['role']) {
  const map: Record<User['role'], string> = {
    student:            '/student/dashboard',
    professor:          '/professor/dashboard',
    guidance_counselor: '/counselor/dashboard',
    admin_exec:         '/admin/dashboard',
    system_admin:       '/sysadmin/dashboard',
    super_admin:        '/sysadmin/dashboard',   // unified — no separate super_admin dashboard
  }
  return map[role]
}

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles: User['role'][] }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) return <Navigate to={roleDashboard(user.role)} replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  // Outside ProtectedRoute on purpose: during maintenance the auth check itself
  // 503s, so a guarded route would bounce straight back to /login and lose the
  // explanation.
  { path: '/maintenance', element: <MaintenancePage /> },
  {
    path: '/',
    element: <ProtectedRoute allowedRoles={['student','professor','guidance_counselor','admin_exec','system_admin','super_admin']}><AppShell /></ProtectedRoute>,
    children: [
      { index: true, element: <RootRedirect /> },
      { path: 'student/dashboard', element: <ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute> },
      { path: 'student/attendance', element: <ProtectedRoute allowedRoles={['student']}><StudentAttendance /></ProtectedRoute> },
      { path: 'student/wellness', element: <ProtectedRoute allowedRoles={['student']}><StudentWellness /></ProtectedRoute> },
      { path: 'student/appointments', element: <ProtectedRoute allowedRoles={['student']}><StudentAppointments /></ProtectedRoute> },
      { path: 'professor/dashboard', element: <ProtectedRoute allowedRoles={['professor']}><ProfessorDashboard /></ProtectedRoute> },
      { path: 'professor/classes', element: <ProtectedRoute allowedRoles={['professor']}><ProfessorClasses /></ProtectedRoute> },
      { path: 'professor/class/:id/attendance', element: <ProtectedRoute allowedRoles={['professor']}><ClassAttendance /></ProtectedRoute> },
      { path: 'counselor/dashboard',     element: <ProtectedRoute allowedRoles={['guidance_counselor']}><CounselorDashboard /></ProtectedRoute> },
      { path: 'counselor/wellness-logs', element: <ProtectedRoute allowedRoles={['guidance_counselor']}><CounselorWellnessLogs /></ProtectedRoute> },
      { path: 'counselor/appointments',  element: <ProtectedRoute allowedRoles={['guidance_counselor']}><CounselorAppointments /></ProtectedRoute> },
      { path: 'admin/dashboard', element: <ProtectedRoute allowedRoles={['admin_exec']}><AdminDashboard /></ProtectedRoute> },
      // ── Unified Admin (system_admin + super_admin share the same panel) ──────
      { path: 'sysadmin/dashboard',  element: <ProtectedRoute allowedRoles={['system_admin','super_admin']}><SysAdminDashboard /></ProtectedRoute> },
      { path: 'sysadmin/accounts',   element: <ProtectedRoute allowedRoles={['system_admin','super_admin']}><AccountsManager /></ProtectedRoute> },
      { path: 'sysadmin/academic',   element: <ProtectedRoute allowedRoles={['system_admin','super_admin','admin_exec']}><AcademicStructure /></ProtectedRoute> },
      { path: 'sysadmin/enrollment', element: <ProtectedRoute allowedRoles={['system_admin','super_admin','admin_exec']}><EnrollmentManager /></ProtectedRoute> },
      { path: 'sysadmin/approvals',  element: <ProtectedRoute allowedRoles={['system_admin','super_admin']}><ApprovalCenter /></ProtectedRoute> },
      { path: 'sysadmin/audit-logs', element: <ProtectedRoute allowedRoles={['system_admin','super_admin']}><AuditLogsPage /></ProtectedRoute> },
      { path: 'sysadmin/settings',   element: <ProtectedRoute allowedRoles={['system_admin','super_admin']}><SystemSettings /></ProtectedRoute> },
      // Legacy super_admin URLs → redirect to unified panel
      { path: 'superadmin/dashboard', element: <Navigate to="/sysadmin/dashboard" replace /> },
      { path: 'superadmin/approvals', element: <Navigate to="/sysadmin/approvals" replace /> },
      // ── Universal pages — all authenticated roles ─────────────────────────
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'messages',      element: <MessagesPage /> },
      { path: 'account',       element: <AccountPage /> },
      { path: 'tickets',       element: <TicketsPage /> },
    ],
  },
  { path: '*', element: <RootRedirect /> },
])

// Also serves as the catch-all: an unknown path should return an authenticated
// user to their own dashboard, not dump them on the login screen (which reads
// as an unexpected logout).
function RootRedirect() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={roleDashboard(user.role)} replace />
}
