'use client'

import { useEffect, useMemo, useState } from 'react'

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

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-xl rounded-t-3xl border border-slate-200/70 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              {mode === 'create' ? 'Add Activity' : 'Edit Activity'}
            </h2>
            <p className="text-sm text-slate-500">Tap fields and save to update your timeline.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
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
          <label className="block text-sm font-medium text-slate-700">
            Activity Name
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              required
              placeholder="Old Montreal Walk"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-sm font-medium text-slate-700">
              Day
              <select
                value={draft.day}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, day: event.target.value as DayKey }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              >
                {DAY_ORDER.map((day) => (
                  <option key={day} value={day}>
                    {DAY_LABELS[day]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
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
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
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
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Type
            <select
              value={draft.type}
              onChange={(event) =>
                setDraft((current) => ({ ...current, type: event.target.value as ActivityType }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Location
            <input
              value={draft.location}
              onChange={(event) =>
                setDraft((current) => ({ ...current, location: event.target.value }))
              }
              required
              placeholder="Toronto, ON"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Notes
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Reservation details, parking, checklist..."
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </label>

          {invalidRange ? (
            <p className="text-sm font-medium text-rose-600">End time must be after start time.</p>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-2">
            {mode === 'edit' && activity ? (
              <button
                type="button"
                onClick={() => onDelete(activity.id)}
                className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Delete
              </button>
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={invalidRange}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Save Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
