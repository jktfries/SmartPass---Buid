import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { academicApi } from '@/api/academic'
import type { AcademicYear, Term, Department, Program, Section, Course, ClassSectionItem } from '@/api/academic'
import { adminApi } from '@/api/admin'
import type { UserRow } from '@/api/admin'
import Tabs from '@/components/ui/Tabs'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import FormField from '@/components/ui/FormField'
import Table from '@/components/ui/Table'

type Tab = 'years' | 'terms' | 'depts' | 'programs' | 'sections' | 'courses' | 'classes'
const TABS: { key: Tab; label: string }[] = [
  { key: 'years',    label: 'Academic Years' },
  { key: 'terms',    label: 'Terms' },
  { key: 'depts',    label: 'Departments' },
  { key: 'programs', label: 'Programs' },
  { key: 'sections', label: 'Sections' },
  { key: 'courses',  label: 'Courses' },
  { key: 'classes',  label: 'Class Sections' },
]

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="text-xs text-red-500 hover:underline">Delete</button>
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>
}

// ─── Academic Years ─────────────────────────────────────────────────────────

function AcademicYearsTab() {
  const [items, setItems] = useState<AcademicYear[]>([])
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const load = () => academicApi.getAcademicYears().then(r => setItems(r.data))
  useEffect(() => { load() }, [])

  async function add() {
    if (!label.trim()) return
    setSaving(true)
    await academicApi.createAcademicYear({ label }).catch(() => {})
    setLabel(''); setSaving(false); load()
  }
  async function setActive(id: number) {
    await academicApi.updateAcademicYear(id, { is_active: true }).catch(() => {})
    load()
  }
  async function del(id: number) {
    if (!window.confirm('Delete this academic year?')) return
    await academicApi.deleteAcademicYear(id).catch(() => {})
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. 2025-2026" className="input-field max-w-xs" />
        <Button onClick={add} disabled={saving}>Add</Button>
      </div>
      <Table headers={['Label','Terms','Status','Actions']} empty={items.length === 0} emptyMessage="No records.">
        {items.map(y => (
          <tr key={y.id} className="hover:bg-[var(--sp-subtle)]">
            <td className="px-4 py-3 font-medium text-[var(--sp-text)]">{y.label}</td>
            <td className="px-4 py-3 text-[var(--sp-text-muted)]">{y.terms_count ?? 0}</td>
            <td className="px-4 py-3"><StatusBadge active={y.is_active} /></td>
            <td className="px-4 py-3">
              <div className="flex gap-3">
                {!y.is_active && <button onClick={() => setActive(y.id)} className="text-xs text-sky-600 hover:underline">Set Active</button>}
                <DeleteBtn onClick={() => del(y.id)} />
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

// ─── Terms ──────────────────────────────────────────────────────────────────

function TermsTab() {
  const [years, setYears] = useState<AcademicYear[]>([])
  const [items, setItems] = useState<Term[]>([])
  const [form, setForm] = useState({ label: '', academic_year_id: '', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)
  const load = () => Promise.all([academicApi.getTerms(), academicApi.getAcademicYears()]).then(([t, y]) => { setItems(t.data); setYears(y.data) })
  useEffect(() => { load() }, [])

  async function add() {
    if (!form.label || !form.academic_year_id) return
    setSaving(true)
    await academicApi.createTerm({ label: form.label, academic_year_id: +form.academic_year_id, start_date: form.start_date || undefined, end_date: form.end_date || undefined }).catch(() => {})
    setForm({ label: '', academic_year_id: '', start_date: '', end_date: '' }); setSaving(false); load()
  }
  async function setActive(id: number) { await academicApi.updateTerm(id, { is_active: true }).catch(() => {}); load() }
  async function del(id: number) { if (!window.confirm('Delete term?')) return; await academicApi.deleteTerm(id).catch(() => {}); load() }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FormField label="Year">
          <select value={form.academic_year_id} onChange={e => setForm(f => ({...f, academic_year_id: e.target.value}))} className="input-field w-40">
            <option value="">— Select —</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </FormField>
        <FormField label="Label">
          <input value={form.label} onChange={e => setForm(f => ({...f, label: e.target.value}))} placeholder="e.g. 1st Semester" className="input-field w-48" />
        </FormField>
        <FormField label="Start">
          <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} className="input-field w-40" />
        </FormField>
        <FormField label="End">
          <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} className="input-field w-40" />
        </FormField>
        <Button onClick={add} disabled={saving}>Add</Button>
      </div>
      <Table headers={['Year','Label','Dates','Status','Actions']} empty={items.length === 0} emptyMessage="No records.">
        {items.map(t => (
          <tr key={t.id} className="hover:bg-[var(--sp-subtle)]">
            <td className="px-4 py-3 text-[var(--sp-text-muted)]">{t.academic_year?.label}</td>
            <td className="px-4 py-3 font-medium text-[var(--sp-text)]">{t.label}</td>
            <td className="px-4 py-3 text-[var(--sp-text-muted)] text-xs">{t.start_date ?? '—'} → {t.end_date ?? '—'}</td>
            <td className="px-4 py-3"><StatusBadge active={t.is_active} /></td>
            <td className="px-4 py-3">
              <div className="flex gap-3">
                {!t.is_active && <button onClick={() => setActive(t.id)} className="text-xs text-sky-600 hover:underline">Set Active</button>}
                <DeleteBtn onClick={() => del(t.id)} />
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

// ─── Departments ─────────────────────────────────────────────────────────────

function DepartmentsTab() {
  const [items, setItems] = useState<Department[]>([])
  const [form, setForm] = useState({ code: '', name: '' })
  const [saving, setSaving] = useState(false)
  const load = () => academicApi.getDepartments().then(r => setItems(r.data))
  useEffect(() => { load() }, [])
  async function add() {
    if (!form.code || !form.name) return; setSaving(true)
    await academicApi.createDepartment(form).catch(() => {})
    setForm({ code: '', name: '' }); setSaving(false); load()
  }
  async function del(id: number) { if (!window.confirm('Delete department?')) return; await academicApi.deleteDepartment(id).catch(() => {}); load() }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <FormField label="Code"><input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))} placeholder="CS" className="input-field w-24" /></FormField>
        <FormField label="Name"><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Computer Science" className="input-field w-64" /></FormField>
        <Button onClick={add} disabled={saving}>Add</Button>
      </div>
      <Table headers={['Code','Name','Programs','Actions']} empty={items.length === 0} emptyMessage="No records.">
        {items.map(d => (
          <tr key={d.id} className="hover:bg-[var(--sp-subtle)]">
            <td className="px-4 py-3"><span className="font-mono font-semibold text-[var(--sp-primary)]">{d.code}</span></td>
            <td className="px-4 py-3 text-[var(--sp-text)]">{d.name}</td>
            <td className="px-4 py-3 text-[var(--sp-text)]">{d.programs_count ?? 0}</td>
            <td className="px-4 py-3"><DeleteBtn onClick={() => del(d.id)} /></td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

// ─── Programs ─────────────────────────────────────────────────────────────

function ProgramsTab() {
  const [depts, setDepts] = useState<Department[]>([])
  const [items, setItems] = useState<Program[]>([])
  const [form, setForm] = useState({ department_id: '', code: '', name: '' })
  const [saving, setSaving] = useState(false)
  const load = () => Promise.all([academicApi.getPrograms(), academicApi.getDepartments()]).then(([p, d]) => { setItems(p.data); setDepts(d.data) })
  useEffect(() => { load() }, [])
  async function add() {
    if (!form.department_id || !form.code || !form.name) return; setSaving(true)
    await academicApi.createProgram({ department_id: +form.department_id, code: form.code, name: form.name }).catch(() => {})
    setForm({ department_id: '', code: '', name: '' }); setSaving(false); load()
  }
  async function del(id: number) { if (!window.confirm('Delete program?')) return; await academicApi.deleteProgram(id).catch(() => {}); load() }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FormField label="Department">
          <select value={form.department_id} onChange={e => setForm(f => ({...f, department_id: e.target.value}))} className="input-field w-40">
            <option value="">— Select —</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
          </select>
        </FormField>
        <FormField label="Code"><input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))} placeholder="BSCS" className="input-field w-28" /></FormField>
        <FormField label="Name"><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="BS Computer Science" className="input-field w-64" /></FormField>
        <Button onClick={add} disabled={saving}>Add</Button>
      </div>
      <Table headers={['Dept','Code','Name','Actions']} empty={items.length === 0} emptyMessage="No records.">
        {items.map(p => (
          <tr key={p.id} className="hover:bg-[var(--sp-subtle)]">
            <td className="px-4 py-3 text-[var(--sp-text-muted)]">{p.department?.code ?? '—'}</td>
            <td className="px-4 py-3"><span className="font-mono font-semibold text-sky-600">{p.code}</span></td>
            <td className="px-4 py-3 text-[var(--sp-text)]">{p.name}</td>
            <td className="px-4 py-3"><DeleteBtn onClick={() => del(p.id)} /></td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

// ─── Sections ─────────────────────────────────────────────────────────────

function SectionsTab() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [items, setItems] = useState<Section[]>([])
  const [form, setForm] = useState({ program_id: '', name: '', year_level: '1' })
  const [saving, setSaving] = useState(false)
  const load = () => Promise.all([academicApi.getSections(), academicApi.getPrograms()]).then(([s, p]) => { setItems(s.data); setPrograms(p.data) })
  useEffect(() => { load() }, [])
  async function add() {
    if (!form.program_id || !form.name) return; setSaving(true)
    await academicApi.createSection({ program_id: +form.program_id, name: form.name, year_level: +form.year_level }).catch(() => {})
    setForm({ program_id: '', name: '', year_level: '1' }); setSaving(false); load()
  }
  async function del(id: number) { if (!window.confirm('Delete section?')) return; await academicApi.deleteSection(id).catch(() => {}); load() }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FormField label="Program">
          <select value={form.program_id} onChange={e => setForm(f => ({...f, program_id: e.target.value}))} className="input-field w-40">
            <option value="">— Select —</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </FormField>
        <FormField label="Section Name"><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="CS-3A" className="input-field w-32" /></FormField>
        <FormField label="Year Level">
          <select value={form.year_level} onChange={e => setForm(f => ({...f, year_level: e.target.value}))} className="input-field w-24">
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </FormField>
        <Button onClick={add} disabled={saving}>Add</Button>
      </div>
      <Table headers={['Program','Section','Year Level','Actions']} empty={items.length === 0} emptyMessage="No records.">
        {items.map(s => (
          <tr key={s.id} className="hover:bg-[var(--sp-subtle)]">
            <td className="px-4 py-3 text-[var(--sp-text-muted)]">{s.program?.code ?? '—'}</td>
            <td className="px-4 py-3"><span className="font-semibold text-[var(--sp-text)]">{s.name}</span></td>
            <td className="px-4 py-3 text-[var(--sp-text)]">Year {s.year_level}</td>
            <td className="px-4 py-3"><DeleteBtn onClick={() => del(s.id)} /></td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

// ─── Courses ─────────────────────────────────────────────────────────────

function CoursesTab() {
  const [depts, setDepts] = useState<Department[]>([])
  const [items, setItems] = useState<Course[]>([])
  const [form, setForm] = useState({ department_id: '', code: '', name: '', units: '3' })
  const [saving, setSaving] = useState(false)
  const load = () => Promise.all([academicApi.getCourses(), academicApi.getDepartments()]).then(([c, d]) => { setItems(c.data); setDepts(d.data) })
  useEffect(() => { load() }, [])
  async function add() {
    if (!form.department_id || !form.code || !form.name) return; setSaving(true)
    await academicApi.createCourse({ department_id: +form.department_id, code: form.code, name: form.name, units: +form.units }).catch(() => {})
    setForm({ department_id: '', code: '', name: '', units: '3' }); setSaving(false); load()
  }
  async function del(id: number) { if (!window.confirm('Delete course?')) return; await academicApi.deleteCourse(id).catch(() => {}); load() }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FormField label="Department">
          <select value={form.department_id} onChange={e => setForm(f => ({...f, department_id: e.target.value}))} className="input-field w-36">
            <option value="">— Select —</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
          </select>
        </FormField>
        <FormField label="Code"><input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))} placeholder="CS301" className="input-field w-28" /></FormField>
        <FormField label="Name"><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Data Structures" className="input-field w-64" /></FormField>
        <FormField label="Units">
          <select value={form.units} onChange={e => setForm(f => ({...f, units: e.target.value}))} className="input-field w-20">
            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </FormField>
        <Button onClick={add} disabled={saving}>Add</Button>
      </div>
      <Table headers={['Dept','Code','Course Name','Units','Actions']} empty={items.length === 0} emptyMessage="No records.">
        {items.map(c => (
          <tr key={c.id} className="hover:bg-[var(--sp-subtle)]">
            <td className="px-4 py-3 text-[var(--sp-text-muted)]">{c.department?.code ?? '—'}</td>
            <td className="px-4 py-3"><span className="font-mono font-semibold text-[var(--sp-primary)]">{c.code}</span></td>
            <td className="px-4 py-3 text-[var(--sp-text)]">{c.name}</td>
            <td className="px-4 py-3 text-[var(--sp-text)]">{c.units}</td>
            <td className="px-4 py-3"><DeleteBtn onClick={() => del(c.id)} /></td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

// ─── Class Sections ─────────────────────────────────────────────────────────

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat']

function ClassSectionsTab({ autoOpen }: { autoOpen?: boolean }) {
  const [items, setItems] = useState<ClassSectionItem[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [terms, setTerms] = useState<import('@/api/academic').Term[]>([])
  const [professors, setProfessors] = useState<UserRow[]>([])
  const [showForm, setShowForm] = useState(!!autoOpen)
  const [form, setForm] = useState({ course_id: '', section_id: '', term_id: '', professor_id: '', room: '', schedule_days: [] as string[], time_start: '', time_end: '', late_threshold_minutes: '15' })
  const [saving, setSaving] = useState(false)

  const load = () => Promise.all([
    academicApi.getClassSections(),
    academicApi.getCourses(),
    academicApi.getSections(),
    academicApi.getTerms(),
    // getUsers hits /sysadmin/users, which is gated to system_admin — an
    // admin_exec gets 403 here. Without this catch the whole Promise.all
    // rejected and setItems never ran, so the table rendered "No class
    // sections" for that role even though /academic/class-sections had
    // returned all of them. The professor list only populates the create
    // form's dropdown, so losing it must not blank the table.
    adminApi.getUsers('professor').catch(() => ({ data: [] as UserRow[] })),
  ]).then(([cs, c, s, t, u]) => { setItems(cs.data); setCourses(c.data); setSections(s.data); setTerms(t.data); setProfessors(u.data) })

  useEffect(() => { load() }, [])

  function toggleDay(d: string) {
    setForm(f => ({ ...f, schedule_days: f.schedule_days.includes(d) ? f.schedule_days.filter(x => x !== d) : [...f.schedule_days, d] }))
  }

  async function handleSubmit() {
    if (!form.course_id || !form.section_id || !form.term_id || !form.professor_id || form.schedule_days.length === 0 || !form.time_start || !form.time_end) return
    setSaving(true)
    await academicApi.createClassSection({
      course_id: +form.course_id, section_id: +form.section_id, term_id: +form.term_id,
      professor_id: +form.professor_id, room: form.room || null,
      schedule_days: form.schedule_days.join(','),
      time_start: form.time_start, time_end: form.time_end,
      late_threshold_minutes: +form.late_threshold_minutes,
    }).catch(() => {})
    setForm({ course_id: '', section_id: '', term_id: '', professor_id: '', room: '', schedule_days: [], time_start: '', time_end: '', late_threshold_minutes: '15' })
    setSaving(false); setShowForm(false); load()
  }

  async function del(id: number) { if (!window.confirm('Delete class section?')) return; await academicApi.deleteClassSection(id).catch(() => {}); load() }

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowForm(s => !s)} variant={showForm ? 'secondary' : 'primary'}>
        {showForm ? 'Cancel' : '+ New Class Section'}
      </Button>

      {showForm && (
        <div className="sp-squircle-lg bg-[var(--sp-surface)] p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Course">
              <select value={form.course_id} onChange={e => setForm(f => ({...f, course_id: e.target.value}))} className="input-field">
                <option value="">— Select —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Section">
              <select value={form.section_id} onChange={e => setForm(f => ({...f, section_id: e.target.value}))} className="input-field">
                <option value="">— Select —</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name} (Yr {s.year_level})</option>)}
              </select>
            </FormField>
            <FormField label="Term">
              <select value={form.term_id} onChange={e => setForm(f => ({...f, term_id: e.target.value}))} className="input-field">
                <option value="">— Select —</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.academic_year?.label} – {t.label}</option>)}
              </select>
            </FormField>
            <FormField label="Professor">
              <select value={form.professor_id} onChange={e => setForm(f => ({...f, professor_id: e.target.value}))} className="input-field">
                <option value="">— Select —</option>
                {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
            <FormField label="Room (optional)">
              <input value={form.room} onChange={e => setForm(f => ({...f, room: e.target.value}))} placeholder="CS-LAB-1" className="input-field" />
            </FormField>
            <FormField label="Late Threshold (minutes)">
              <input type="number" min={0} value={form.late_threshold_minutes} onChange={e => setForm(f => ({...f, late_threshold_minutes: e.target.value}))} className="input-field" />
            </FormField>
            <FormField label="Time Start">
              <input type="time" value={form.time_start} onChange={e => setForm(f => ({...f, time_start: e.target.value}))} className="input-field" />
            </FormField>
            <FormField label="Time End">
              <input type="time" value={form.time_end} onChange={e => setForm(f => ({...f, time_end: e.target.value}))} className="input-field" />
            </FormField>
          </div>
          <FormField label="Schedule Days">
            <div className="flex gap-2">
              {DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)} className={`rounded px-3 py-1 text-xs font-semibold border transition-colors ${form.schedule_days.includes(d) ? 'bg-[var(--sp-primary)] text-[var(--sp-on-primary)] border-[var(--sp-primary)]' : 'border-[var(--sp-border)] text-[var(--sp-text-muted)]'}`}>{d}</button>
              ))}
            </div>
          </FormField>
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Create Class Section'}
            </Button>
          </div>
        </div>
      )}

      <Table headers={['Course','Section','Term','Professor','Room','Schedule','Actions']} empty={items.length === 0} emptyMessage="No class sections.">
        {items.map(cs => (
          <tr key={cs.id} className="hover:bg-[var(--sp-subtle)]">
            <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-[var(--sp-primary)]">{cs.course_code}</span><br /><span className="text-[var(--sp-text-muted)]">{cs.course_name}</span></td>
            <td className="px-4 py-3 text-[var(--sp-text)]">{cs.section}</td>
            <td className="px-4 py-3 text-[var(--sp-text-muted)]">{cs.term}</td>
            <td className="px-4 py-3 text-[var(--sp-text-muted)]">{cs.professor_name}</td>
            <td className="px-4 py-3 text-[var(--sp-text-muted)]">{cs.room ?? '—'}</td>
            <td className="px-4 py-3 text-[var(--sp-text-muted)] text-xs">{cs.schedule_days}<br />{cs.time_start.slice(0,5)} – {cs.time_end.slice(0,5)}</td>
            <td className="px-4 py-3"><DeleteBtn onClick={() => del(cs.id)} /></td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AcademicStructure() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab = (TABS.some(t => t.key === tabParam) ? tabParam : 'years') as Tab
  const [tab, setTab] = useState<Tab>(initialTab)
  const autoOpenNew = searchParams.get('new') === '1'

  return (
    <div className="space-y-5">
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'years'    && <AcademicYearsTab />}
      {tab === 'terms'    && <TermsTab />}
      {tab === 'depts'    && <DepartmentsTab />}
      {tab === 'programs' && <ProgramsTab />}
      {tab === 'sections' && <SectionsTab />}
      {tab === 'courses'  && <CoursesTab />}
      {tab === 'classes'  && <ClassSectionsTab autoOpen={autoOpenNew} />}
    </div>
  )
}
