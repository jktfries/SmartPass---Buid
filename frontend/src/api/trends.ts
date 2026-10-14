import api from './axios'

export interface AttendanceWeek {
  week_label: string
  week_start: string
  present: number
  late: number
  absent: number
  rate: number
}

export interface MoodEntry {
  date: string
  mood: string
  mood_score: number
}

export interface StudentTrends {
  weeks: AttendanceWeek[]
  mood_history: MoodEntry[]
}

export interface RiskWeek {
  week_label: string
  week_start: string
  normal: number
  struggling: number
  critical: number
}

export interface CounselorWellnessStats {
  risk_distribution: { normal: number; struggling: number; critical: number }
  total_students: number
  unreviewed_count: number
  critical_count: number
  risk_trend: RiskWeek[]
}

export interface AdminAttendanceWeek {
  week_label: string
  week_start: string
  avg_rate: number
  total_present: number
  total_absent: number
  total_late: number
}

export interface ProgramBreakdown {
  program: string
  avg_rate: number
  total_students: number
}

export interface AdminTrends {
  attendance_trend: AdminAttendanceWeek[]
  wellness_trend: RiskWeek[]
  program_breakdown: ProgramBreakdown[]
}

export const trendsApi = {
  studentTrends: () => api.get<StudentTrends>('/student/dashboard/trends'),
  counselorWellnessStats: () => api.get<CounselorWellnessStats>('/counselor/wellness-stats'),
  adminTrends: () => api.get<AdminTrends>('/admin/reports/trends'),
}
