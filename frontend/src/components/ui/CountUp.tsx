import { useCountUp } from '@/hooks/useCountUp'

interface Props {
  to: number
  duration?: number
  suffix?: string
  prefix?: string
  decimals?: number
}

export default function CountUp({ to, duration = 1200, suffix = '', prefix = '', decimals = 0 }: Props) {
  const raw = useCountUp(to, duration)
  const display = decimals > 0 ? raw.toFixed(decimals) : raw.toString()
  return <>{prefix}{display}{suffix}</>
}
