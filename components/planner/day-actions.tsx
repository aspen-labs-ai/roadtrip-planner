import { DayKey, DAY_LABELS, DAY_ORDER } from '@/types/trip'

interface DayActionsProps {
  selectedDay: DayKey
  onAddForDay: (day: DayKey) => void
}

export function DayActions({ selectedDay, onAddForDay }: DayActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-white/70 p-3 backdrop-blur sm:grid-cols-3 md:grid-cols-6">
      {DAY_ORDER.map((day) => (
        <button
          key={day}
          type="button"
          onClick={() => onAddForDay(day)}
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
  )
}
