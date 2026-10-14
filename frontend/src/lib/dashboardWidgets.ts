import type { DashboardWidgetPref, User } from '@/api/auth'

/**
 * Canonical widget list per role. Saved layouts are merged against this, so a
 * widget added here later shows up for users who already have a stored layout
 * instead of silently never appearing.
 *
 * `span` is columns out of 4. Users may resize, but only down to each widget's
 * `minSpan` — below that the content genuinely breaks rather than just looking
 * personalised.
 */
export interface WidgetDef {
  id: string
  label: string
  /** Default width in columns out of 4. */
  span: 1 | 2 | 3 | 4
  /**
   * Narrowest width this widget's content actually works at. Below it, axis
   * labels collide, side-by-side layouts wrap, or tables clip — so those sizes
   * simply aren't offered rather than being offered and looking broken.
   */
  minSpan?: 1 | 2 | 3 | 4
  /** Always rendered, never hideable or draggable — page chrome, not a widget. */
  locked?: boolean
}

export const DASHBOARD_WIDGETS: Record<User['role'], WidgetDef[]> = {
  student: [
    { id: 'attendance-hero',  label: 'Attendance Overview', span: 4, minSpan: 2 },
    { id: 'attendance-trend', label: 'Attendance Trend',    span: 3, minSpan: 2 },
    { id: 'quick-actions',    label: 'Quick Actions',       span: 1 },
    { id: 'class-breakdown',  label: 'Class Breakdown',     span: 2 },
    { id: 'mood',             label: 'Mood',                span: 2, minSpan: 2 },
  ],
  professor: [
    { id: 'kpis',       label: 'Key Metrics',      span: 4 },
    { id: 'my-classes', label: 'My Classes',       span: 3, minSpan: 2 },
    { id: 'at-risk',    label: 'At-Risk Students', span: 1 },
  ],
  guidance_counselor: [
    { id: 'risk-distribution', label: 'Risk Distribution', span: 3, minSpan: 2 },
    { id: 'caseload-kpis',     label: 'Caseload Metrics',  span: 1 },
    { id: 'risk-trend',        label: '8-Week Risk Trend', span: 4, minSpan: 2 },
    { id: 'shortcuts',         label: 'Caseload Shortcuts', span: 4, minSpan: 2 },
  ],
  admin_exec: [
    { id: 'kpis',              label: 'Key Metrics',        span: 4 },
    { id: 'attendance-trend',  label: 'Attendance Trend',   span: 3, minSpan: 2 },
    { id: 'wellness-donut',    label: 'Wellness Split',     span: 1 },
    { id: 'program-breakdown', label: 'Per-Program Rates',  span: 2, minSpan: 2 },
    { id: 'reports',           label: 'Reports',            span: 4, minSpan: 4 },
  ],
  system_admin: [
    { id: 'kpis',            label: 'Key Metrics',     span: 4 },
    { id: 'user-breakdown',  label: 'User Breakdown',  span: 4, minSpan: 3 },
    { id: 'open-tickets',    label: 'Open Tickets',    span: 2 },
    { id: 'recent-activity', label: 'Recent Activity', span: 2 },
    { id: 'quick-access',    label: 'Quick Access',    span: 4, minSpan: 2 },
  ],
  super_admin: [],
}
DASHBOARD_WIDGETS.super_admin = DASHBOARD_WIDGETS.system_admin

/**
 * Reconcile a stored layout against the registry: keep the user's order and
 * visibility for widgets that still exist, drop ids that no longer do, and
 * append newly-registered widgets at the end so they aren't invisible.
 */
export function resolveLayout(role: User['role'], saved?: DashboardWidgetPref[]): DashboardWidgetPref[] {
  const defs = DASHBOARD_WIDGETS[role] ?? []
  const known = new Set(defs.map(d => d.id))
  // Clamp any stored span that a later minSpan bump has made invalid, rather
  // than rendering a width the widget can't handle.
  const fromSaved = (saved ?? [])
    .filter(w => known.has(w.id))
    .map(w => {
      const def = defs.find(d => d.id === w.id)!
      return w.span ? { ...w, span: effectiveSpan(def, w) } : w
    })
  const seen = new Set(fromSaved.map(w => w.id))
  const appended = defs.filter(d => !seen.has(d.id)).map(d => ({ id: d.id, visible: true }))
  return [...fromSaved, ...appended]
}

export function widgetDef(role: User['role'], id: string): WidgetDef | undefined {
  return (DASHBOARD_WIDGETS[role] ?? []).find(d => d.id === id)
}

/** The sizes a widget may be set to, smallest workable width upward. */
export function allowedSpans(def: WidgetDef): (1 | 2 | 3 | 4)[] {
  const min = def.minSpan ?? 1
  return ([1, 2, 3, 4] as const).filter(n => n >= min)
}

/** The width to actually render at: the user's choice, else the default. */
export function effectiveSpan(def: WidgetDef | undefined, pref?: DashboardWidgetPref): 1 | 2 | 3 | 4 {
  if (!def) return 4
  const min = def.minSpan ?? 1
  const chosen = pref?.span ?? def.span
  return (chosen < min ? min : chosen) as 1 | 2 | 3 | 4
}

export const SPAN_CLASS: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'md:col-span-2 lg:col-span-2',
  3: 'md:col-span-2 lg:col-span-3',
  4: 'md:col-span-2 lg:col-span-4',
}
