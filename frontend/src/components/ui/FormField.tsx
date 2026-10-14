import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}

export default function FormField({ label, required, hint, children }: FormFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--sp-text-muted)]">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[var(--sp-text-muted)]">{hint}</p>}
    </div>
  )
}
