import api from './axios'

export interface WellnessLogItem {
  id: number
  mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible'
  risk_level: 'normal' | 'struggling' | 'critical'
  contributing_factors: string[] | null
  notes: string | null
  logged_at: string
  reviewed_at: string | null
  counselor_notes: string | null
  // counselor-view extras
  student_id?: string
  student_name?: string
  is_multimodal?: boolean
}

export interface AppointmentItem {
  id: number
  student_id: string
  student_name: string | null
  counselor_id: number
  counselor_name: string | null
  wellness_log_id: number | null
  scheduled_at: string
  rescheduled_to: string | null
  duration_minutes: number
  status: 'Pending' | 'Approved' | 'Declined' | 'Rescheduled' | 'Completed' | 'Cancelled'
  reason: string | null
  notes: string | null
  created_at: string
}

export interface MultimodalPayload {
  user_validated_feeling: 'excellent' | 'good' | 'neutral' | 'struggling' | 'critical'
  notes?: string
  wants_counselor_meeting?: boolean
  facial_emotion?: string
  facial_confidence?: number
  facial_microexpressions?: Record<string, number>
  voice_emotion?: string
  voice_confidence?: number
  voice_features?: Record<string, number>
  multimodal_consistency?: 'high' | 'medium' | 'low' | 'single_mode'
  ai_summary?: string
}

export const wellnessApi = {
  // Student
  getLogs: () => api.get<WellnessLogItem[]>('/student/wellness'),
  submitLog: (data: { mood: string; contributing_factors?: string[]; notes?: string }) =>
    api.post<WellnessLogItem>('/student/wellness', data),
  submitMultimodalLog: (data: MultimodalPayload) =>
    api.post<WellnessLogItem>('/student/wellness/multimodal', data),
  updateLog: (id: number, data: { mood: string; contributing_factors?: string[]; notes?: string }) =>
    api.patch<WellnessLogItem>(`/student/wellness/${id}`, data),
  deleteLog: (id: number) =>
    api.delete(`/student/wellness/${id}`),

  getStudentAppointments: () => api.get<AppointmentItem[]>('/student/appointments'),
  requestAppointment: (data: { scheduled_at: string; reason?: string; wellness_log_id?: number }) =>
    api.post<AppointmentItem>('/student/appointments', data),
  cancelAppointment: (id: number) => api.patch(`/student/appointments/${id}/cancel`),

  // Counselor
  getCounselorLogs: (params?: { risk_level?: string; unreviewed?: boolean; page?: number }) =>
    api.get<{ data: WellnessLogItem[]; total: number; last_page: number }>('/counselor/wellness-logs', { params }),
  reviewLog: (id: number, data: { counselor_notes?: string; risk_level?: string }) =>
    api.patch(`/counselor/wellness-logs/${id}/review`, data),

  getCounselorAppointments: (params?: { status?: string }) =>
    api.get<AppointmentItem[]>('/counselor/appointments', { params }),
  updateAppointmentStatus: (id: number, data: { status: string; notes?: string; rescheduled_to?: string }) =>
    api.patch(`/counselor/appointments/${id}`, data),
}
