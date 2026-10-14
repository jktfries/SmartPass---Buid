import { useState } from 'react'
import { Monitor, Moon, Sun, Check, Pipette, AlertTriangle } from 'lucide-react'
import Card from '@/components/ui/Card'
import FormField from '@/components/ui/FormField'
import { useTheme, ACCENTS, isCustomAccent, parseHex, rgbToHsl } from '@/context/ThemeContext'
import type { AccentName, Density, ThemeMode } from '@/api/auth'

const DEFAULT_CUSTOM = '#6d28d9'

/**
 * Colours that already mean something specific in this app. A user is free to
 * pick one of these, but they should know what they're trading away first —
 * a red accent next to red "Absent" pills makes the page harder to scan.
 */
const RESERVED: { hex: string; label: string }[] = [
  { hex: '#ef4444', label: 'Absent / danger' },
  { hex: '#10b981', label: 'Present, and the Counselor role' },
  { hex: '#f59e0b', label: 'Late, and the Admin role' },
  { hex: '#0284c7', label: 'the Professor role' },
]

/**
 * Compared by hue, not RGB distance. Straight RGB distance was tried first and
 * doesn't work — it's dominated by lightness, so a dark red like #B91C1C landed
 * further from #ef4444 than teal does from emerald, and went unwarned.
 */
function hueGap(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/** Which reserved meaning this colour is close enough to be confused with. */
function collisionFor(hex: string): string | null {
  const rgb = parseHex(hex)
  if (!rgb) return null

  // A preset is a colour we already vetted — never warn about one, even when
  // typed in as a hex. Teal in particular sits ~15° from the success emerald,
  // which is exactly the kind of false positive that trains people to ignore
  // warnings.
  if (ACCENTS.some(a => a.swatch.toLowerCase() === hex.toLowerCase())) return null

  const c = rgbToHsl(rgb)
  // Greys, near-blacks and near-whites have no hue worth comparing.
  if (c.s < 0.15 || c.l < 0.12 || c.l > 0.92) return null

  // 20° is tuned, not arbitrary: greens read as "green" across a much wider
  // arc than reds do, so a narrower window let obvious cases like #15803D
  // (forest green, 17.7° off emerald) slip through unwarned.
  for (const r of RESERVED) {
    if (hueGap(c.h, rgbToHsl(parseHex(r.hex)!).h) < 20) return r.label
  }
  return null
}

const THEMES: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
  { value: 'light',  label: 'Light',  icon: Sun },
  { value: 'dark',   label: 'Dark',   icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const DENSITIES: { value: Density; label: string; hint: string }[] = [
  { value: 'comfortable', label: 'Comfortable', hint: 'More breathing room' },
  { value: 'compact',     label: 'Compact',     hint: 'Fit more on screen' },
]

function Segmented<T extends string>({ value, options, onChange }: {
  value: T
  options: { value: T; label: string; hint?: string; icon?: React.ElementType }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5 sp-squircle-lg bg-[var(--sp-subtle)] p-1.5 w-fit">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`flex items-center gap-2 sp-squircle-sm px-4 py-2 text-sm font-semibold transition-colors ${
            value === o.value
              ? 'bg-[var(--sp-primary)] text-[var(--sp-on-primary)]'
              : 'text-[var(--sp-text-muted)] hover:text-[var(--sp-text)]'
          }`}
        >
          {o.icon && <o.icon size={15} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function AppearanceCard() {
  const { theme, accent, density, sidebarCollapsed, setPreference } = useTheme()

  const custom = isCustomAccent(accent)
  const [draft, setDraft] = useState<string>(custom ? accent : DEFAULT_CUSTOM)

  function applyCustom(hex: string) {
    setDraft(hex)
    if (parseHex(hex)) setPreference({ accent: hex as AccentName })
  }

  const collision = custom ? collisionFor(accent) : null

  return (
    <Card title="Appearance" subtitle="Applies to your account on any device">
      <div className="space-y-6">
        <FormField label="Accent Colour">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {ACCENTS.map(a => (
                <button
                  key={a.name}
                  onClick={() => setPreference({ accent: a.name })}
                  title={a.label}
                  aria-label={a.label}
                  aria-pressed={accent === a.name}
                  className="w-10 h-10 sp-squircle-md flex items-center justify-center transition-transform hover:scale-105"
                  style={{ background: a.swatch }}
                >
                  {accent === a.name && <Check size={18} className="text-white" />}
                </button>
              ))}

              <span className="w-px h-7 bg-[var(--sp-border)] mx-0.5" aria-hidden="true" />

              {/* Custom swatch — the native colour input is laid over the tile so
                  the browser's own picker opens on click, but the tile is what
                  you see. */}
              <div className="relative w-10 h-10">
                <button
                  type="button"
                  aria-label="Custom colour"
                  aria-pressed={custom}
                  title="Custom colour"
                  className="w-10 h-10 sp-squircle-md flex items-center justify-center transition-transform hover:scale-105
                             border border-dashed border-[var(--sp-border)]"
                  style={custom ? { background: accent, borderStyle: 'solid' } : undefined}
                >
                  {custom
                    ? <Check size={18} className="text-[var(--sp-on-primary)]" />
                    : <Pipette size={16} className="text-[var(--sp-text-muted)]" />}
                </button>
                <input
                  type="color"
                  value={parseHex(draft) ? draft : DEFAULT_CUSTOM}
                  onChange={e => applyCustom(e.target.value)}
                  aria-label="Pick a custom accent colour"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <input
                value={draft}
                onChange={e => applyCustom(e.target.value)}
                spellCheck={false}
                aria-label="Custom accent hex value"
                className="input-field w-28 font-mono text-xs uppercase"
                placeholder="#7C3AED"
              />
            </div>

            {collision && (
              <p className="flex items-start gap-2 text-xs text-[var(--sp-text-muted)] leading-relaxed">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-500" />
                <span>
                  This is close to the colour used for{' '}
                  <strong className="font-semibold">{collision}</strong>. It still applies —
                  some screens may just be harder to read at a glance.
                </span>
              </p>
            )}
          </div>
        </FormField>

        <FormField label="Theme">
          <Segmented value={theme} options={THEMES} onChange={v => setPreference({ theme: v })} />
        </FormField>

        <FormField label="Density" hint={DENSITIES.find(d => d.value === density)?.hint}>
          <Segmented value={density} options={DENSITIES} onChange={v => setPreference({ density: v })} />
        </FormField>

        <FormField label="Sidebar" hint="Expanded shows labels next to each icon.">
          <Segmented
            value={sidebarCollapsed ? 'rail' : 'expanded'}
            options={[
              { value: 'rail',     label: 'Icons only' },
              { value: 'expanded', label: 'Expanded' },
            ]}
            onChange={v => setPreference({ sidebarCollapsed: v === 'rail' })}
          />
        </FormField>
      </div>
    </Card>
  )
}
