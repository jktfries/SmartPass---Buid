import api from './axios'

export interface AcademicYear { id: number; label: string; is_active: boolean; terms_count?: number }
export interface Term { id: number; label: string; academic_year_id: number; start_date: string | null; end_date: string | null; is_active: boolean; academic_year?: AcademicYear }
export interface Department { id: number; code: string; name: string; programs_count?: number }
export interface Program { id: number; department_id: number; code: string; name: string; department?: Department }
export interface Section { id: number; program_id: number; name: string; year_level: number; program?: Program }
export interface Course { id: number; department_id: number; code: string; name: string; units: number; department?: Department }

export interface ClassSectionItem {
  id: number
  course_code: string
  course_name: string
  section: string
  term: string
  professor_id: number
  professor_name: string
  room: string | null
  schedule_days: string
  time_start: string
  time_end: string
  late_threshold_minutes: number
  threshold: { warning_absences: number; critical_absences: number; warning_lates: number; critical_lates: number } | null
}

export const academicApi = {
  // Academic years
  getAcademicYears: () => api.get<AcademicYear[]>('/academic/academic-years'),
  createAcademicYear: (data: { label: string; is_active?: boolean }) => api.post<AcademicYear>('/academic/academic-years', data),
  updateAcademicYear: (id: number, data: Partial<AcademicYear>) => api.put<AcademicYear>(`/academic/academic-years/${id}`, data),
  deleteAcademicYear: (id: number) => api.delete(`/academic/academic-years/${id}`),

  // Terms
  getTerms: () => api.get<Term[]>('/academic/terms'),
  createTerm: (data: { label: string; academic_year_id: number; start_date?: string; end_date?: string; is_active?: boolean }) => api.post<Term>('/academic/terms', data),
  updateTerm: (id: number, data: Partial<Term>) => api.put<Term>(`/academic/terms/${id}`, data),
  deleteTerm: (id: number) => api.delete(`/academic/terms/${id}`),

  // Departments
  getDepartments: () => api.get<Department[]>('/academic/departments'),
  createDepartment: (data: { code: string; name: string }) => api.post<Department>('/academic/departments', data),
  updateDepartment: (id: number, data: Partial<Department>) => api.put<Department>(`/academic/departments/${id}`, data),
  deleteDepartment: (id: number) => api.delete(`/academic/departments/${id}`),

  // Programs
  getPrograms: () => api.get<Program[]>('/academic/programs'),
  createProgram: (data: { department_id: number; code: string; name: string }) => api.post<Program>('/academic/programs', data),
  deleteProgram: (id: number) => api.delete(`/academic/programs/${id}`),

  // Sections
  getSections: () => api.get<Section[]>('/academic/sections'),
  createSection: (data: { program_id: number; name: string; year_level: number }) => api.post<Section>('/academic/sections', data),
  deleteSection: (id: number) => api.delete(`/academic/sections/${id}`),

  // Courses
  getCourses: () => api.get<Course[]>('/academic/courses'),
  createCourse: (data: { department_id: number; code: string; name: string; units: number }) => api.post<Course>('/academic/courses', data),
  deleteCourse: (id: number) => api.delete(`/academic/courses/${id}`),

  // Class sections
  getClassSections: () => api.get<ClassSectionItem[]>('/academic/class-sections'),
  createClassSection: (data: Record<string, unknown>) => api.post<ClassSectionItem>('/academic/class-sections', data),
  updateClassSection: (id: number, data: Record<string, unknown>) => api.put<ClassSectionItem>(`/academic/class-sections/${id}`, data),
  deleteClassSection: (id: number) => api.delete(`/academic/class-sections/${id}`),
  updateThreshold: (id: number, data: Record<string, number>) => api.put(`/academic/class-sections/${id}/threshold`, data),
}
