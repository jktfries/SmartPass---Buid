import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex h-screen items-center justify-center bg-[var(--sp-subtle)] p-4">
          <div className="w-full max-w-sm sp-squircle-xl bg-[var(--sp-surface)] p-8 text-center space-y-4 shadow-lg">
            <div className="text-5xl">⚠️</div>
            <h2 className="text-xl font-bold text-[var(--sp-text)]">Something went wrong</h2>
            <p className="text-sm text-[var(--sp-text-muted)] break-words">
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full sp-squircle-lg bg-[var(--sp-primary)] hover:bg-[var(--sp-primary-hover)] text-[var(--sp-on-primary)] font-semibold py-2.5 text-sm transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
