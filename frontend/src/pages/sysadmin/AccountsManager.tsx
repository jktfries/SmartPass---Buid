import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '@/api/admin'
import type { UserRow } from '@/api/admin'
import { academicApi } from '@/api/academic'
import type { Department, Program, Section } from '@/api/academic'
import { ROLE_LABEL, ROLE_VARIANT } from '@/lib/roles'
import type { User } from '@/api/auth'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import FormField from '@/components/ui/FormField'
import Table from '@/components/ui/Table'
import SkeletonCard from '@/components/ui/SkeletonCard'

const ROLES = ['student','professor','guidance_counselor','admin_exec','system_admin','super_admin'] as const

type ModalMode = 'create' | 'edit' | 'password' | null

interface FormState {
  name: string; email: string; password: string; confirmPassword: string
  role: string; department_id: string; is_active: boolean
  program_id: string; section_id: string; year_level: string; rfid_tag: string
}

const blank: FormState = {
  name: '', email: '', password: '', confirmPassword: '', role: 'professor', department_id: '', is_active: true,
  program_id: '', section_id: '', year_level: '1', rfid_tag: '',
}

// ROLE_LABEL renders system_admin and super_admin identically ("System Admin")
// because the app treats them as one experience — but in a picker that yields
// two indistinguishable options, so super_admin gets its own label here.
const roleOptionLabel = (r: string) => (r === 'super_admin' ? 'Super Admin' : ROLE_LABEL[r as User['role']])

