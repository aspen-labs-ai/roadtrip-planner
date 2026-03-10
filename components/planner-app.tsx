'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { ActivityDialog } from '@/components/activity-dialog'
import { DayActions } from '@/components/planner/day-actions'
import { PlannerShell } from '@/components/planner/planner-shell'
import {
  TIMELINE_PIXELS_PER_MINUTE,
  TIMELINE_TIME_GUTTER_WIDTH,
  TimelineGrid,
} from '@/components/planner/timeline-grid'
import { driveKey, estimateDriveMinutes } from '@/lib/drive-time'
import {
  clamp,
  DRAG_SNAP_MINUTES,
  formatDuration,
  MIN_ACTIVITY_DURATION,
  snapToStep,
  TIMELINE_END_MINUTE,
  TIMELINE_START_MINUTE,
} from '@/lib/time-utils'
import {
  normalizeDraft,
  normalizeStoredActivities,
  ROUTE_STOPS,
  SAMPLE_ACTIVITIES,
  STORAGE_KEY,
} from '@/lib/trip-data'
import { Activity, ActivityDraft, DayKey, DAY_ORDER } from '@/types/trip'

const QUICK_ADD_DURATION = 90

type EditorState = {
  mode: 'create' | 'edit'
  activityId: string | null
  seed: {
    day: DayKey
    start: number
    end: number
  }
}

type DragMode = 'move' | 'resize-start' | 'resize-end'

