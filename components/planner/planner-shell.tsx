import type { ReactNode } from 'react'

interface PlannerShellProps {
  routeStops: string[]
  totalActivities: number
  totalTripDrive: string
  timeline: ReactNode
  dayActions: ReactNode
  onQuickAdd: () => void
}

export function PlannerShell({
  routeStops,
  totalActivities,
  totalTripDrive,
  timeline,
  dayActions,
  onQuickAdd,
}: PlannerShellProps) {
  return (
    <main className="relative min-h-screen bg-[radial-gradient(circle_at_20%_20%,#dff5ff,transparent_40%),radial-gradient(circle_at_80%_0%,#ffe8d6,transparent_35%),linear-gradient(180deg,#f7fbff_0%,#eef4fb_100%)] px-3 pb-24 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.09)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
                Roadtrip Planner
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                Chicago to Montreal
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 md:text-base">
                Visual timeline for Tue-Sun planning, quick edits, and automatic drive-time rollups.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {routeStops.map((stop, index) => (
                  <span
                    key={stop}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {stop}
                    {index < routeStops.length - 1 ? <span className="ml-2 text-slate-400">→</span> : null}
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
                <p className="mt-1 text-2xl font-semibold text-slate-900">{totalTripDrive}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/85 shadow-[0_25px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          {timeline}
        </section>

        {dayActions}
      </div>

      <button
        type="button"
        onClick={onQuickAdd}
        className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-3xl text-white shadow-[0_18px_35px_rgba(15,23,42,0.35)] transition hover:scale-105 hover:bg-slate-800"
        aria-label="Quick add activity"
      >
        +
      </button>
    </main>
  )
}
