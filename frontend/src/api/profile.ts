import api from './axios'
import type { UserPreferences } from './auth'

export interface StudentProfile {
  student_id: string
  year_level: number
  section: string | null
  program: string | null
  program_code: string | null
}

export interface FullProfile {
  id: number
  name: string
  nickname: string | null
  email: string
  role: string
  phone: string | null
  bio: string | null
  avatar_url: string | null
  preferences: UserPreferences | null
  student_profile?: StudentProfile
}

export const profileApi = {
  getProfile: () =>
    api.get<FullProfile>('/profile'),

  updateProfile: (data: Partial<Pick<FullProfile, 'name' | 'nickname' | 'phone' | 'bio' | 'email'>> & {
    current_password?: string
    password?: string
    password_confirmation?: string
  }) =>
    api.patch<FullProfile>('/profile', data),

  updatePreferences: (data: UserPreferences) =>
    api.patch<UserPreferences>('/profile/preferences', data),

  uploadAvatar: (file: File) => {
    const fd = new FormData()
    fd.append('avatar', file)
    return api.post<{ avatar_url: string }>('/profile/avatar', fd)
  },

  removeAvatar: () =>
    api.delete<{ avatar_url: null }>('/profile/avatar'),
}