type DragMeta = {
  activityId: string
  mode: DragMode
  originX: number
  originY: number
  initialStart: number
  initialEnd: number
  initialDayIndex: number
  dayWidth: number
  moved: boolean
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function byDayThenTime(first: Activity, second: Activity): number {
  const firstDay = DAY_ORDER.indexOf(first.day)
  const secondDay = DAY_ORDER.indexOf(second.day)

  if (firstDay !== secondDay) {
    return firstDay - secondDay
  }

  if (first.start !== second.start) {
    return first.start - second.start
  }

  return first.name.localeCompare(second.name)
}

function nextSlotForDay(day: DayKey, activities: Activity[]): { start: number; end: number } {
  const dayActivities = activities.filter((activity) => activity.day === day).sort((a, b) => a.end - b.end)
  if (dayActivities.length === 0) {
    return { start: 9 * 60, end: 10 * 60 + 30 }
  }

  const candidateStart = clamp(
    dayActivities[dayActivities.length - 1].end + 15,
    TIMELINE_START_MINUTE,
    TIMELINE_END_MINUTE - QUICK_ADD_DURATION,
  )

  return {
    start: candidateStart,
    end: clamp(candidateStart + QUICK_ADD_DURATION, candidateStart + MIN_ACTIVITY_DURATION, TIMELINE_END_MINUTE),
  }
}

function toEditorSeed(activity: Activity) {
  return {
    day: activity.day,
    start: activity.start,
    end: activity.end,
  }
}

export function PlannerApp() {
  const [activities, setActivities] = useState<Activity[]>(SAMPLE_ACTIVITIES)
  const [isHydrated, setIsHydrated] = useState(false)
  const [selectedDay, setSelectedDay] = useState<DayKey>('tue')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [driveTimes, setDriveTimes] = useState<Record<string, number>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const columnsRef = useRef<HTMLDivElement>(null)
  const suppressClickRef = useRef<string | null>(null)
  const dragRef = useRef<DragMeta | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setActivities(normalizeStoredActivities(parsed))
      }
    } catch {
      setActivities(SAMPLE_ACTIVITIES)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities))
  }, [activities, isHydrated])

  const sortedActivities = useMemo(() => {
    return [...activities].sort(byDayThenTime)
  }, [activities])

  const groupedActivities = useMemo(() => {
    return DAY_ORDER.reduce(
      (groups, day) => {
        groups[day] = sortedActivities.filter((activity) => activity.day === day)
        return groups
      },
      {} as Record<DayKey, Activity[]>,
    )
  }, [sortedActivities])

  const legs = useMemo(() => {
    const computed: Array<{ key: string; from: string; to: string; activityId: string }> = []

    for (let index = 1; index < sortedActivities.length; index += 1) {
      const previous = sortedActivities[index - 1]
      const current = sortedActivities[index]
      if (!previous.location || !current.location) {
        continue
      }

      const key = driveKey(previous.location, current.location)
      computed.push({ key, from: previous.location, to: current.location, activityId: current.id })
    }

    return computed
  }, [sortedActivities])

  useEffect(() => {
    let cancelled = false

    const missing = legs.filter((leg) => driveTimes[leg.key] === undefined)
    if (missing.length === 0) {
      return
    }

    const compute = async () => {
      for (const leg of missing) {
        const minutes = await estimateDriveMinutes(leg.from, leg.to)
        if (cancelled || minutes === null) {
          continue
        }

        setDriveTimes((current) => {
          if (current[leg.key] !== undefined) {
            return current
          }

          return { ...current, [leg.key]: minutes }
        })
      }
    }

    compute()

    return () => {
      cancelled = true
    }
  }, [driveTimes, legs])

  const driveMinutesIntoActivity = useMemo(() => {
    const lookup: Record<string, number> = {}

    for (const leg of legs) {
      const minutes = driveTimes[leg.key]
      if (minutes === undefined) {
        continue
      }

      lookup[leg.activityId] = minutes
    }

    return lookup
  }, [driveTimes, legs])

  const totalDrivePerDay = useMemo(() => {
    const totals = DAY_ORDER.reduce(
      (result, day) => {
        result[day] = 0
        return result
      },
      {} as Record<DayKey, number>,
    )

    for (const activity of sortedActivities) {
      totals[activity.day] += driveMinutesIntoActivity[activity.id] ?? 0
    }

    return totals
  }, [driveMinutesIntoActivity, sortedActivities])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) {
        return
      }

      event.preventDefault()
      const deltaY = event.clientY - drag.originY
      const snappedDeltaMinutes = snapToStep(deltaY / TIMELINE_PIXELS_PER_MINUTE, DRAG_SNAP_MINUTES)

      if (Math.abs(deltaY) >= 4) {
        drag.moved = true
      }

      setActivities((current) =>
        current.map((activity) => {
          if (activity.id !== drag.activityId) {
            return activity
          }

          if (drag.mode === 'move') {
            const duration = drag.initialEnd - drag.initialStart
            const shiftedStart = clamp(
              drag.initialStart + snappedDeltaMinutes,
              TIMELINE_START_MINUTE,
              TIMELINE_END_MINUTE - duration,
            )
            const shiftedEnd = shiftedStart + duration

            const dayOffset = Math.round((event.clientX - drag.originX) / drag.dayWidth)
            const nextDayIndex = clamp(drag.initialDayIndex + dayOffset, 0, DAY_ORDER.length - 1)

            return {
              ...activity,
              day: DAY_ORDER[nextDayIndex],
              start: shiftedStart,
              end: shiftedEnd,
            }
          }

          if (drag.mode === 'resize-start') {
            const resizedStart = clamp(
              drag.initialStart + snappedDeltaMinutes,
              TIMELINE_START_MINUTE,
              activity.end - MIN_ACTIVITY_DURATION,
            )

            return {
              ...activity,
              start: resizedStart,
            }
          }

          const resizedEnd = clamp(
            drag.initialEnd + snappedDeltaMinutes,
            activity.start + MIN_ACTIVITY_DURATION,
            TIMELINE_END_MINUTE,
          )

          return {
            ...activity,
            end: resizedEnd,
          }
        }),
      )
    }

    const handlePointerStop = () => {
      const drag = dragRef.current
      if (!drag) {
        return
      }

      if (drag.moved) {
        suppressClickRef.current = drag.activityId
      }

      dragRef.current = null
      setDraggingId(null)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerStop)
    window.addEventListener('pointercancel', handlePointerStop)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerStop)
      window.removeEventListener('pointercancel', handlePointerStop)
    }
  }, [])

  const selectedActivity = useMemo(() => {
    if (!editor?.activityId) {
      return null
    }

    return activities.find((activity) => activity.id === editor.activityId) ?? null
  }, [activities, editor?.activityId])

  const openCreateDialog = (day: DayKey) => {
    const slot = nextSlotForDay(day, activities)
    setSelectedDay(day)
    setEditor({
      mode: 'create',
      activityId: null,
      seed: {
        day,
        start: slot.start,
        end: slot.end,
      },
    })
  }

  const openEditDialog = (activity: Activity) => {
    setEditor({
      mode: 'edit',
      activityId: activity.id,
      seed: toEditorSeed(activity),
    })
  }

  const saveActivity = (draft: ActivityDraft, existingId: string | null) => {
    const normalized = normalizeDraft(draft)

    if (existingId) {
      setActivities((current) =>
        current.map((activity) => {
          if (activity.id !== existingId) {
            return activity
          }

          return {
            ...activity,
            ...normalized,
          }
        }),
      )
    } else {
      setActivities((current) => [
        ...current,
        {
          id: generateId(),
          ...normalized,
        },
      ])
    }

    setEditor(null)
  }

  const deleteActivity = (activityId: string) => {
    setActivities((current) => current.filter((activity) => activity.id !== activityId))
    setEditor(null)
  }

  const startDrag = (event: ReactPointerEvent<HTMLElement>, activity: Activity, mode: DragMode) => {
    if (mode !== 'move') {
      event.preventDefault()
    }
    event.stopPropagation()

    const totalWidth = columnsRef.current?.getBoundingClientRect().width ?? 1130
    const columnWidth = (totalWidth - TIMELINE_TIME_GUTTER_WIDTH) / DAY_ORDER.length

    dragRef.current = {
      activityId: activity.id,
      mode,
      originX: event.clientX,
      originY: event.clientY,
      initialStart: activity.start,
      initialEnd: activity.end,
      initialDayIndex: DAY_ORDER.indexOf(activity.day),
      dayWidth: Math.max(130, columnWidth),
      moved: false,
    }

    setDraggingId(activity.id)
  }

  const handleOpenActivity = (activity: Activity) => {
    if (suppressClickRef.current === activity.id) {
      suppressClickRef.current = null
      return
    }

    openEditDialog(activity)
  }

  const handleMovePointerDown = (event: ReactPointerEvent<HTMLElement>, activity: Activity) => {
    startDrag(event, activity, 'move')
  }

  const handleResizeStartPointerDown = (event: ReactPointerEvent<HTMLElement>, activity: Activity) => {
    startDrag(event, activity, 'resize-start')
  }

  const handleResizeEndPointerDown = (event: ReactPointerEvent<HTMLElement>, activity: Activity) => {
    startDrag(event, activity, 'resize-end')
  }

  const totalActivities = activities.length
  const totalTripDrive = DAY_ORDER.reduce((sum, day) => sum + totalDrivePerDay[day], 0)

  return (
    <>
      <PlannerShell
        routeStops={ROUTE_STOPS}
        totalActivities={totalActivities}
        totalTripDrive={formatDuration(totalTripDrive)}
        timeline={
          <TimelineGrid
            columnsRef={columnsRef}
            selectedDay={selectedDay}
            totalDrivePerDay={totalDrivePerDay}
            groupedActivities={groupedActivities}
            driveMinutesIntoActivity={driveMinutesIntoActivity}
            draggingId={draggingId}
            onSelectDay={setSelectedDay}
            onActivityOpen={handleOpenActivity}
            onActivityMovePointerDown={handleMovePointerDown}
            onActivityResizeStartPointerDown={handleResizeStartPointerDown}
            onActivityResizeEndPointerDown={handleResizeEndPointerDown}
          />
        }
        dayActions={<DayActions selectedDay={selectedDay} onAddForDay={openCreateDialog} />}
        onQuickAdd={() => openCreateDialog(selectedDay)}
      />

      <ActivityDialog
        isOpen={Boolean(editor)}
        mode={editor?.mode ?? 'create'}
        seed={
          editor?.seed ?? {
            day: selectedDay,
            start: 9 * 60,
            end: 10 * 60 + 30,
          }
        }
        activity={selectedActivity}
        onSave={saveActivity}
        onDelete={deleteActivity}
        onClose={() => setEditor(null)}
      />
    </>
  )
}
