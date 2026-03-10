import {
  useEffect,
  useMemo,
  useRef,
  type PointerEvent,
  type RefObject,
  type TouchEvent,
  type WheelEvent,
} from 'react'

import { ActivityCard } from '@/components/planner/activity-card'
import {
  clampTimelinePixelsPerMinute,
  formatClock,
  formatDuration,
  HOUR_MARKERS,
  MIN_ACTIVITY_DURATION,
  normalizeTimelinePixelsPerMinute,
  TIMELINE_BASE_PIXELS_PER_MINUTE,
  TIMELINE_MAX_PIXELS_PER_MINUTE,
  TIMELINE_MIN_PIXELS_PER_MINUTE,
  TIMELINE_ZOOM_STEP,
  timelineHeight,
  timelinePixelsForMinute,
} from '@/lib/time-utils'
import { Activity, DayKey, DAY_LABELS, DAY_ORDER } from '@/types/trip'

export const TIMELINE_TIME_GUTTER_WIDTH = 72
const DAY_COLUMN_MIN_WIDTH = 220
const MOBILE_BREAKPOINT = 1024

type PinchState = {
  startDistance: number
  startPixelsPerMinute: number
}

interface TimelineGridProps {
  columnsRef: RefObject<HTMLDivElement>
  selectedDay: DayKey
  timelinePixelsPerMinute: number
  totalDrivePerDay: Record<DayKey, number>
  groupedActivities: Record<DayKey, Activity[]>
  driveMinutesIntoActivity: Record<string, number>
  draggingId: string | null
  onSelectDay: (day: DayKey) => void
  onTimelineScaleChange: (pixelsPerMinute: number) => void
  onActivityOpen: (activity: Activity) => void
  onActivityMovePointerDown: (event: PointerEvent<HTMLElement>, activity: Activity) => void
  onActivityResizeStartPointerDown: (event: PointerEvent<HTMLElement>, activity: Activity) => void
  onActivityResizeEndPointerDown: (event: PointerEvent<HTMLElement>, activity: Activity) => void
}

function touchDistance(event: TouchEvent<HTMLDivElement>): number {
  if (event.touches.length < 2) {
    return 0
  }

  const first = event.touches[0]
  const second = event.touches[1]
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
}

