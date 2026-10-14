interface Props {
  rows?: number
  height?: string
  className?: string
}

export default function SkeletonCard({ rows = 3, height = 'h-4', className = '' }: Props) {
  return (
    <div className={`sp-squircle-xl bg-[var(--sp-subtle)] p-6 overflow-hidden relative ${className}`}>
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={`${height} sp-squircle-sm bg-[var(--sp-border)] animate-pulse`}
            style={{ width: `${60 + (i % 3) * 15}%` }}
          />
        ))}
      </div>
    </div>
  )
}
