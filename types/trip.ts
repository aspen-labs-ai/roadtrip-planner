export const DAY_ORDER = ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export type DayKey = (typeof DAY_ORDER)[number]

export const DAY_LABELS: Record<DayKey, string> = {
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

export type ActivityType = 'travel' | 'food' | 'lodging' | 'activity'

export interface Activity {
  id: string
  name: string
  day: DayKey
  type: ActivityType
  start: number
  end: number
  location: string
  notes: string
}

export interface ActivityDraft {
  name: string
  day: DayKey
  type: ActivityType
  start: number
  end: number
  location: string
  notes: string
}
