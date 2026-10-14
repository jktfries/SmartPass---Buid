import type { ReactNode } from 'react'

interface TableProps {
  headers: string[]
  children: ReactNode
  empty?: boolean
  emptyMessage?: string
}

export default function Table({ headers, children, empty, emptyMessage = 'No records found.' }: TableProps) {
  return (
    <div className="overflow-x-auto sp-squircle-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--sp-subtle)] text-[var(--sp-text-muted)]">
          <tr>
            {headers.map(h => (
              <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--sp-border)]">
          {empty ? (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center text-[var(--sp-text-muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : children}
        </tbody>
      </table>
    </div>
  )
}
