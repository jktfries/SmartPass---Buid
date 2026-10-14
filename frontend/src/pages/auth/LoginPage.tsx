import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { GraduationCap, CalendarCheck, HeartPulse, ShieldCheck } from 'lucide-react'
import Button from '@/components/ui/Button'

const HIGHLIGHTS = [
  { icon: CalendarCheck, text: 'Real-time attendance tracking' },
  { icon: HeartPulse,    text: 'Multimodal wellness check-ins' },
  { icon: ShieldCheck,   text: 'Role-based access for every campus team' },
]

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Rendering <Navigate> rather than calling navigate() here — an imperative
  // navigate during render is a no-op in React Router v6.4+.
  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch {
      setError('Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--sp-bg)]">
      {/* Left brand panel — hidden on small screens */}
      {/* Everything in this panel inherits --sp-on-primary and dims itself with
          opacity rather than hardcoding white, so a pale custom accent flips the
          whole panel to dark text in one go instead of 8 separate places. The
          decorative washes use bg-current for the same reason. */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[var(--sp-primary)] p-12 text-[var(--sp-on-primary)] relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-24 -top-24 w-96 h-96 rounded-full bg-current opacity-10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 w-72 h-72 rounded-full bg-current opacity-5"
          aria-hidden="true"
        />

        <div className="flex items-center gap-3 relative">
          <div className="w-11 h-11 sp-squircle-lg bg-current/15 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">SmartPass</span>
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Attendance &amp; wellness,<br />in one place.
            </h1>
            <p className="text-base opacity-80 leading-relaxed max-w-sm">
              SmartPass gives students, faculty, and staff a single source of truth for attendance,
              wellness check-ins, and campus communication.
            </p>
          </div>
          <ul className="space-y-3">
            {HIGHLIGHTS.map(h => (
              <li key={h.text} className="flex items-center gap-3 text-sm opacity-90">
                <span className="w-8 h-8 sp-squircle-sm bg-current/15 flex items-center justify-center flex-shrink-0">
                  <h.icon size={16} />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs opacity-60">SmartPass v2.0 · Attendance &amp; Wellness Management System</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Compact brand header — mobile only */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 sp-squircle-sm bg-[var(--sp-primary)] flex items-center justify-center flex-shrink-0">
              <GraduationCap size={18} className="text-[var(--sp-on-primary)]" />
            </div>
            <span className="text-lg font-bold text-[var(--sp-text)]">SmartPass</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--sp-text)]">Welcome back</h2>
            <p className="text-base text-[var(--sp-text-muted)] mt-2 leading-relaxed">
              Sign in with your SmartPass account to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--sp-text)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@school.edu.ph"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--sp-text)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 sp-squircle-sm">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p className="lg:hidden text-center text-xs text-[var(--sp-text-muted)] mt-8">
            SmartPass v2.0 · Attendance & Wellness Management System
          </p>
        </div>
      </div>
    </div>
  )
}
