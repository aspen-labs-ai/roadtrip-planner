'use client'

import { useEffect, useId, useMemo, useState } from 'react'

import { fromTimeInputValue, toTimeInputValue } from '@/lib/time-utils'
import { Activity, ActivityDraft, ActivityType, DayKey, DAY_LABELS, DAY_ORDER } from '@/types/trip'

interface ActivityDialogProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  seed: {
    day: DayKey
    start: number
    end: number
  }
  activity: Activity | null
  onSave: (draft: ActivityDraft, existingId: string | null) => void
  onDelete: (activityId: string) => void
  onClose: () => void
}

const TYPE_OPTIONS: Array<{ value: ActivityType; label: string }> = [
  { value: 'travel', label: 'Travel / Driving' },
  { value: 'food', label: 'Food' },
  { value: 'lodging', label: 'Lodging' },
  { value: 'activity', label: 'Activity' },
]

const FIELD_CLASS_NAME =
  'mt-1.5 w-full rounded-xl border border-border/80 bg-background-alt/70 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/35'

function toDraft(activity: Activity): ActivityDraft {
  return {
    name: activity.name,
    day: activity.day,
    type: activity.type,
    start: activity.start,
    end: activity.end,
    location: activity.location,
    notes: activity.notes,
  }
}

function buildSeedDraft(seed: ActivityDialogProps['seed']): ActivityDraft {
  return {
    name: '',
    day: seed.day,
    type: 'activity',
    start: seed.start,
    end: seed.end,
    location: '',
    notes: '',
  }
}

export function ActivityDialog({
  isOpen,
  mode,
  seed,
  activity,
  onSave,
  onDelete,
  onClose,
}: ActivityDialogProps) {
  const [draft, setDraft] = useState<ActivityDraft>(buildSeedDraft(seed))
  const headingId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (activity) {
      setDraft(toDraft(activity))
      return
    }

    setDraft(buildSeedDraft(seed))
  }, [activity, isOpen, seed])

  const startTimeInput = useMemo(() => toTimeInputValue(draft.start), [draft.start])
  const endTimeInput = useMemo(() => toTimeInputValue(draft.end), [draft.end])
  const invalidRange = draft.end <= draft.start

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-end justify-center px-2 pb-0 pt-4 sm:items-center sm:px-6 sm:pb-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        className="activity-sheet-enter flex w-full max-w-2xl flex-col rounded-t-[1.75rem] border border-border/70 bg-surface/85 shadow-glow backdrop-blur-xl sm:max-h-[min(88dvh,860px)] sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="px-4 pb-3 pt-3 sm:hidden">
          <span className="mx-auto block h-1.5 w-14 rounded-full bg-foreground-muted/50" />
        </div>

        <div className="activity-sheet-safe max-h-[85dvh] overflow-y-auto px-4 pb-4 sm:max-h-[min(88dvh,860px)] sm:px-7 sm:pt-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="space-y-1 pr-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent/90">
                {mode === 'create' ? 'Create Activity' : 'Edit Activity'}
              </p>
              <h2 id={headingId} className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {mode === 'create' ? 'Add Activity' : 'Update Activity'}
              </h2>
              <p id={descriptionId} className="text-sm text-foreground-muted">
                Tap fields and save to update your timeline.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-border bg-background-alt/80 px-4 py-2 text-sm font-medium text-foreground transition hover:border-border-strong hover:bg-surface-strong"
            >
              Close
            </button>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (invalidRange) {
                return
              }

              onSave(draft, activity?.id ?? null)
            }}
          >
            <label className="block text-sm font-medium text-foreground">
              Activity Name
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                required
                placeholder="Old Montreal Walk"
                className={FIELD_CLASS_NAME}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium text-foreground">
                Day
                <select
                  value={draft.day}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, day: event.target.value as DayKey }))
                  }
                  className={FIELD_CLASS_NAME}
                >
                  {DAY_ORDER.map((day) => (
                    <option key={day} value={day}>
                      {DAY_LABELS[day]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-foreground">
                Start
                <input
                  type="time"
                  value={startTimeInput}
                  onChange={(event) => {
                    const value = fromTimeInputValue(event.target.value)
                    if (value === null) {
                      return
                    }

                    setDraft((current) => ({ ...current, start: value }))
                  }}
                  aria-invalid={invalidRange}
                  className={FIELD_CLASS_NAME}
                />
              </label>

              <label className="block text-sm font-medium text-foreground">
                End
                <input
                  type="time"
                  value={endTimeInput}
                  onChange={(event) => {
                    const value = fromTimeInputValue(event.target.value)
                    if (value === null) {
                      return
                    }

                    setDraft((current) => ({ ...current, end: value }))
                  }}
                  aria-invalid={invalidRange}
                  className={FIELD_CLASS_NAME}
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-foreground">
              Type
              <select
                value={draft.type}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, type: event.target.value as ActivityType }))
                }
                className={FIELD_CLASS_NAME}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-foreground">
              Location
              <input
                value={draft.location}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, location: event.target.value }))
                }
                required
                placeholder="Toronto, ON"
                className={FIELD_CLASS_NAME}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Notes
              <textarea
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Reservation details, parking, checklist..."
                rows={4}
                className={FIELD_CLASS_NAME}
              />
            </label>

            {invalidRange ? (
              <p
                role="alert"
                className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200"
              >
                End time must be after start time.
              </p>
            ) : null}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              {mode === 'edit' && activity ? (
                <button
                  type="button"
                  onClick={() => onDelete(activity.id)}
                  className="rounded-xl border border-rose-400/70 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
                >
                  Delete Activity
                </button>
              ) : (
                <span className="hidden sm:block" />
              )}

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border bg-background-alt/80 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-border-strong hover:bg-surface-strong"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invalidRange}
                  className="rounded-xl border border-accent/70 bg-accent/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-accent disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-strong disabled:text-foreground-muted"
                >
                  Save Activity
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
