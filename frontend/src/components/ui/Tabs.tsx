interface TabDef<T extends string> {
  key: T
  label: string
}

interface TabsProps<T extends string> {
  tabs: TabDef<T>[]
  active: T
  onChange: (key: T) => void
}

export default function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  return (
    <div className="flex gap-1 sp-squircle-lg bg-[var(--sp-subtle)] p-1.5 w-fit">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`sp-squircle-sm px-4 py-1.5 text-sm font-medium transition-colors ${
            active === t.key
              ? 'bg-[var(--sp-primary)] text-[var(--sp-on-primary)] shadow'
              : 'text-[var(--sp-text-muted)] hover:text-[var(--sp-text)]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
