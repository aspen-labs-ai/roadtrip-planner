import { Activity, ActivityDraft, DayKey, DAY_ORDER } from '@/types/trip'
import {
  clamp,
  MIN_ACTIVITY_DURATION,
  TIMELINE_END_MINUTE,
  TIMELINE_START_MINUTE,
} from '@/lib/time-utils'

export const STORAGE_KEY = 'roadtrip-planner:v1'

export const ROUTE_STOPS = ['Chicago', 'Detroit', 'Toronto', 'Montreal']

export const SAMPLE_ACTIVITIES: Activity[] = [
  {
    id: 'a-01',
    name: 'Breakfast at Lou Mitchell\'s',
    day: 'tue',
    type: 'food',
    start: 8 * 60,
    end: 9 * 60,
    location: 'Chicago, IL',
    notes: 'Fuel up before departure.',
  },
  {
    id: 'a-02',
    name: 'Drive to Detroit',
    day: 'tue',
    type: 'travel',
    start: 9 * 60 + 30,
    end: 14 * 60 + 30,
    location: 'Detroit, MI',
    notes: 'I-94 route with one rest stop near Kalamazoo.',
  },
  {
    id: 'a-03',
    name: 'Riverwalk + Coffee',
    day: 'tue',
    type: 'activity',
    start: 16 * 60,
    end: 17 * 60 + 30,
    location: 'Detroit, MI',
    notes: 'Stretch and unwind along the riverfront.',
  },
  {
    id: 'a-04',
    name: 'Hotel Check-in',
    day: 'tue',
    type: 'lodging',
    start: 18 * 60,
    end: 18 * 60 + 30,
    location: 'Detroit, MI',
    notes: 'Shinola Hotel.',
  },
  {
    id: 'a-05',
    name: 'Dinner in Corktown',
    day: 'tue',
    type: 'food',
    start: 19 * 60,
    end: 20 * 60 + 30,
    location: 'Detroit, MI',
    notes: 'Selden Standard reservation.',
  },
  {
    id: 'a-06',
    name: 'Coffee + Start Drive',
    day: 'wed',
    type: 'food',
    start: 8 * 60,
    end: 8 * 60 + 45,
    location: 'Detroit, MI',
    notes: 'Quick stop before border crossing.',
  },
  {
    id: 'a-07',
    name: 'Drive to Toronto',
    day: 'wed',
    type: 'travel',
    start: 9 * 60,
    end: 14 * 60,
    location: 'Toronto, ON',
    notes: 'Cross at Windsor-Detroit tunnel.',
  },
  {
    id: 'a-08',
    name: 'Distillery District Walk',
    day: 'wed',
    type: 'activity',
    start: 16 * 60,
    end: 18 * 60,
    location: 'Toronto, ON',
    notes: 'Photo stop + local shops.',
  },
  {
    id: 'a-09',
    name: 'Hotel Check-in',
    day: 'wed',
    type: 'lodging',
    start: 18 * 60 + 30,
    end: 19 * 60,
    location: 'Toronto, ON',
    notes: 'Downtown waterfront area.',
  },
  {
    id: 'a-10',
    name: 'St. Lawrence Market Lunch',
    day: 'thu',
    type: 'food',
    start: 12 * 60,
    end: 13 * 60,
    location: 'Toronto, ON',
    notes: 'Peameal bacon sandwich stop.',
  },
  {
    id: 'a-11',
    name: 'CN Tower + Harbourfront',
    day: 'thu',
    type: 'activity',
    start: 14 * 60,
    end: 17 * 60,
    location: 'Toronto, ON',
    notes: 'Late afternoon city views.',
  },
  {
    id: 'a-12',
    name: 'Drive to Montreal',
    day: 'fri',
    type: 'travel',
    start: 8 * 60 + 30,
    end: 14 * 60 + 30,
    location: 'Montreal, QC',
    notes: 'Primary driving leg for the trip.',
  },
  {
    id: 'a-13',
    name: 'Hotel Check-in (Old Montreal)',
    day: 'fri',
    type: 'lodging',
    start: 16 * 60,
    end: 16 * 60 + 45,
    location: 'Montreal, QC',
    notes: 'Drop bags and reset.',
  },
  {
    id: 'a-14',
    name: 'Old Port Evening Walk',
    day: 'fri',
    type: 'activity',
    start: 18 * 60,
    end: 20 * 60,
    location: 'Montreal, QC',
    notes: 'Sunset by the waterfront.',
  },
  {
    id: 'a-15',
    name: 'Bagel + Plateau Morning',
    day: 'sat',
    type: 'food',
    start: 9 * 60,
    end: 10 * 60,
    location: 'Montreal, QC',
    notes: 'St-Viateur + neighborhood stroll.',
  },
  {
    id: 'a-16',
    name: 'Mount Royal Park',
    day: 'sat',
    type: 'activity',
    start: 11 * 60,
    end: 13 * 60 + 30,
    location: 'Montreal, QC',
    notes: 'Picnic + overlook.',
  },
  {
    id: 'a-17',
    name: 'Dinner in Mile End',
    day: 'sat',
    type: 'food',
    start: 19 * 60,
    end: 20 * 60 + 30,
    location: 'Montreal, QC',
    notes: 'End-of-trip celebration dinner.',
  },
  {
    id: 'a-18',
    name: 'Brunch + Wrap-up',
    day: 'sun',
    type: 'food',
    start: 10 * 60,
    end: 11 * 60 + 30,
    location: 'Montreal, QC',
    notes: 'Final planning for the journey home.',
  },
]

function isDayKey(value: string): value is DayKey {
  return DAY_ORDER.includes(value as DayKey)
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeDraft(draft: ActivityDraft): ActivityDraft {
  const start = clamp(draft.start, TIMELINE_START_MINUTE, TIMELINE_END_MINUTE - MIN_ACTIVITY_DURATION)
  const end = clamp(draft.end, start + MIN_ACTIVITY_DURATION, TIMELINE_END_MINUTE)

  return {
    ...draft,
    name: cleanText(draft.name),
    location: cleanText(draft.location),
    notes: cleanText(draft.notes),
    start,
    end,
  }
}

export function normalizeStoredActivities(payload: unknown): Activity[] {
  if (!Array.isArray(payload)) {
    return SAMPLE_ACTIVITIES
  }

  const cleaned = payload
    .map((item): Activity | null => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const candidate = item as Partial<Activity>
      if (!candidate.id || !candidate.name || !candidate.location || !candidate.day || !candidate.type) {
        return null
      }

      if (!isDayKey(candidate.day) || Number.isNaN(candidate.start) || Number.isNaN(candidate.end)) {
        return null
      }

      const start = clamp(
        Number(candidate.start),
        TIMELINE_START_MINUTE,
        TIMELINE_END_MINUTE - MIN_ACTIVITY_DURATION,
      )
      const end = clamp(Number(candidate.end), start + MIN_ACTIVITY_DURATION, TIMELINE_END_MINUTE)

      return {
        id: String(candidate.id),
        name: cleanText(candidate.name),
        day: candidate.day,
        type: candidate.type,
        start,
        end,
        location: cleanText(candidate.location),
        notes: cleanText(candidate.notes),
      }
    })
    .filter((activity): activity is Activity => Boolean(activity))

  return cleaned.length > 0 ? cleaned : SAMPLE_ACTIVITIES
}
