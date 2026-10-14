import api from './axios'

export interface UserRow {
  id: number
  name: string
  email: string
  role: string
  department: string | null
  is_active: boolean
  deleted_at: string | null
}

export interface StudentRow {
  student_id: string
  user_id: number
  name: string
  email: string
  program: string
  section: string
  rfid_tag: string | null
  year_level: number
}

export interface EnrollmentRow {
  id: number
  class_section_id: number
  status: string
  course_code: string
  course_name: string
  term: string
  schedule_days: string
  time_start: string
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface AttendanceSummary {
  total_students: number; avg_attendance: number; total_absences: number; total_lates: number
}
export interface AttendanceRow {
  student_id: string; student_name: string
  present: number; late: number; absent: number; excused: number; total: number; rate: number
}
export interface WellnessSummary {
  total_logs: number; normal: number; struggling: number; critical: number
}
export interface WellnessFlaggedRow {
  id: number; student_id: string; student_name: string; mood: string; risk_level: string; logged_at: string
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLogItem {
  id: number; actor_id: number | null; actor_name: string; actor_role: string | null
  category: string; severity: 'info' | 'warning' | 'critical'
  action: string; detail: string | null; ip_address: string | null; created_at: string
}

// ─── System Settings ──────────────────────────────────────────────────────────

export interface SettingItem {
  key: string; value: string | null; description: string | null; updated_by: number | null; updated_at: string
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export interface ApprovalItem {
  id: number; type: string; status: 'Pending' | 'Approved' | 'Rejected'
  payload: Record<string, unknown> | null; remarks: string | null
  submitter_name: string | null; submitter_role: string | null
  reviewer_name: string | null; reviewed_at: string | null; submitted_at: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export function triggerCsvDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

export const adminApi = {
  // Users
  getUsers: (role?: string) => api.get<UserRow[]>('/sysadmin/users', { params: role ? { role } : {} }),
  createUser: (data: Record<string, unknown>) => api.post<UserRow>('/sysadmin/users', data),
  updateUser: (id: number, data: Record<string, unknown>) => api.put<UserRow>(`/sysadmin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/sysadmin/users/${id}`),
  restoreUser: (id: number) => api.post(`/sysadmin/users/${id}/restore`),
  resetPassword: (id: number, password: string) => api.post(`/sysadmin/users/${id}/reset-password`, { password }),

  // Students
  getStudents: () => api.get<StudentRow[]>('/sysadmin/students'),
  createStudent: (data: Record<string, unknown>) => api.post('/sysadmin/students', data),
  updateStudent: (studentId: string, data: Record<string, unknown>) => api.put(`/sysadmin/students/${studentId}`, data),

  // Enrollments
  getEnrollmentStudents: () => api.get<{ student_id: string; name: string; program: string; section: string }[]>('/enrollment/students'),
  getStudentEnrollments: (studentId: string) => api.get<EnrollmentRow[]>(`/enrollment/student/${studentId}`),
  enroll: (student_id: string, class_section_id: number) => api.post('/enrollment/', { student_id, class_section_id }),
  dropEnrollment: (id: number) => api.delete(`/enrollment/${id}`),

  // Reports
  getAttendanceReport: () =>
    api.get<{ summary: AttendanceSummary; data: AttendanceRow[] }>('/admin/reports/attendance'),
  getWellnessReport: () =>
    api.get<{ summary: WellnessSummary; recent_flagged: WellnessFlaggedRow[] }>('/admin/reports/wellness'),
  downloadAttendanceCsv: () =>
    api.get('/admin/reports/attendance/csv', { responseType: 'blob' }),
  downloadWellnessCsv: () =>
    api.get('/admin/reports/wellness/csv', { responseType: 'blob' }),

  // Audit logs
  getAuditLogs: (params?: { category?: string; severity?: string; from?: string; to?: string; search?: string; page?: number }) =>
    api.get<{ data: AuditLogItem[]; total: number; last_page: number }>('/sysadmin/audit-logs', { params }),
  downloadAuditCsv: (params?: { category?: string; severity?: string; from?: string; to?: string }) =>
    api.get('/sysadmin/audit-logs/csv', { params, responseType: 'blob' }),

  // Settings
  getSettings: () => api.get<SettingItem[]>('/sysadmin/settings'),
  updateSetting: (key: string, value: string) =>
    api.patch<{ message: string; setting: SettingItem }>(`/sysadmin/settings/${key}`, { value }),

  // Approvals — under /sysadmin, not /superadmin. These moved when approvals
  // stopped being super_admin-only; there is no /superadmin prefix on the API
  // at all, so the old paths 404'd and the page rendered an empty list while
  // the dashboard KPI (which queries the DB directly) kept counting correctly.
  getApprovals: (params?: { status?: string; page?: number }) =>
    api.get<{ data: ApprovalItem[]; total: number; last_page: number }>('/sysadmin/approvals', { params }),
  reviewApproval: (id: number, data: { status: 'Approved' | 'Rejected'; remarks?: string }) =>
    api.patch<{ message: string; approval: ApprovalItem }>(`/sysadmin/approvals/${id}`, data),
  submitApproval: (data: { type: string; payload?: Record<string, unknown> }) =>
    api.post<ApprovalItem>('/sysadmin/approvals', data),
}
