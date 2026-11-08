import { useMemo } from "react";
import { usePlanner } from "./hooks/usePlanner";
import { YearGrid } from "./components/YearGrid";
import { NightPanel } from "./components/NightPanel";
import { Legend } from "./components/Legend";
import { SummaryBar } from "./components/SummaryBar";
import { formatClock } from "./domain";

export default function App() {
  const planner = usePlanner();
  const { year, summary, rules, selected } = planner;

  const selectedNight = useMemo(
    () => (selected ? (year.nights.find((n) => n.date === selected) ?? null) : null),
    [year, selected],
  );

  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-5 px-6 py-6">
      <a
        href="#year-grid"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-surface-raised focus:px-3 focus:py-2"
      >
        Skip to calendar
      </a>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            Track maintenance planner
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Line 1 &middot; Night possessions {year.year}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Possession {formatClock(rules.possessionStartMin)} to{" "}
            {formatClock(rules.serviceStartMin)} first service, {rules.clearanceMin} min clearance.
          </p>
        </div>
        <button type="button" className="btn" onClick={planner.reset}>
          Reset to sample plan
        </button>
      </header>

      <SummaryBar summary={summary} rules={rules} />

      <main className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          id="year-grid"
          aria-label="Year calendar"
          className="rounded-xl border border-line bg-surface p-5"
          tabIndex={-1}
        >
          <YearGrid year={year} selected={selected} onSelect={planner.select} />
          <div className="mt-5 border-t border-line pt-4">
            <Legend />
          </div>
        </section>

        <NightPanel
          night={selectedNight}
          rules={rules}
          onClose={() => planner.select(null)}
          onAddWindow={planner.addWindow}
          onUpdateWindow={planner.updateWindow}
          onRemoveWindow={planner.removeWindow}
          onSetException={(ex) => {
            if (selected) planner.setException(selected, ex);
          }}
        />
      </main>

      <footer className="text-xs text-ink-faint">
        Keyboard: arrow keys move between nights, Home/End jump within a month, PageUp/PageDown
        jump to January/December, Enter opens a night. Changes are saved in this browser.
      </footer>
    </div>
  );
}
