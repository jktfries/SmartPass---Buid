import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DndContext, PointerSensor, KeyboardSensor, closestCenter,
  useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, arrayMove, rectSortingStrategy,
  sortableKeyboardCoordinates, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff, LayoutGrid, RotateCcw, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { DASHBOARD_WIDGETS, SPAN_CLASS, allowedSpans, effectiveSpan, resolveLayout, widgetDef } from '@/lib/dashboardWidgets'
import type { DashboardWidgetPref } from '@/api/auth'

function SortableWidget({ id, span, editing, children }: {
  id: string; span: number; editing: boolean; children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editing })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`${SPAN_CLASS[span] ?? ''} relative ${isDragging ? 'z-30 opacity-80' : ''}`}
    >
      {editing && (
        <button
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${id}`}
          className="absolute -top-2 -left-2 z-20 w-8 h-8 sp-squircle-sm bg-[var(--sp-text)] text-[var(--sp-bg)]
                     flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg"
        >
          <GripVertical size={15} />
        </button>
      )}
      <div className={editing ? 'ring-2 ring-[var(--sp-primary)] ring-offset-2 ring-offset-[var(--sp-bg)] sp-squircle-xl' : ''}>
        {children}
      </div>
    </div>
  )
}

/** Plain JSX for widgets that don't care about width; a function for the charts
 *  that need to size themselves to it. */
type WidgetRender = ReactNode | ((span: number) => ReactNode)

export default function WidgetGrid({ widgets }: { widgets: Record<string, WidgetRender> }) {
  const { user } = useAuth()
  const { setPreference } = useTheme()
  const [editing, setEditing] = useState(false)

  const role = user?.role
  const saved = role ? user?.preferences?.dashboard?.[role] : undefined

  // Local working copy so drags feel instant; committed to preferences on change.
  const [layout, setLayout] = useState<DashboardWidgetPref[]>(() =>
    role ? resolveLayout(role, saved) : []
  )

  // Re-resolve if the server copy arrives after first render.
  useMemo(() => {
    if (role) setLayout(resolveLayout(role, saved))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, JSON.stringify(saved)])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!role) return null

  function commit(next: DashboardWidgetPref[]) {
    setLayout(next)
    setPreference({ dashboard: { ...(user?.preferences?.dashboard ?? {}), [role!]: next } })
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = layout.findIndex(w => w.id === active.id)
    const to = layout.findIndex(w => w.id === over.id)
    if (from < 0 || to < 0) return
    commit(arrayMove(layout, from, to))
  }

  const toggle = (id: string) =>
    commit(layout.map(w => (w.id === id ? { ...w, visible: !w.visible } : w)))

  const setSpan = (id: string, span: 1 | 2 | 3 | 4) =>
    commit(layout.map(w => (w.id === id ? { ...w, span } : w)))

  const reset = () =>
    commit((DASHBOARD_WIDGETS[role] ?? []).map(d => ({ id: d.id, visible: true })))

  const visible = layout.filter(w => w.visible && widgets[w.id])
  const hidden = layout.filter(w => !w.visible && widgets[w.id])

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {editing && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)]
                         px-3.5 py-2 text-xs font-semibold text-[var(--sp-text-muted)] transition-colors"
            >
              <RotateCcw size={14} /> Reset layout
            </button>
          )}
        </div>
        <button
          onClick={() => setEditing(e => !e)}
          className={`flex items-center gap-1.5 sp-squircle-sm px-3.5 py-2 text-xs font-semibold transition-colors ${
            editing
              ? 'bg-[var(--sp-primary)] text-[var(--sp-on-primary)]'
              : 'bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)] text-[var(--sp-text-muted)]'
          }`}
        >
          {editing ? <><Check size={14} /> Done</> : <><LayoutGrid size={14} /> Customise</>}
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visible.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 sp-grid auto-rows-min">
            {visible.map(w => {
              const def = widgetDef(role!, w.id)
              const span = effectiveSpan(def, w)
              const render = widgets[w.id]
              return (
                <SortableWidget key={w.id} id={w.id} span={span} editing={editing}>
                  <div className="relative">
                    {editing && (
                      <>
                        <button
                          onClick={() => toggle(w.id)}
                          aria-label={`Hide ${def?.label ?? w.id}`}
                          title="Hide"
                          className="absolute -top-2 -right-2 z-20 w-8 h-8 sp-squircle-sm bg-[var(--sp-text)]
                                     text-[var(--sp-bg)] flex items-center justify-center shadow-lg"
                        >
                          <EyeOff size={14} />
                        </button>

                        {/* Size control. Widths below the widget's minSpan are
                            omitted rather than disabled — a dead control just
                            invites "why can't I click this?". */}
                        {def && allowedSpans(def).length > 1 && (
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1
                                          sp-squircle-sm bg-[var(--sp-text)] px-1.5 py-1 shadow-lg">
                            {allowedSpans(def).map(n => (
                              <button
                                key={n}
                                onClick={() => setSpan(w.id, n)}
                                aria-label={`Set ${def.label} to ${n} of 4 columns`}
                                aria-pressed={span === n}
                                title={['Quarter width', 'Half width', 'Three-quarter width', 'Full width'][n - 1]}
                                className={`h-4 sp-squircle-sm transition-colors ${
                                  span === n ? 'bg-[var(--sp-primary)]' : 'bg-[var(--sp-bg)]/35 hover:bg-[var(--sp-bg)]/60'
                                }`}
                                style={{ width: 6 + n * 5 }}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {typeof render === 'function' ? render(span) : render}
                  </div>
                </SortableWidget>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {editing && hidden.length > 0 && (
        <div className="sp-block p-5">
          <p className="text-sm font-semibold text-[var(--sp-text)] mb-3">Hidden widgets</p>
          <div className="flex flex-wrap gap-2">
            {hidden.map(w => (
              <button
                key={w.id}
                onClick={() => toggle(w.id)}
                className="flex items-center gap-2 sp-squircle-sm bg-[var(--sp-subtle)] hover:bg-[var(--sp-hover-bg)]
                           px-3.5 py-2 text-xs font-semibold text-[var(--sp-text)] transition-colors"
              >
                <Eye size={14} /> {widgetDef(role!, w.id)?.label ?? w.id}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
