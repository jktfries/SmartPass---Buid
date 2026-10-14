import api from './axios'

export type ThemeMode = 'light' | 'dark' | 'system'
export type PresetAccent = 'teal' | 'indigo' | 'violet' | 'rose' | 'amber' | 'sky' | 'emerald'
/** A user-chosen hex, e.g. "#7c3aed". */
export type CustomAccent = `#${string}`
export type AccentName = PresetAccent | CustomAccent
export type Density = 'comfortable' | 'compact'

export interface DashboardWidgetPref {
  id: string
  visible: boolean
  /** Columns out of 4. Omitted means "use the registry default". */
  span?: 1 | 2 | 3 | 4
}

export interface UserPreferences {
  theme?: ThemeMode
  accent?: AccentName
  density?: Density
  sidebarCollapsed?: boolean
  dashboard?: Record<string, DashboardWidgetPref[]>
}

export interface User {
  id: number
  name: string
  nickname: string | null
  email: string
  role: 'student' | 'professor' | 'guidance_counselor' | 'admin_exec' | 'system_admin' | 'super_admin'
  department_id: number | null
  student_id?: string
  phone: string | null
  bio: string | null
  avatar_url: string | null
  preferences: UserPreferences | null
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: User }>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<User>('/auth/me'),
}
