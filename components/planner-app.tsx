'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { ActivityDialog } from '@/components/activity-dialog'
import { driveKey, estimateDriveMinutes } from '@/lib/drive-time'
import {
  clamp,
  DRAG_SNAP_MINUTES,
  formatClock,
  formatDuration,
  HOUR_MARKERS,
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
import { Activity, ActivityDraft, ActivityType, DayKey, DAY_LABELS, DAY_ORDER } from '@/types/trip'

const PIXELS_PER_MINUTE = 1
const TIMELINE_HEIGHT = (TIMELINE_END_MINUTE - TIMELINE_START_MINUTE) * PIXELS_PER_MINUTE
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

export function PlannerApp() {
  const [activities, setActivities] = useState<Activity[]>(SAMPLE_ACTIVITIES)
  const [isHydrated, setIsHydrated] = useState(false)
  const [selectedDay, setSelectedDay] = useState<DayKey>('tue')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [driveTimes, setDriveTimes] = useState<Record<string, number>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const columnsRef = useRef<HTMLDivElement | null>(null)
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
      const snappedDeltaMinutes = snapToStep(deltaY / PIXELS_PER_MINUTE, DRAG_SNAP_MINUTES)

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

  const startDrag = (event: React.PointerEvent<HTMLElement>, activity: Activity, mode: DragMode) => {
    if (mode !== 'move') {
      event.preventDefault()
    }
    event.stopPropagation()

    const totalWidth = columnsRef.current?.getBoundingClientRect().width ?? 1130
    const columnWidth = (totalWidth - 72) / DAY_ORDER.length

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

  const totalActivities = activities.length
  const totalTripDrive = DAY_ORDER.reduce((sum, day) => sum + totalDrivePerDay[day], 0)

  return (
    <main className="relative min-h-screen bg-[radial-gradient(circle_at_20%_20%,#dff5ff,transparent_40%),radial-gradient(circle_at_80%_0%,#ffe8d6,transparent_35%),linear-gradient(180deg,#f7fbff_0%,#eef4fb_100%)] px-3 pb-24 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.09)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Roadtrip Planner</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Chicago to Montreal</h1>
              <p className="max-w-2xl text-sm text-slate-600 md:text-base">
                Visual timeline for Tue-Sun planning, quick edits, and automatic drive-time rollups.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {ROUTE_STOPS.map((stop, index) => (
                  <span
                    key={stop}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {stop}
                    {index < ROUTE_STOPS.length - 1 ? <span className="ml-2 text-slate-400">→</span> : null}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-[320px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Activities</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{totalActivities}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Drive Time</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{formatDuration(totalTripDrive)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/85 shadow-[0_25px_70px_rgba(15,23,42,0.08)] backdrop-blur">
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
                      onClick={() => setSelectedDay(day)}
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
                <div className="relative border-r border-slate-200 bg-slate-50/70" style={{ height: TIMELINE_HEIGHT }}>
                  {HOUR_MARKERS.map((hour) => {
                    const top = (hour * 60 - TIMELINE_START_MINUTE) * PIXELS_PER_MINUTE
                    const label = formatClock(hour * 60)

                    return (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-slate-200"
                        style={{ top }}
                      >
                        <span className="absolute -top-2 right-1 text-[10px] font-medium text-slate-500">
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {DAY_ORDER.map((day) => (
                  <div key={day} className="relative border-r border-slate-200 last:border-r-0" style={{ height: TIMELINE_HEIGHT }}>
                    {HOUR_MARKERS.map((hour) => {
                      const top = (hour * 60 - TIMELINE_START_MINUTE) * PIXELS_PER_MINUTE
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="pointer-events-none absolute left-0 right-0 border-t border-slate-200/70"
                          style={{ top }}
                        />
                      )
                    })}

                    {groupedActivities[day].map((activity) => {
                      const top = (activity.start - TIMELINE_START_MINUTE) * PIXELS_PER_MINUTE
                      const height = Math.max(
                        MIN_ACTIVITY_DURATION * PIXELS_PER_MINUTE,
                        (activity.end - activity.start) * PIXELS_PER_MINUTE,
                      )
                      const style = TYPE_STYLES[activity.type]
                      const driveInto = driveMinutesIntoActivity[activity.id]
                      const isDragging = draggingId === activity.id

                      return (
                        <div
                          key={activity.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (suppressClickRef.current === activity.id) {
                              suppressClickRef.current = null
                              return
                            }

                            setEditor({
                              mode: 'edit',
                              activityId: activity.id,
                              seed: {
                                day: activity.day,
                                start: activity.start,
                                end: activity.end,
                              },
                            })
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              setEditor({
                                mode: 'edit',
                                activityId: activity.id,
                                seed: {
                                  day: activity.day,
                                  start: activity.start,
                                  end: activity.end,
                                },
                              })
                            }
                          }}
                          onPointerDown={(event) => startDrag(event, activity, 'move')}
                          className={`absolute left-1 right-1 rounded-xl border px-2 py-1 shadow-sm transition ${style.card} ${
                            isDragging ? 'z-20 scale-[1.01] shadow-lg' : 'z-10 hover:shadow-md'
                          } touch-none`}
                          style={{ top, height }}
                        >
                          <button
                            type="button"
                            onPointerDown={(event) => startDrag(event, activity, 'resize-start')}
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
                            onPointerDown={(event) => startDrag(event, activity, 'resize-end')}
                            onClick={(event) => event.stopPropagation()}
                            className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize rounded-b-xl bg-slate-500/30"
                            aria-label="Resize end"
                          />
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-white/70 p-3 backdrop-blur sm:grid-cols-3 md:grid-cols-6">
          {DAY_ORDER.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => openCreateDialog(day)}
              className={`rounded-xl border px-3 py-2 text-left transition ${
                selectedDay === day
                  ? 'border-cyan-400 bg-cyan-50 text-cyan-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-semibold">{DAY_LABELS[day]}</p>
              <p className="text-xs">Add activity</p>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => openCreateDialog(selectedDay)}
        className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-3xl text-white shadow-[0_18px_35px_rgba(15,23,42,0.35)] transition hover:scale-105 hover:bg-slate-800"
        aria-label="Quick add activity"
      >
        +
      </button>

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
    </main>
  )
}
