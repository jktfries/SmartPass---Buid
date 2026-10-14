import CountUp from '@/components/ui/CountUp'

const TONES = {
  primary: 'text-[var(--sp-primary)]',
  success: 'text-emerald-600',
  danger:  'text-red-500',
  warning: 'text-amber-500',
  neutral: 'text-[var(--sp-text)]',
} as const

interface KpiProps {
  label: string
  value: number | string
  suffix?: string
  sub?: string
  tone?: keyof typeof TONES
  className?: string
}

/** A KPI tile: oversized numeral on a soft tinted squircle, label above. */
export default function Kpi({ label, value, suffix = '', sub, tone = 'neutral', className = '' }: KpiProps) {
  return (
    <div className={`sp-squircle-xl bg-[var(--sp-subtle)] px-6 py-5 ${className}`}>
      <p className="text-sm text-[var(--sp-text-muted)] mb-1">{label}</p>
      <p className={`text-4xl font-bold tracking-tight ${TONES[tone]}`}>
        {typeof value === 'number' ? <CountUp to={value} suffix={suffix} /> : <>{value}{suffix}</>}
      </p>
      {sub && <p className="text-xs text-[var(--sp-text-muted)] mt-1.5 truncate">{sub}</p>}
    </div>
  )
}
