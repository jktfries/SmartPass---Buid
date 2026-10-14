import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import CountUp from '@/components/ui/CountUp'

interface Props {
  rate: number
  size?: number
}

function ringColor(rate: number): string {
  if (rate >= 80) return '#10b981'
  if (rate >= 60) return '#f59e0b'
  return '#ef4444'
}

export default function AttendanceRing({ rate, size = 160 }: Props) {
  const color = ringColor(rate)
  const data = [{ value: rate, fill: color }]

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
          barSize={14}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: 'var(--sp-subtle)' }}
            dataKey="value"
            angleAxisId={0}
            cornerRadius={99}
            isAnimationActive={true}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-[var(--sp-text)] leading-none">
          <CountUp to={rate} suffix="%" />
        </span>
        <span className="text-[10px] text-[var(--sp-text-muted)] mt-0.5">attendance</span>
      </div>
    </div>
  )
}
