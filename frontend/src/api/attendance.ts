import api from './axios'

export interface AttendanceRecord {
  id: number
  date: string
  status: 'present' | 'late' | 'absent' | 'excused'
  remarks?: string
}

export interface AttendanceSummary {
  class_section_id: number
  course_code: string
  course_name: string
  schedule_days: string
  time_start: string
  time_end: string
  room: string | null
  total_sessions: number
  present: number
  late: number
  absent: number
  excused: number
  attendance_rate: number
  records?: AttendanceRecord[]
}

export interface StudentDashboardData {
  student_id: string
  name: string
  program: string
  section: string
  summaries: AttendanceSummary[]
  overall_present: number
  overall_absent: number
  overall_late: number
  overall_attendance_rate: number
}

export interface ClassSectionSummary {
  id: number
  course_code: string
  course_name: string
  section: string
  room: string | null
  schedule_days: string
  time_start: string
  time_end: string
  term: string
  enrolled_count: number
}

export interface ProfessorClassAttendance {
  class_section: ClassSectionSummary & { term: string }
  students: {
    student_id: string
    name: string
    present: number
    late: number
    absent: number
    attendance_rate: number
    records: { date: string; status: string }[]
  }[]
}

export const attendanceApi = {
  getStudentDashboard: () =>
    api.get<StudentDashboardData>('/student/dashboard'),

  getStudentAttendance: () =>
    api.get<AttendanceSummary[]>('/student/attendance'),

  /** Demo-only: student taps their own card for a course they're enrolled in. */
  studentSimulateScan: (classSectionId: number) =>
    api.post<{ success: boolean; message?: string; status?: string; course?: string; date?: string }>(
      '/student/attendance/simulate-scan',
      { class_section_id: classSectionId }
    ),

  getProfessorClassSections: () =>
    api.get<ClassSectionSummary[]>('/professor/class-sections'),

  getClassAttendance: (id: number) =>
    api.get<ProfessorClassAttendance>(`/professor/class-sections/${id}/attendance`),

  simulateScan: (classSectionId: number, studentId: string) =>
    api.post<{ success: boolean; message?: string; status?: string; name?: string }>(
      `/professor/class-sections/${classSectionId}/attendance/simulate-scan`,
      { student_id: studentId }
    ),

  logAttendance: (classSectionId: number, payload: { student_id: string; date: string; status: string }) =>
    api.post<{ success: boolean; message?: string }>(
      `/professor/class-sections/${classSectionId}/attendance/log`,
      payload
    ),
}
