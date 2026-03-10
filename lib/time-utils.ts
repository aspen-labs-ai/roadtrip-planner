export const TIMELINE_START_HOUR = 6
export const TIMELINE_END_HOUR = 24
export const MINUTES_PER_HOUR = 60

export const TIMELINE_START_MINUTE = TIMELINE_START_HOUR * MINUTES_PER_HOUR
export const TIMELINE_END_MINUTE = TIMELINE_END_HOUR * MINUTES_PER_HOUR

export const HOUR_MARKERS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
  (_, index) => TIMELINE_START_HOUR + index,
)

export const MIN_ACTIVITY_DURATION = 30
export const DRAG_SNAP_MINUTES = 15

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function snapToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

export function formatClock(minutesFromMidnight: number): string {
  const hours24 = Math.floor(minutesFromMidnight / 60)
  const minutes = minutesFromMidnight % 60
  const suffix = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = ((hours24 + 11) % 12) + 1
  return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export function toTimeInputValue(minutesFromMidnight: number): string {
  const hours = Math.floor(minutesFromMidnight / 60)
  const minutes = minutesFromMidnight % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function fromTimeInputValue(value: string): number | null {
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }

  return hours * 60 + minutes
}

export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return '0m'
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}
