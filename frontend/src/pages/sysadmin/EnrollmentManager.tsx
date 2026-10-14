import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import type { EnrollmentRow } from '@/api/admin'
import { academicApi } from '@/api/academic'
import type { ClassSectionItem } from '@/api/academic'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Table from '@/components/ui/Table'

interface StudentItem {
  student_id: string
  name: string
  program: string
  section: string
}

export default function EnrollmentManager() {
  const [students, setStudents] = useState<StudentItem[]>([])
  const [classSections, setClassSections] = useState<ClassSectionItem[]>([])
  const [selected, setSelected] = useState<StudentItem | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const [classToAdd, setClassToAdd] = useState('')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([adminApi.getEnrollmentStudents(), academicApi.getClassSections()])
      .then(([s, cs]) => { setStudents(s.data); setClassSections(cs.data) })
      .finally(() => setLoadingStudents(false))
  }, [])

  function selectStudent(s: StudentItem) {
    setSelected(s); setError(''); loadEnrollments(s.student_id)
  }

  function loadEnrollments(studentId: string) {
    setLoadingEnrollments(true)
    adminApi.getStudentEnrollments(studentId)
      .then(r => setEnrollments(r.data))
      .finally(() => setLoadingEnrollments(false))
  }

  async function enroll() {
    if (!selected || !classToAdd) return
    setAdding(true); setError('')
    try {
      await adminApi.enroll(selected.student_id, +classToAdd)
      setClassToAdd(''); loadEnrollments(selected.student_id)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Enrollment failed')
    } finally { setAdding(false) }
  }

  async function drop(id: number) {
    if (!window.confirm('Drop this enrollment?')) return
    await adminApi.dropEnrollment(id).catch(() => {})
    if (selected) loadEnrollments(selected.student_id)
  }

  const enrolledIds = new Set(enrollments.map(e => e.class_section_id))
  const available = classSections.filter(cs => !enrolledIds.has(cs.id))

  const filteredStudents = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.student_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Student list */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--sp-text-muted)] uppercase tracking-wide">Students</h3>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student…"
            className="input-field"
          />
          <div className="sp-squircle-lg divide-y divide-[var(--sp-border)] max-h-[520px] overflow-y-auto">
            {loadingStudents ? (
              <div className="h-48 animate-pulse bg-[var(--sp-border)]" />
            ) : filteredStudents.map(s => (
              <button
                key={s.student_id}
                onClick={() => selectStudent(s)}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-[var(--sp-subtle)] ${selected?.student_id === s.student_id ? 'bg-[var(--sp-primary-soft-bg)]' : ''}`}
              >
                <div className="font-medium text-sm text-[var(--sp-text)]">{s.name}</div>
                <div className="text-xs text-[var(--sp-text-muted)]">{s.student_id} · {s.program} · {s.section}</div>
              </button>
            ))}
            {filteredStudents.length === 0 && !loadingStudents && (
              <div className="py-8 text-center text-sm text-[var(--sp-text-muted)]">No students found.</div>
            )}
          </div>
        </div>

        {/* Enrollment panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="flex h-48 items-center justify-center sp-squircle-lg border border-dashed border-[var(--sp-border)] text-sm text-[var(--sp-text-muted)]">
              Select a student to manage enrollments
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-base font-semibold text-[var(--sp-text)]">{selected.name}</h3>
                <p className="text-xs text-[var(--sp-text-muted)]">{selected.student_id} · {selected.program} – {selected.section}</p>
              </div>

              {/* Add enrollment */}
              <div className="sp-squircle-lg bg-[var(--sp-surface)] p-4 space-y-3">
                <p className="text-xs font-semibold text-[var(--sp-text-muted)] uppercase tracking-wide">Enroll in Class Section</p>
                {error && <p className="sp-squircle-sm bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <select
                    value={classToAdd}
                    onChange={e => setClassToAdd(e.target.value)}
                    className="input-field flex-1"
                  >
                    <option value="">— Select class section —</option>
                    {available.map(cs => (
                      <option key={cs.id} value={cs.id}>
                        {cs.course_code} | {cs.section} | {cs.term} | {cs.schedule_days} {cs.time_start.slice(0,5)}–{cs.time_end.slice(0,5)} | {cs.professor_name}
                      </option>
                    ))}
                  </select>
                  <Button onClick={enroll} disabled={adding || !classToAdd} className="whitespace-nowrap">
                    {adding ? 'Enrolling…' : 'Enroll'}
                  </Button>
                </div>
              </div>

              {/* Current enrollments */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--sp-text-muted)] uppercase tracking-wide">
                  Current Enrollments ({enrollments.length})
                </p>
                {loadingEnrollments ? (
                  <div className="h-32 animate-pulse bg-[var(--sp-border)] sp-squircle-lg" />
                ) : (
                  <Table headers={['Course','Term','Schedule','Status','Action']} empty={enrollments.length === 0} emptyMessage="No enrollments yet.">
                    {enrollments.map(e => (
                      <tr key={e.id} className="hover:bg-[var(--sp-subtle)]">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-[var(--sp-primary)]">{e.course_code}</span>
                          <br /><span className="text-[var(--sp-text-muted)]">{e.course_name}</span>
                        </td>
                        <td className="px-4 py-3 text-[var(--sp-text-muted)]">{e.term}</td>
                        <td className="px-4 py-3 text-[var(--sp-text-muted)] text-xs">{e.schedule_days}<br />{e.time_start.slice(0,5)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={e.status === 'enrolled' ? 'success' : 'danger'}>{e.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {e.status === 'enrolled' && (
                            <button onClick={() => drop(e.id)} className="text-xs text-red-500 hover:underline">Drop</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
