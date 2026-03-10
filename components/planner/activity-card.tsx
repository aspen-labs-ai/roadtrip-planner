import type { KeyboardEvent, PointerEvent } from 'react'

import { formatClock, formatDuration } from '@/lib/time-utils'
import { Activity, ActivityType } from '@/types/trip'

const TYPE_STYLES: Record<
  ActivityType,
  { card: string; badge: string; label: string }
> = {
  travel: {
    card: 'bg-amber-100/95 border-amber-300 text-amber-950',
    badge: 'bg-amber-500',
    label: 'Travel',
  },
  food: {
    card: 'bg-rose-100/95 border-rose-300 text-rose-950',
    badge: 'bg-rose-500',
    label: 'Food',
  },
  lodging: {
    card: 'bg-sky-100/95 border-sky-300 text-sky-950',
    badge: 'bg-sky-500',
    label: 'Lodging',
  },
  activity: {
    card: 'bg-emerald-100/95 border-emerald-300 text-emerald-950',
    badge: 'bg-emerald-500',
    label: 'Activity',
  },
}

interface ActivityCardProps {
  activity: Activity
  top: number
  height: number
  driveInto?: number
  isDragging: boolean
  onOpen: (activity: Activity) => void
  onMovePointerDown: (event: PointerEvent<HTMLElement>, activity: Activity) => void
  onResizeStartPointerDown: (event: PointerEvent<HTMLElement>, activity: Activity) => void
  onResizeEndPointerDown: (event: PointerEvent<HTMLElement>, activity: Activity) => void
}

export function ActivityCard({
  activity,
  top,
  height,
  driveInto,
  isDragging,
  onOpen,
  onMovePointerDown,
  onResizeStartPointerDown,
  onResizeEndPointerDown,
}: ActivityCardProps) {
  const style = TYPE_STYLES[activity.type]

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(activity)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(activity)}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => onMovePointerDown(event, activity)}
      className={`absolute left-1 right-1 rounded-xl border px-2 py-1 shadow-sm transition ${style.card} ${
        isDragging ? 'z-20 scale-[1.01] shadow-lg' : 'z-10 hover:shadow-md'
      } touch-none`}
      style={{ top, height }}
    >
      <button
        type="button"
        onPointerDown={(event) => onResizeStartPointerDown(event, activity)}
        onClick={(event) => event.stopPropagation()}
        className="absolute left-0 right-0 top-0 h-1.5 cursor-ns-resize rounded-t-xl bg-slate-500/30"
        aria-label="Resize start"
      />

      <div className="mt-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {style.label}
          </p>
          <p className="truncate text-sm font-semibold leading-tight">{activity.name}</p>
        </div>
        <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${style.badge}`} />
      </div>

      <p className="mt-1 truncate text-xs font-medium">
        {formatClock(activity.start)} - {formatClock(activity.end)}
      </p>
      <p className="truncate text-xs text-slate-700">{activity.location}</p>

      {driveInto !== undefined ? (
        <p className="mt-1 truncate text-[11px] font-medium text-slate-700">
          Drive from previous: {formatDuration(driveInto)}
        </p>
      ) : null}

      <button
        type="button"
        onPointerDown={(event) => onResizeEndPointerDown(event, activity)}
        onClick={(event) => event.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize rounded-b-xl bg-slate-500/30"
        aria-label="Resize end"
      />
    </div>
  )
}
