import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { profileApi } from '@/api/profile'
import type { FullProfile } from '@/api/profile'
import { Camera, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { ROLE_LABEL } from '@/lib/roles'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import FormField from '@/components/ui/FormField'
import Avatar from '@/components/ui/Avatar'
import AppearanceCard from '@/components/settings/AppearanceCard'

export default function AccountPage() {
  const { user, refreshUser } = useAuth()

  const [profile, setProfile] = useState<FullProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName]         = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone]       = useState('')
  const [bio, setBio]           = useState('')
  const [email, setEmail]       = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving]         = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError]   = useState('')

  // Email stays admin-only; password is self-service for every role.
  const canEditEmail = user?.role === 'system_admin' || user?.role === 'super_admin'

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError]         = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    profileApi.getProfile().then(res => {
      const p = res.data
      setProfile(p)
      setName(p.name)
      setNickname(p.nickname ?? '')
      setPhone(p.phone ?? '')
      setBio(p.bio ?? '')
      setEmail(p.email)
    }).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaveStatus('idle')
    setSaveError('')

    const wantsPasswordChange = newPassword.length > 0
    if (wantsPasswordChange && newPassword !== confirmPassword) {
      setSaveError('New passwords do not match.')
      setSaveStatus('error')
      setSaving(false)
      return
    }

    try {
      const res = await profileApi.updateProfile({
        name: name.trim() || undefined,
        nickname: nickname.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        ...(canEditEmail && email.trim() !== profile?.email ? { email: email.trim() } : {}),
        ...(wantsPasswordChange
          ? { current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword }
          : {}),
      })
      setProfile(prev => prev ? { ...prev, ...res.data } : prev)
      await refreshUser()
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const fieldError = Object.values(err.response?.data?.errors ?? {})[0]?.[0]
      setSaveError(fieldError ?? err.response?.data?.message ?? 'Failed to save changes.')
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarError('')
    try {
      const res = await profileApi.uploadAvatar(file)
      setProfile(prev => prev ? { ...prev, avatar_url: res.data.avatar_url } : prev)
      await refreshUser()
    } catch (e: unknown) {
      // Surface Laravel's actual message — it names the real reason (too big vs
      // wrong type) instead of guessing, and it can't drift out of sync with
      // the server's limit the way the old hardcoded "Max 2 MB" string did.
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const fieldError = Object.values(err.response?.data?.errors ?? {})[0]?.[0]
      setAvatarError(fieldError ?? err.response?.data?.message ?? 'Upload failed. Please try again.')
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUploading(true)
    setAvatarError('')
    try {
      await profileApi.removeAvatar()
      setProfile(prev => prev ? { ...prev, avatar_url: null } : prev)
      await refreshUser()
    } catch {
      setAvatarError('Failed to remove photo.')
    } finally {
      setAvatarUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[var(--sp-primary)]" size={32} />
      </div>
    )
  }

  if (!profile || !user) return null

  const isDirty = name !== profile.name
    || nickname !== (profile.nickname ?? '')
    || phone !== (profile.phone ?? '')
    || bio !== (profile.bio ?? '')
    || (canEditEmail && email !== profile.email)
    || newPassword.length > 0

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-[var(--sp-text-muted)]">Manage your personal profile and photo</p>

      {/* Avatar card */}
      <Card title="Photo">
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0">
            <Avatar name={profile.name} role={user.role} url={profile.avatar_url} size="xl" className="ring-4 ring-[var(--sp-bg)] shadow-md" />
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={22} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-[var(--sp-text-muted)]">
              JPG, PNG, GIF, or WebP · Max 5 MB
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading} size="sm">
                <Camera size={15} />
                {profile.avatar_url ? 'Change Photo' : 'Upload Photo'}
              </Button>
              {profile.avatar_url && (
                <Button onClick={handleRemoveAvatar} disabled={avatarUploading} variant="secondary" size="sm" className="!text-red-600 !border-red-200 dark:!border-red-800 hover:!bg-red-50 dark:hover:!bg-red-900/20">
                  <Trash2 size={15} />
                  Remove
                </Button>
              )}
            </div>
            {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden" onChange={handleAvatarChange} />
      </Card>

      <AppearanceCard />

      {/* Personal info card */}
      <Card title="Personal Information">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" required>
              <input value={name} onChange={e => setName(e.target.value)}
                className="input-field" placeholder="Your full name" />
            </FormField>

            <FormField label="Nickname / Preferred Name">
              <input value={nickname} onChange={e => setNickname(e.target.value)}
                className="input-field" placeholder="e.g. Sam" />
            </FormField>
          </div>

          {canEditEmail ? (
            <FormField label="Email Address" required hint="You can change this directly since you're a system admin.">
              <input value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="you@school.edu.ph" />
            </FormField>
          ) : (
            <FormField label="Email Address" hint="Email changes require admin assistance.">
              <input value={profile.email} readOnly
                className="input-field opacity-60 cursor-not-allowed" />
            </FormField>
          )}

          <FormField label="Role">
            <div className="flex items-center gap-2 h-10">
              <Badge variant="primary">{ROLE_LABEL[user.role] ?? user.role}</Badge>
            </div>
          </FormField>
        </div>
      </Card>

      {/* Password card — available to every role */}
      <Card title="Change Password" subtitle="Leave blank to keep your current password.">
        <div className="space-y-4">
          <FormField label="Current Password">
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="input-field" placeholder="••••••••" autoComplete="current-password" />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="New Password" hint="At least 8 characters.">
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="input-field" placeholder="••••••••" autoComplete="new-password" />
            </FormField>
            <FormField label="Confirm New Password">
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="input-field" placeholder="••••••••" autoComplete="new-password" />
            </FormField>
          </div>
        </div>
      </Card>

      {/* Contact card */}
      <Card title="Contact Details">
        <FormField label="Phone Number">
          <input value={phone} onChange={e => setPhone(e.target.value)}
            className="input-field" placeholder="+63 9XX XXX XXXX" />
        </FormField>
      </Card>

      {/* Bio card */}
      <Card title="Bio">
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
          maxLength={500}
          placeholder="A short description about yourself…"
          className="input-field resize-none w-full" />
        <p className="text-right text-xs text-[var(--sp-text-muted)] mt-1">{bio.length} / 500</p>
      </Card>

      {/* Academic info (students only) */}
      {profile.student_profile && (
        <Card title="Academic Information">
          <div className="grid grid-cols-2 gap-4">
            <ReadField label="Student ID" value={profile.student_profile.student_id} />
            <ReadField label="Year Level" value={`Year ${profile.student_profile.year_level}`} />
            <ReadField label="Program" value={`${profile.student_profile.program_code} — ${profile.student_profile.program}`} />
            <ReadField label="Section" value={profile.student_profile.section ?? '—'} />
          </div>
        </Card>
      )}

      {/* Save bar */}
      <div className="flex items-center gap-3 pb-4">
        <Button onClick={handleSave} disabled={saving || !isDirty}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>

        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle size={16} /> Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
            <AlertCircle size={16} /> {saveError}
          </span>
        )}
      </div>
    </div>
  )
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-[var(--sp-text-muted)] uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-[var(--sp-text)]">{value}</p>
    </div>
  )
}
