import type { PointerEvent, RefObject } from 'react'

import { ActivityCard } from '@/components/planner/activity-card'
import {
  formatClock,
  formatDuration,
  HOUR_MARKERS,
  MIN_ACTIVITY_DURATION,
  TIMELINE_END_MINUTE,
  TIMELINE_START_MINUTE,
} from '@/lib/time-utils'
import { Activity, DayKey, DAY_LABELS, DAY_ORDER } from '@/types/trip'

export const TIMELINE_PIXELS_PER_MINUTE = 1
export const TIMELINE_TIME_GUTTER_WIDTH = 72
export const TIMELINE_HEIGHT =
  (TIMELINE_END_MINUTE - TIMELINE_START_MINUTE) * TIMELINE_PIXELS_PER_MINUTE

interface TimelineGridProps {
  columnsRef: RefObject<HTMLDivElement>
  selectedDay: DayKey
  totalDrivePerDay: Record<DayKey, number>
  groupedActivities: Record<DayKey, Activity[]>
  driveMinutesIntoActivity: Record<string, number>
  draggingId: string | null
  onSelectDay: (day: DayKey) => void
  onActivityOpen: (activity: Activity) => void
  onActivityMovePointerDown: (event: PointerEvent<HTMLElement>, activity: Activity) => void
  onActivityResizeStartPointerDown: (event: PointerEvent<HTMLElement>, activity: Activity) => void
  onActivityResizeEndPointerDown: (event: PointerEvent<HTMLElement>, activity: Activity) => void
}

export function TimelineGrid({
  columnsRef,
  selectedDay,
  totalDrivePerDay,
  groupedActivities,
  driveMinutesIntoActivity,
  draggingId,
  onSelectDay,
  onActivityOpen,
  onActivityMovePointerDown,
  onActivityResizeStartPointerDown,
  onActivityResizeEndPointerDown,
}: TimelineGridProps) {
  return (
    <div className="overflow-auto rounded-3xl">
      <div className="min-w-[980px]">
        <div className="sticky top-0 z-20 grid grid-cols-[72px_repeat(6,minmax(150px,1fr))] border-b border-slate-200 bg-slate-50/95 backdrop-blur">
          <div className="border-r border-slate-200 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            Time
          </div>

          {DAY_ORDER.map((day) => {
            const isActiveDay = day === selectedDay

            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay(day)}
                className={`border-r border-slate-200 px-3 py-3 text-left transition last:border-r-0 ${
                  isActiveDay ? 'bg-cyan-50' : 'hover:bg-slate-100'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{DAY_LABELS[day]}</p>
                <p className="text-xs text-slate-500">Drive {formatDuration(totalDrivePerDay[day])}</p>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-[72px_repeat(6,minmax(150px,1fr))]" ref={columnsRef}>
          <div
            className="relative border-r border-slate-200 bg-slate-50/70"
            style={{ height: TIMELINE_HEIGHT }}
          >
            {HOUR_MARKERS.map((hour) => {
              const top = (hour * 60 - TIMELINE_START_MINUTE) * TIMELINE_PIXELS_PER_MINUTE
              const label = formatClock(hour * 60)

              return (
                <div key={hour} className="absolute left-0 right-0 border-t border-slate-200" style={{ top }}>
                  <span className="absolute -top-2 right-1 text-[10px] font-medium text-slate-500">
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          {DAY_ORDER.map((day) => (
            <div
              key={day}
              className="relative border-r border-slate-200 last:border-r-0"
              style={{ height: TIMELINE_HEIGHT }}
            >
              {HOUR_MARKERS.map((hour) => {
                const top = (hour * 60 - TIMELINE_START_MINUTE) * TIMELINE_PIXELS_PER_MINUTE
                return (
                  <div
                    key={`${day}-${hour}`}
                    className="pointer-events-none absolute left-0 right-0 border-t border-slate-200/70"
                    style={{ top }}
                  />
                )
              })}

              {groupedActivities[day].map((activity) => {
                const top = (activity.start - TIMELINE_START_MINUTE) * TIMELINE_PIXELS_PER_MINUTE
                const height = Math.max(
                  MIN_ACTIVITY_DURATION * TIMELINE_PIXELS_PER_MINUTE,
                  (activity.end - activity.start) * TIMELINE_PIXELS_PER_MINUTE,
                )

                return (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    top={top}
                    height={height}
                    driveInto={driveMinutesIntoActivity[activity.id]}
                    isDragging={draggingId === activity.id}
                    onOpen={onActivityOpen}
                    onMovePointerDown={onActivityMovePointerDown}
                    onResizeStartPointerDown={onActivityResizeStartPointerDown}
                    onResizeEndPointerDown={onActivityResizeEndPointerDown}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