export default function AccountsManager() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [modal, setModal] = useState<ModalMode>(null)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [form, setForm] = useState<FormState>(blank)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      adminApi.getUsers(),
      academicApi.getDepartments(),
      academicApi.getPrograms(),
      academicApi.getSections(),
    ])
      .then(([u, d, p, s]) => { setUsers(u.data); setDepartments(d.data); setPrograms(p.data); setSections(s.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const [searchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('new') === '1') openCreate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = users.filter(u =>
    (!filterRole || u.role === filterRole) &&
    (!search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  )

  function openCreate() { setEditing(null); setForm(blank); setError(''); setModal('create') }
  function openEdit(u: UserRow) { setEditing(u); setForm({ ...blank, name: u.name, email: u.email, role: u.role, is_active: u.is_active }); setError(''); setModal('edit') }
  function openPassword(u: UserRow) { setEditing(u); setForm({ ...blank, password: '', confirmPassword: '' }); setError(''); setModal('password') }
  function closeModal() { setModal(null); setEditing(null); setError('') }

  async function handleSave() {
    setError('')
    if (modal === 'create') {
      if (!form.name || !form.email || !form.password) { setError('Name, email and password are required'); return }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
      if (form.role === 'student' && (!form.program_id || !form.section_id)) {
        setError('Students need a program and a section'); return
      }
    }
    if (modal === 'password') {
      if (!form.password) { setError('Password is required'); return }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    }
    setSaving(true)
    try {
      if (modal === 'create') {
        await adminApi.createUser({
          name: form.name, email: form.email, password: form.password, role: form.role,
          department_id: form.department_id || null,
          ...(form.role === 'student' ? {
            program_id: Number(form.program_id),
            section_id: Number(form.section_id),
            year_level: Number(form.year_level),
            rfid_tag: form.rfid_tag.trim() || null,
          } : {}),
        })
      } else if (modal === 'edit' && editing) {
        await adminApi.updateUser(editing.id, { name: form.name, email: form.email, role: form.role, department_id: form.department_id || null, is_active: form.is_active })
      } else if (modal === 'password' && editing) {
        await adminApi.resetPassword(editing.id, form.password)
      }
      closeModal(); load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'An error occurred')
    } finally { setSaving(false) }
  }

  async function handleDelete(u: UserRow) {
    if (!window.confirm(`Deactivate ${u.name}?`)) return
    await adminApi.deleteUser(u.id)
    load()
  }

  async function handleRestore(u: UserRow) {
    await adminApi.restoreUser(u.id)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--sp-text-muted)]">Create, edit, and manage user accounts.</p>
        <Button onClick={openCreate}>+ New User</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="input-field w-64"
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="input-field w-auto">
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{roleOptionLabel(r)}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonCard rows={5} />
      ) : (
        <Table headers={['Name','Email','Role','Dept','Status','Actions']} empty={filtered.length === 0} emptyMessage="No users found.">
          {filtered.map(u => (
            <tr key={u.id} className={`hover:bg-[var(--sp-subtle)] transition-colors ${u.deleted_at ? 'opacity-50' : ''}`}>
              <td className="px-4 py-3 font-medium text-[var(--sp-text)]">{u.name}</td>
              <td className="px-4 py-3 text-[var(--sp-text-muted)]">{u.email}</td>
              <td className="px-4 py-3">
                <Badge variant={ROLE_VARIANT[u.role as User['role']] ?? 'neutral'}>{ROLE_LABEL[u.role as User['role']] ?? u.role}</Badge>
              </td>
              <td className="px-4 py-3 text-[var(--sp-text-muted)]">{u.department ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge variant={u.is_active && !u.deleted_at ? 'success' : 'danger'}>
                  {u.deleted_at ? 'Deleted' : u.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {!u.deleted_at ? (
                    <>
                      <button onClick={() => openEdit(u)} className="text-xs text-sky-600 hover:underline">Edit</button>
                      <button onClick={() => openPassword(u)} className="text-xs text-amber-600 hover:underline">Password</button>
                      <button onClick={() => handleDelete(u)} className="text-xs text-red-600 hover:underline">Delete</button>
                    </>
                  ) : (
                    <button onClick={() => handleRestore(u)} className="text-xs text-emerald-600 hover:underline">Restore</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'New User' : modal === 'edit' ? 'Edit User' : 'Reset Password'}
          onClose={closeModal}
          footer={<>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>}
        >
          <div className="space-y-3">
            {error && <p className="mb-1 sp-squircle-sm bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            {modal !== 'password' && (
              <>
                <FormField label="Full Name">
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="input-field" />
                </FormField>
                <FormField label="Email">
                  <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="input-field" />
                </FormField>
                <FormField label="Role">
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value, section_id: '' }))}
                    className="input-field"
                    disabled={modal === 'edit' && editing?.role === 'student'}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{roleOptionLabel(r)}</option>)}
                  </select>
                </FormField>

                {modal === 'create' && form.role === 'student' && (
                  <>
                    <FormField label="Program" required hint="The student ID is generated automatically from the program's department.">
                      <select
                        value={form.program_id}
                        onChange={e => setForm(f => ({ ...f, program_id: e.target.value, section_id: '' }))}
                        className="input-field"
                      >
                        <option value="">— Select program —</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.code} – {p.name}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Section" required>
                      <select
                        value={form.section_id}
                        onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
                        className="input-field"
                        disabled={!form.program_id}
                      >
                        <option value="">{form.program_id ? '— Select section —' : '— Select a program first —'}</option>
                        {sections.filter(s => String(s.program_id) === form.program_id)
                          .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Year Level" required>
                      <select value={form.year_level} onChange={e => setForm(f => ({ ...f, year_level: e.target.value }))} className="input-field">
                        {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                      </select>
                    </FormField>
                    <FormField label="RFID Tag (optional)" hint="Can be assigned later.">
                      <input value={form.rfid_tag} onChange={e => setForm(f => ({ ...f, rfid_tag: e.target.value }))} className="input-field" placeholder="e.g. 1189393973" />
                    </FormField>
                  </>
                )}
                <FormField label="Department (optional)">
                  <select value={form.department_id} onChange={e => setForm(f => ({...f, department_id: e.target.value}))} className="input-field">
                    <option value="">— None —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
                  </select>
                </FormField>
                {modal === 'edit' && (
                  <label className="flex items-center gap-2 text-sm text-[var(--sp-text)]">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({...f, is_active: e.target.checked}))} />
                    Active
                  </label>
                )}
              </>
            )}
            {(modal === 'create' || modal === 'password') && (
              <>
                <FormField label="New Password">
                  <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} className="input-field" />
                </FormField>
                <FormField label="Confirm Password">
                  <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({...f, confirmPassword: e.target.value}))} className="input-field" />
                </FormField>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
