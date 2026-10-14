import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { profileApi } from '@/api/profile'
import type { AccentName, CustomAccent, Density, PresetAccent, ThemeMode, UserPreferences } from '@/api/auth'

/** Mirrored to localStorage so index.html can apply the theme before React mounts. */
export const PREFS_CACHE_KEY = 'sp-prefs'

export const ACCENTS: { name: PresetAccent; label: string; swatch: string }[] = [
  { name: 'teal',    label: 'Teal',    swatch: '#0d9488' },
  { name: 'indigo',  label: 'Indigo',  swatch: '#4f46e5' },
  { name: 'violet',  label: 'Violet',  swatch: '#7c3aed' },
  { name: 'rose',    label: 'Rose',    swatch: '#e11d48' },
  { name: 'amber',   label: 'Amber',   swatch: '#d97706' },
  { name: 'sky',     label: 'Sky',     swatch: '#0284c7' },
  { name: 'emerald', label: 'Emerald', swatch: '#059669' },
]

export function isCustomAccent(a: AccentName): a is CustomAccent {
  return typeof a === 'string' && a.startsWith('#')
}

/** #rgb / #rrggbb → [r,g,b], or null if it isn't a colour we can read. */
export function parseHex(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

/**
 * WCAG relative luminance. Used to decide whether white or dark text survives
 * on top of the chosen accent — the 7 presets are all dark enough for white,
 * but a custom pick can be anything.
 */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

/**
 * Foreground for text sitting on `hex`. The 0.45 cut is deliberately above the
 * naive 0.5: white-on-mid-tone fails WCAG AA well before the colour looks
 * "light", so we switch to dark a little early.
 */
export function onColorFor(hex: string): string {
  const rgb = parseHex(hex)
  if (!rgb) return '#ffffff'
  return relativeLuminance(rgb) > 0.45 ? '#14212e' : '#ffffff'
}

export function rgbToHsl([r, g, b]: [number, number, number]) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d !== 0) {
    if (max === rn)      h = 60 * (((gn - bn) / d) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / d + 2)
    else                 h = 60 * ((rn - gn) / d + 4)
  }
  return { h: (h + 360) % 360, s, l }
}

export function hslToHex({ h, s, l }: { h: number; s: number; l: number }): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const seg = Math.floor(h / 60) % 6
  const [r, g, b] = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ][seg]
  return '#' + [r, g, b]
    .map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0'))
    .join('')
}

/**
 * A readable "ink" version of the accent — same hue, lightness clamped into a
 * band that stays legible on the soft tinted background.
 *
 * This exists because deriving soft-text purely in CSS (`color-mix(accent 85%,
 * black)`) only works for accents that are already dark. Feed it pale yellow
 * and you get olive-on-off-white, which is what every Card icon and role badge
 * would have looked like.
 */
export function inkFor(hex: string, mode: 'light' | 'dark'): string {
  const rgb = parseHex(hex)
  if (!rgb) return mode === 'light' ? '#0f766e' : '#5eead4'
  const { h, s } = rgbToHsl(rgb)
  // Keep some saturation so it still reads as the chosen colour, not grey.
  const sat = Math.max(s, 0.35)
  return hslToHex(mode === 'light'
    ? { h, s: sat, l: 0.30 }
    : { h, s: Math.min(sat, 0.75), l: 0.72 })
}

const DEFAULTS: Required<Omit<UserPreferences, 'dashboard'>> = {
  theme: 'system',
  accent: 'teal',
  density: 'comfortable',
  sidebarCollapsed: true,
}

interface ThemeContextValue {
  theme: ThemeMode
  accent: AccentName
  density: Density
  sidebarCollapsed: boolean
  /** What `system` actually resolved to right now. */
  resolvedDark: boolean
  setPreference: (patch: UserPreferences) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readCache(): UserPreferences {
  try {
    return JSON.parse(localStorage.getItem(PREFS_CACHE_KEY) ?? '{}') as UserPreferences
  } catch {
    return {}
  }
}

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  // Seed from the localStorage mirror so the very first paint matches what the
  // pre-React script in index.html already applied — the server copy arrives a
  // round-trip later and would otherwise visibly snap into place.
  const [prefs, setPrefs] = useState<UserPreferences>(() => ({ ...DEFAULTS, ...readCache() }))
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  // Server copy wins once the user hydrates.
  useEffect(() => {
    if (!user) return
    const merged = { ...DEFAULTS, ...(user.preferences ?? {}) }
    setPrefs(merged)
    try { localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(merged)) } catch { /* private mode */ }
  }, [user])

  // `system` has to keep tracking the OS after load, not just read it once.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme = prefs.theme ?? DEFAULTS.theme
  const accent = prefs.accent ?? DEFAULTS.accent
  const density = prefs.density ?? DEFAULTS.density
  const sidebarCollapsed = prefs.sidebarCollapsed ?? DEFAULTS.sidebarCollapsed
  const resolvedDark = theme === 'dark' || (theme === 'system' && systemDark)

  // Apply to <html>. Presets stay classes rather than inline vars on purpose:
  // the .dark block overrides --sp-primary-soft-*, and inline styles would beat
  // it on specificity and silently break dark mode.
  //
  // A custom accent sets ONLY --sp-primary inline, which is safe precisely
  // because .dark never overrides that one — the hover/soft values are derived
  // from it in CSS under [data-accent="custom"], where .dark can still win.
  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('dark', resolvedDark)

    const custom = isCustomAccent(accent)
    for (const a of ACCENTS) {
      el.classList.toggle(`accent-${a.name}`, !custom && a.name !== 'teal' && a.name === accent)
    }

    if (custom) {
      el.style.setProperty('--sp-primary', accent)
      el.style.setProperty('--sp-on-primary', onColorFor(accent))
      // Both inks are published; CSS picks which one applies per mode, so the
      // .dark rule still wins and we don't reintroduce the specificity trap.
      el.style.setProperty('--sp-accent-ink-light', inkFor(accent, 'light'))
      el.style.setProperty('--sp-accent-ink-dark', inkFor(accent, 'dark'))
      el.setAttribute('data-accent', 'custom')
    } else {
      for (const p of ['--sp-primary', '--sp-on-primary', '--sp-accent-ink-light', '--sp-accent-ink-dark']) {
        el.style.removeProperty(p)
      }
      el.removeAttribute('data-accent')
    }

    el.setAttribute('data-density', density)
  }, [resolvedDark, accent, density])

  const setPreference = useCallback((patch: UserPreferences) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(next)) } catch { /* private mode */ }
      return next
    })
    // Optimistic: the UI already moved, so a failed save just means it won't
    // follow the account to another device.
    profileApi.updatePreferences(patch).catch(() => {})
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, accent, density, sidebarCollapsed, resolvedDark, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
