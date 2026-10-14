const STYLES: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  late:    'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300',
  absent:  'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300',
  excused: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
}

export function StatusPill({ status }: { status: string }) {
  const cls = STYLES[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  )
}
