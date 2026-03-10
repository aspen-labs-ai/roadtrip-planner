import { formatDuration } from '@/lib/time-utils'
import { DayKey, DAY_LABELS, DAY_ORDER } from '@/types/trip'

interface DayActionsProps {
  selectedDay: DayKey
  totalDrivePerDay: Record<DayKey, number>
  onSelectDay: (day: DayKey) => void
  onAddForDay: (day: DayKey) => void
}

export function DayActions({ selectedDay, totalDrivePerDay, onSelectDay, onAddForDay }: DayActionsProps) {
  return (
    <section className="rounded-[1.5rem] border border-[hsl(var(--border)/0.85)] bg-[hsl(var(--surface)/0.7)] p-3 shadow-[0_16px_40px_hsl(var(--background)/0.65)] backdrop-blur-xl sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--foreground-muted))]">Day Controls</p>
        <p className="text-xs text-[hsl(var(--foreground-muted))]">{DAY_LABELS[selectedDay]} selected</p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {DAY_ORDER.map((day) => {
          const isActiveDay = selectedDay === day

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`min-h-11 min-w-[104px] rounded-xl border px-3 py-2 text-left transition ${
                isActiveDay
                  ? 'border-[hsl(var(--accent-strong)/0.9)] bg-[linear-gradient(145deg,hsl(var(--accent-strong)/0.18),hsl(var(--accent-soft)/0.18))] text-[hsl(var(--foreground))]'
                  : 'border-[hsl(var(--border)/0.95)] bg-[hsl(var(--surface-strong)/0.65)] text-[hsl(var(--foreground-muted))] hover:border-[hsl(var(--border-strong)/0.7)]'
              }`}
              aria-pressed={isActiveDay}
            >
              <p className="text-sm font-semibold">{DAY_LABELS[day]}</p>
              <p className="text-[11px]">Drive {formatDuration(totalDrivePerDay[day])}</p>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onAddForDay(selectedDay)}
        className="mt-3 flex min-h-12 w-full items-center justify-between rounded-2xl border border-[hsl(var(--border-strong)/0.6)] bg-[linear-gradient(130deg,hsl(var(--accent-strong)/0.24),hsl(var(--accent-soft)/0.2))] px-4 py-3 text-left text-[hsl(var(--foreground))] shadow-[0_10px_30px_hsl(var(--accent-strong)/0.2)] transition hover:brightness-110"
      >
        <span className="text-sm font-semibold">Add Activity to {DAY_LABELS[selectedDay]}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-lg leading-none">+</span>
      </button>

      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {DAY_ORDER.map((day) => {
          const isActiveDay = selectedDay === day
          return (
            <button
              key={`add-${day}`}
              type="button"
              onClick={() => onAddForDay(day)}
              className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                isActiveDay
                  ? 'border-[hsl(var(--accent-strong)/0.8)] bg-[hsl(var(--accent-strong)/0.2)] text-[hsl(var(--foreground))]'
                  : 'border-[hsl(var(--border)/0.9)] bg-[hsl(var(--surface-strong)/0.7)] text-[hsl(var(--foreground-muted))] hover:border-[hsl(var(--border-strong)/0.7)]'
              }`}
            >
              + {DAY_LABELS[day]}
            </button>
          )
        })}
      </div>
    </section>
  )
}
