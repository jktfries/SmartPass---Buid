import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import type { SettingItem } from '@/api/admin'
import { Wrench, Bell, RefreshCw, Clock, Settings as SettingsIcon, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'

// Metadata for well-known keys.
//
// `confirm` marks a setting whose effect is immediate and system-wide, so it
// asks before firing rather than acting on a single stray click.
const SETTING_META: Record<string, { label: string; description: string; type: 'toggle' | 'number' | 'text'; icon: React.ElementType; confirm?: string }> = {
  // Description corrected: this does NOT block logins — /auth/login sits
  // outside the maintenance middleware, so sign-in still succeeds and it is
  // every request afterwards that is refused.
  maintenance_mode:  {
    label: 'Maintenance Mode',
    description: 'Blocks app access for all non-admin users and shows them a maintenance notice. Sign-in still works.',
    type: 'toggle',
    icon: Wrench,
    confirm: 'Turn on Maintenance Mode?\n\nEvery student, professor, counselor and academic admin will immediately lose access to the app until you turn this off. Administrators are not affected.',
  },
  live_alerts:       { label: 'Live Alerts',         description: 'Send real-time threshold breach notifications.', type: 'toggle', icon: Bell },
  auto_sync:         { label: 'Auto Sync',            description: 'Auto-sync attendance with SIS on scan.', type: 'toggle', icon: RefreshCw },
  rfid_grace_period: { label: 'RFID Grace Period',   description: 'Extra global grace minutes added to late threshold.', type: 'number', icon: Clock },
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} type="button"
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--sp-primary)] focus:ring-offset-2 ${checked ? 'bg-[var(--sp-primary)]' : 'bg-slate-300 dark:bg-slate-600'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function SettingCard({ setting, onUpdate }: { setting: SettingItem; onUpdate: (key: string, value: string) => Promise<void> }) {
  const meta = SETTING_META[setting.key] ?? { label: setting.key, description: setting.description ?? '', type: 'text' as const, icon: SettingsIcon }
  const Icon = meta.icon
  const [saving, setSaving] = useState(false)
  const [localVal, setLocalVal] = useState(setting.value ?? '')
  const [saved, setSaved] = useState(false)

  async function save(newVal: string) {
    setSaving(true)
    try {
      await onUpdate(setting.key, newVal)
      setLocalVal(newVal)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sp-squircle-lg bg-[var(--sp-subtle)] flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-[var(--sp-text-muted)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--sp-text)]">{meta.label}</p>
            <p className="text-xs text-[var(--sp-text-muted)] mt-0.5 max-w-xs">{meta.description}</p>
            {saved && <p className="text-xs text-emerald-600 mt-0.5">✓ Saved</p>}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {meta.type === 'toggle' && (
            <Toggle
              checked={localVal === '1'}
              onChange={v => {
                // Only confirm when switching ON — turning a system-wide block
                // back off should never have an obstacle in front of it.
                if (v && meta.confirm && !window.confirm(meta.confirm)) return
                save(v ? '1' : '0')
              }}
            />
          )}

          {meta.type === 'number' && (
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={120} value={localVal}
                onChange={e => setLocalVal(e.target.value)}
                onBlur={() => localVal !== setting.value && save(localVal)}
                className="input-field w-20 text-center"
              />
              <span className="text-xs text-[var(--sp-text-muted)]">min</span>
            </div>
          )}

          {meta.type === 'text' && (
            <input
              type="text" value={localVal}
              onChange={e => setLocalVal(e.target.value)}
              onBlur={() => localVal !== setting.value && save(localVal)}
              className="input-field w-36"
            />
          )}

          {saving && <Loader2 size={16} className="animate-spin text-[var(--sp-primary)]" />}
        </div>
      </div>
    </Card>
  )
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SettingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getSettings().then(r => setSettings(r.data)).finally(() => setLoading(false))
  }, [])

  async function handleUpdate(key: string, value: string) {
    await adminApi.updateSetting(key, value)
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s))
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-[var(--sp-text-muted)]">Changes take effect immediately.</p>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 sp-squircle-xl bg-[var(--sp-border)] animate-pulse" />)}
        </div>
      ) : settings.length === 0 ? (
        <p className="text-[var(--sp-text-muted)] text-sm">No settings found. Run migrate:fresh --seed to populate defaults.</p>
      ) : (
        <div className="space-y-3">
          {settings.map(s => (
            <SettingCard key={s.key} setting={s} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
