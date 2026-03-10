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
    <main className="relative min-h-screen overflow-x-hidden bg-[hsl(var(--background))] px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[hsl(var(--accent)/0.22)] blur-3xl" />
        <div className="absolute -right-16 top-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-soft)/0.2)] blur-3xl" />
        <div className="absolute bottom-12 left-1/3 h-48 w-48 rounded-full bg-[hsl(var(--glow)/0.12)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-4 sm:gap-5">
        <section className="rounded-[1.75rem] border border-[hsl(var(--border-strong)/0.4)] bg-[linear-gradient(145deg,hsl(var(--surface)/0.9),hsl(var(--surface-strong)/0.78))] p-4 shadow-[0_22px_70px_hsl(var(--background)/0.8)] backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Roadtrip Planner
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-4xl">
                Chicago to Montreal
              </h1>
              <p className="max-w-2xl text-sm text-[hsl(var(--foreground-muted))] sm:text-base">
                Mobile-first itinerary timeline for fast edits, drag scheduling, and automatic drive-time rollups.
              </p>
              <div className="flex flex-wrap gap-2">
                {routeStops.map((stop, index) => (
                  <span
                    key={stop}
                    className="inline-flex min-h-11 items-center rounded-full border border-[hsl(var(--border)/0.95)] bg-[hsl(var(--surface-strong)/0.8)] px-3 py-1 text-xs font-semibold text-[hsl(var(--foreground-muted))]"
                  >
                    {stop}
                    {index < routeStops.length - 1 ? (
                      <span className="ml-2 text-[hsl(var(--accent-soft)/0.8)]">→</span>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:min-w-[320px]">
              <div className="rounded-2xl border border-[hsl(var(--border)/0.95)] bg-[hsl(var(--surface)/0.72)] px-3 py-3 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--foreground-muted))]">Activities</p>
                <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">{totalActivities}</p>
              </div>
              <div className="rounded-2xl border border-[hsl(var(--border)/0.95)] bg-[hsl(var(--surface)/0.72)] px-3 py-3 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--foreground-muted))]">Drive Time</p>
                <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">{totalTripDrive}</p>
              </div>
            </div>
          </div>
        </section>

        {dayActions}

        <section className="overflow-hidden rounded-[1.5rem] border border-[hsl(var(--border)/0.9)] bg-[hsl(var(--surface)/0.78)] shadow-[0_20px_55px_hsl(var(--background)/0.72)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[hsl(var(--border)/0.8)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--foreground-muted))]">
              Planner Timeline
            </p>
            <p className="text-xs text-[hsl(var(--foreground-muted))]">Tap cards to edit. Drag to move or resize.</p>
          </div>
          {timeline}
        </section>
      </div>

      <button
        type="button"
        onClick={onQuickAdd}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-[linear-gradient(135deg,hsl(var(--accent-strong))_0%,hsl(var(--accent-soft))_100%)] text-3xl font-semibold text-black shadow-[0_16px_36px_hsl(var(--accent)/0.35)] transition hover:scale-105 hover:brightness-110 focus-visible:scale-105 sm:right-6"
        aria-label="Quick add activity"
      >
        +
      </button>
    </main>
  )
}
