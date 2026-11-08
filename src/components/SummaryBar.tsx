import type { LineRules, Summary } from "../domain";
import { CREWS, ZONES, cutoffMin, formatClock } from "../domain";

export interface SummaryBarProps {
  readonly summary: Summary;
  readonly rules: LineRules;
}

interface StatProps {
  readonly label: string;
  readonly value: string;
  readonly tone?: "default" | "warn" | "error";
  readonly hint?: string;
}

function Stat({ label, value, tone = "default", hint }: StatProps) {
  const toneClass =
    tone === "error"
      ? "text-[#f3a79f]"
      : tone === "warn"
        ? "text-status-overrun"
        : "text-ink";
  return (
    <div className="min-w-[7rem] rounded-lg border border-line bg-surface px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className={`mt-0.5 font-mono text-xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </dd>
      {hint ? <dd className="text-[11px] text-ink-faint">{hint}</dd> : null}
    </div>
  );
}

export function SummaryBar({ summary, rules }: SummaryBarProps) {
  const hours = Math.round(summary.totalWorkMinutes / 60);
  const utilisation = Math.round((summary.plannedNights / summary.totalNights) * 100);

  return (
    <dl aria-label="Plan summary" className="flex flex-wrap gap-2">
      <Stat
        label="Nights planned"
        value={`${summary.plannedNights}`}
        hint={`${utilisation}% of ${summary.totalNights}`}
      />
      <Stat label="Work windows" value={`${summary.totalWindows}`} hint={`${hours} h on track`} />
      <Stat
        label="Overruns"
        value={`${summary.overrunCount}`}
        tone={summary.overrunCount > 0 ? "warn" : "default"}
        hint={`cutoff ${formatClock(cutoffMin(rules))}`}
      />
      <Stat
        label="Conflicts"
        value={`${summary.conflictCount}`}
        tone={summary.conflictCount > 0 ? "error" : "default"}
        hint={`${summary.exceptionNights} exception nights`}
      />
      <div className="min-w-[7rem] rounded-lg border border-line bg-surface px-3 py-2">
        <dt className="text-[11px] uppercase tracking-wide text-ink-faint">Windows by zone</dt>
        <dd className="mt-1 flex gap-3 font-mono text-xs text-ink-muted">
          {ZONES.map((z) => (
            <span key={z}>
              {z} <span className="text-ink">{summary.byZone[z]}</span>
            </span>
          ))}
        </dd>
      </div>
      <div className="min-w-[7rem] rounded-lg border border-line bg-surface px-3 py-2">
        <dt className="text-[11px] uppercase tracking-wide text-ink-faint">Windows by crew</dt>
        <dd className="mt-1 flex gap-3 font-mono text-xs text-ink-muted">
          {CREWS.map((c) => (
            <span key={c}>
              {c} <span className="text-ink">{summary.byCrew[c]}</span>
            </span>
          ))}
        </dd>
      </div>
    </dl>
  );
}