export function TimelineGrid({
  columnsRef,
  selectedDay,
  timelinePixelsPerMinute,
  totalDrivePerDay,
  groupedActivities,
  driveMinutesIntoActivity,
  draggingId,
  onSelectDay,
  onTimelineScaleChange,
  onActivityOpen,
  onActivityMovePointerDown,
  onActivityResizeStartPointerDown,
  onActivityResizeEndPointerDown,
}: TimelineGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const dayColumnRefs = useRef<Partial<Record<DayKey, HTMLDivElement | null>>>({})
  const pinchRef = useRef<PinchState | null>(null)
  const scrollFrameRef = useRef<number | null>(null)

  const timelineGridTemplate = useMemo(
    () => `${TIMELINE_TIME_GUTTER_WIDTH}px repeat(${DAY_ORDER.length}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
    [],
  )
  const timelineGridMinWidth = TIMELINE_TIME_GUTTER_WIDTH + DAY_ORDER.length * DAY_COLUMN_MIN_WIDTH
  const currentTimelineHeight = timelineHeight(timelinePixelsPerMinute)

  const applyTimelineScale = (nextPixelsPerMinute: number) => {
    const normalized = normalizeTimelinePixelsPerMinute(clampTimelinePixelsPerMinute(nextPixelsPerMinute))
    if (Math.abs(normalized - timelinePixelsPerMinute) < 0.01) {
      return
    }

    onTimelineScaleChange(normalized)
  }

  const syncSelectedDayToScroll = () => {
    const container = scrollContainerRef.current
    if (!container) {
      return
    }

    const viewportCenter = container.scrollLeft + container.clientWidth / 2
    let closestDay = selectedDay
    let shortestDistance = Number.POSITIVE_INFINITY

    for (const day of DAY_ORDER) {
      const column = dayColumnRefs.current[day]
      if (!column) {
        continue
      }

      const center = column.offsetLeft + column.offsetWidth / 2
      const distance = Math.abs(center - viewportCenter)

      if (distance < shortestDistance) {
        shortestDistance = distance
        closestDay = day
      }
    }

    if (closestDay !== selectedDay) {
      onSelectDay(closestDay)
    }
  }

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= MOBILE_BREAKPOINT) {
      return
    }

    const container = scrollContainerRef.current
    const selectedColumn = dayColumnRefs.current[selectedDay]
    if (!container || !selectedColumn) {
      return
    }

    const targetScrollLeft = Math.max(0, selectedColumn.offsetLeft - TIMELINE_TIME_GUTTER_WIDTH)
    if (Math.abs(targetScrollLeft - container.scrollLeft) < 2) {
      return
    }

    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    container.scrollTo({ left: targetScrollLeft, behavior })
  }, [selectedDay])

  const canZoomOut = timelinePixelsPerMinute > TIMELINE_MIN_PIXELS_PER_MINUTE + 0.001
  const canZoomIn = timelinePixelsPerMinute < TIMELINE_MAX_PIXELS_PER_MINUTE - 0.001
  const zoomPercent = Math.round((timelinePixelsPerMinute / TIMELINE_BASE_PIXELS_PER_MINUTE) * 100)

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) {
      return
    }

    pinchRef.current = {
      startDistance: touchDistance(event),
      startPixelsPerMinute: timelinePixelsPerMinute,
    }
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const pinch = pinchRef.current
    if (!pinch || event.touches.length < 2 || pinch.startDistance <= 0) {
      return
    }

    const nextDistance = touchDistance(event)
    if (nextDistance <= 0) {
      return
    }

    event.preventDefault()
    applyTimelineScale(pinch.startPixelsPerMinute * (nextDistance / pinch.startDistance))
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      return
    }

    pinchRef.current = null
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) {
      return
    }

    event.preventDefault()
    applyTimelineScale(timelinePixelsPerMinute - event.deltaY * 0.002)
  }

  const handleTimelineScroll = () => {
    if (scrollFrameRef.current !== null) {
      return
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null
      syncSelectedDayToScroll()
    })
  }

  return (
    <div
      ref={scrollContainerRef}
      className="overflow-auto rounded-3xl overscroll-x-contain scroll-smooth"
      onScroll={handleTimelineScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onWheel={handleWheel}
      style={{
        scrollSnapType: 'x mandatory',
        scrollPaddingLeft: TIMELINE_TIME_GUTTER_WIDTH,
        touchAction: 'pan-x pan-y',
      }}
    >
      <div style={{ minWidth: timelineGridMinWidth }}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-100/95 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Swipe days and pinch timeline zoom
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyTimelineScale(timelinePixelsPerMinute - TIMELINE_ZOOM_STEP)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Zoom out timeline"
              disabled={!canZoomOut}
            >
              -
            </button>
            <button
              type="button"
              onClick={() => applyTimelineScale(TIMELINE_BASE_PIXELS_PER_MINUTE)}
              className="inline-flex h-11 min-w-16 items-center justify-center rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              aria-label="Reset timeline zoom"
            >
              {zoomPercent}%
            </button>
            <button
              type="button"
              onClick={() => applyTimelineScale(timelinePixelsPerMinute + TIMELINE_ZOOM_STEP)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Zoom in timeline"
              disabled={!canZoomIn}
            >
              +
            </button>
          </div>
        </div>

        <div className="sticky top-0 z-20 grid border-b border-slate-200 bg-slate-50/95 backdrop-blur" style={{ gridTemplateColumns: timelineGridTemplate }}>
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
                style={{ scrollSnapAlign: 'start' }}
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

        <div className="grid" style={{ gridTemplateColumns: timelineGridTemplate }} ref={columnsRef}>
          <div
            className="relative border-r border-slate-200 bg-slate-50/70"
            style={{ height: currentTimelineHeight }}
          >
            {HOUR_MARKERS.map((hour) => {
              const top = timelinePixelsForMinute(hour * 60, timelinePixelsPerMinute)
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
              ref={(node) => {
                dayColumnRefs.current[day] = node
              }}
              style={{
                height: currentTimelineHeight,
                scrollSnapAlign: 'start',
              }}
              className={`relative border-r border-slate-200 last:border-r-0 ${
                day === selectedDay ? 'bg-cyan-50/30' : ''
              }`}
            >
              {HOUR_MARKERS.map((hour) => {
                const top = timelinePixelsForMinute(hour * 60, timelinePixelsPerMinute)
                return (
                  <div
                    key={`${day}-${hour}`}
                    className="pointer-events-none absolute left-0 right-0 border-t border-slate-200/70"
                    style={{ top }}
                  />
                )
              })}

              {groupedActivities[day].map((activity) => {
                const top = timelinePixelsForMinute(activity.start, timelinePixelsPerMinute)
                const height = Math.max(
                  MIN_ACTIVITY_DURATION * timelinePixelsPerMinute,
                  (activity.end - activity.start) * timelinePixelsPerMinute,
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
