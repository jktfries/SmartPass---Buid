/**
 * Shared Recharts chrome for the white-canvas design: no grid lines, no axis
 * rules, squircle tooltips, and rounded geometry everywhere.
 */

export const TOOLTIP_STYLE = {
  background: 'var(--sp-surface)',
  border: 'none',
  borderRadius: 14,
  boxShadow: 'var(--sp-shadow-soft)',
  fontSize: 12,
} as const

export const AXIS_TICK = { fontSize: 11, fill: 'var(--sp-text-muted)' } as const

/** Spread onto <XAxis>/<YAxis> to drop the axis rule and tick marks. */
export const AXIS_PROPS = {
  tick: AXIS_TICK,
  axisLine: false,
  tickLine: false,
} as const

/** Rounded caps for every bar corner. */
export const BAR_RADIUS: [number, number, number, number] = [10, 10, 10, 10]

/**
 * Chart height for a given widget width, so a resized chart keeps roughly its
 * proportions instead of becoming a tall narrow sliver or a squashed letterbox.
 */
export function chartHeight(span: number): number {
  return ({ 1: 160, 2: 200, 3: 240, 4: 280 } as Record<number, number>)[span] ?? 240
}

/** Rounded stroke ends for lines and areas. */
export const LINE_CAPS = {
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const
