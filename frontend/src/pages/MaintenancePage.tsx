import { useState } from 'react'
import { Wrench, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'

/**
 * Shown when the API reports maintenance mode.
 *
 * The System Settings toggle has always described itself as showing "a
 * maintenance notice", but nothing ever rendered one — the middleware returned
 * 503 and the axios interceptor only handled 401, so the response fell through
 * to each page's catch block and was swallowed. Users got a silently dead app
 * with no explanation.
 *
 * Deliberately makes NO API calls of its own. Anything it fetched would 503
 * too, and a retry loop on the one screen meant to explain the outage would be
 * a poor joke.
 */
export default function MaintenancePage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)

  function retry() {
    setChecking(true)
    // A full reload rather than a route change: the app's caches and contexts
    // were populated (or half-populated) during the outage.
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sp-bg)] p-6">
      <div className="sp-block max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 sp-squircle-lg bg-[var(--sp-primary-soft-bg)] flex items-center justify-center mx-auto mb-6">
          <Wrench size={28} className="text-[var(--sp-primary-soft-text)]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[var(--sp-text)]">
          SmartPass is under maintenance
        </h1>

        <p className="mt-3 text-base leading-relaxed text-[var(--sp-text-muted)]">
          An administrator has temporarily taken the system offline. Your account and
          data are unaffected — please check back shortly.
        </p>

        <Button onClick={retry} disabled={checking} className="mt-7">
          <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Checking…' : 'Try again'}
        </Button>

        <button
          onClick={() => navigate('/login')}
          className="block mx-auto mt-4 text-sm text-[var(--sp-text-muted)] hover:text-[var(--sp-text)] transition-colors"
        >
          Back to sign in
        </button>
      </div>
    </div>
  )
}
