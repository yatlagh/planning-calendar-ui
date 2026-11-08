import { useId, useState, type FormEvent } from "react";
import type {
  CrewId,
  ExceptionReason,
  LineRules,
  Night,
  ServiceException,
  Warning,
  WorkWindow,
  ZoneId,
} from "../domain";
import {
  CREWS,
  ZONES,
  cutoffMin,
  formatClock,
  formatDuration,
  formatLongDate,
  parseClock,
} from "../domain";
import { STATUS_LABEL } from "./NightCell";

export interface NightPanelProps {
  readonly night: Night | null;
  readonly rules: LineRules;
  readonly onClose: () => void;
  readonly onAddWindow: (input: Omit<WorkWindow, "id">) => void;
  readonly onUpdateWindow: (id: string, patch: Partial<Omit<WorkWindow, "id" | "night">>) => void;
  readonly onRemoveWindow: (id: string) => void;
  readonly onSetException: (
    exception: Omit<ServiceException, "id" | "night"> | null,
  ) => void;
}

const REASONS: readonly { value: ExceptionReason; label: string }[] = [
  { value: "extended-service", label: "Extended service" },
  { value: "special-event", label: "Special event" },
  { value: "holiday", label: "Holiday" },
  { value: "inspection-blackout", label: "Inspection blackout" },
];

function WarningList({ warnings }: { readonly warnings: readonly Warning[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul aria-label="Warnings" className="space-y-1.5">
      {warnings.map((w, i) => (
        <li
          key={`${w.windowId}-${w.kind}-${i}`}
          className={`flex gap-2 rounded-md border px-2.5 py-2 text-xs ${
            w.severity === "error"
              ? "border-status-conflict/50 bg-status-conflict/10 text-[#f6c9c4]"
              : "border-status-overrun/50 bg-status-overrun/10 text-[#f1d7a4]"
          }`}
        >
          <span aria-hidden="true" className="font-mono font-bold">
            {w.severity === "error" ? "×" : "!"}
          </span>
          <span>
            <span className="sr-only">{w.severity === "error" ? "Error: " : "Warning: "}</span>
            <span className="font-medium">{w.windowId}</span> {w.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface WindowEditorProps {
  readonly window: WorkWindow;
  readonly rules: LineRules;
  readonly onUpdate: NightPanelProps["onUpdateWindow"];
  readonly onRemove: NightPanelProps["onRemoveWindow"];
}

function WindowEditor({ window: w, rules, onUpdate, onRemove }: WindowEditorProps) {
  const id = useId();
  const [start, setStart] = useState(formatClock(w.startMin));
  const [end, setEnd] = useState(formatClock(w.endMin));
  const [error, setError] = useState<string | null>(null);

  const commitTimes = (): void => {
    const s = parseClock(start);
    const e = parseClock(end);
    if (s === null || e === null) {
      setError("Use HH:MM, for example 01:15.");
      return;
    }
    // Times before 12:00 are read as the following morning.
    const startMin = s < 720 ? s + 1440 : s;
    const endMin = e < 720 ? e + 1440 : e;
    if (endMin <= startMin) {
      setError("End must be after start.");
      return;
    }
    setError(null);
    onUpdate(w.id, { startMin, endMin });
  };

  const overCutoff = w.endMin > cutoffMin(rules);

  return (
    <fieldset className="rounded-lg border border-line bg-surface-raised p-3">
      <legend className="px-1 font-mono text-xs text-ink-muted">
        {w.id} <span aria-hidden="true">&middot;</span> {formatDuration(w.endMin - w.startMin)}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-ink-muted" htmlFor={`${id}-task`}>
          Task
          <input
            id={`${id}-task`}
            className="field mt-1"
            value={w.task}
            onChange={(e) => onUpdate(w.id, { task: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-ink-muted" htmlFor={`${id}-crew`}>
            Crew
            <select
              id={`${id}-crew`}
              className="field mt-1"
              value={w.crew}
              onChange={(e) => onUpdate(w.id, { crew: e.target.value as CrewId })}
            >
              {CREWS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-muted" htmlFor={`${id}-zone`}>
            Zone
            <select
              id={`${id}-zone`}
              className="field mt-1"
              value={w.zone}
              onChange={(e) => onUpdate(w.id, { zone: e.target.value as ZoneId })}
            >
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="text-xs text-ink-muted" htmlFor={`${id}-start`}>
          Start
          <input
            id={`${id}-start`}
            className="field mt-1 font-mono"
            inputMode="numeric"
            value={start}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => setStart(e.target.value)}
            onBlur={commitTimes}
          />
        </label>
        <label className="text-xs text-ink-muted" htmlFor={`${id}-end`}>
          End
          <input
            id={`${id}-end`}
            className={`field mt-1 font-mono ${overCutoff ? "border-status-overrun" : ""}`}
            inputMode="numeric"
            value={end}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : `${id}-cutoff`}
            onChange={(e) => setEnd(e.target.value)}
            onBlur={commitTimes}
          />
        </label>
      </div>
      <p id={`${id}-cutoff`} className="mt-2 text-[11px] text-ink-faint">
        Track must be clear by {formatClock(cutoffMin(rules))} (first service{" "}
        {formatClock(rules.serviceStartMin)}).
      </p>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-[#f3a79f]">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end">
        <button type="button" className="btn btn-danger" onClick={() => onRemove(w.id)}>
          Remove window
        </button>
      </div>
    </fieldset>
  );
}

export function NightPanel({
  night,
  rules,
  onClose,
  onAddWindow,
  onUpdateWindow,
  onRemoveWindow,
  onSetException,
}: NightPanelProps) {
  const headingId = useId();

  if (!night) {
    return (
      <aside
        aria-labelledby={headingId}
        className="flex h-full flex-col rounded-xl border border-line bg-surface p-5"
      >
        <h2 id={headingId} className="text-sm font-semibold text-ink">
          Night details
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Select a night in the grid to inspect or edit its work windows. Use the arrow keys to
          move between nights and Enter to open one.
        </p>
      </aside>
    );
  }

  const handleAdd = (event: FormEvent): void => {
    event.preventDefault();
    const start = rules.possessionStartMin;
    onAddWindow({
      night: night.date,
      startMin: start,
      endMin: start + 180,
      crew: "A",
      zone: "Z1",
      task: "New work window",
    });
  };

  return (
    <aside
      aria-labelledby={headingId}
      className="flex h-full flex-col gap-4 rounded-xl border border-line bg-surface p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Night of</p>
          <h2 id={headingId} className="text-base font-semibold text-ink">
            {formatLongDate(night.date)}
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">{STATUS_LABEL[night.status]}</p>
        </div>
        <button type="button" className="btn" onClick={onClose} aria-label="Close night details">
          <span aria-hidden="true">&times;</span>
        </button>
      </header>

      <div aria-live="polite" aria-atomic="false">
        <WarningList warnings={night.warnings} />
      </div>

      <section aria-label="Service exception" className="rounded-lg border border-line p-3">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-accent)]"
            checked={night.exception !== null}
            onChange={(e) =>
              onSetException(e.target.checked ? { reason: "extended-service" } : null)
            }
          />
          Service exception: no work window allowed
        </label>
        {night.exception ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-muted">
              Reason
              <select
                className="field mt-1"
                value={night.exception.reason}
                onChange={(e) =>
                  onSetException({
                    reason: e.target.value as ExceptionReason,
                    ...(night.exception?.note !== undefined ? { note: night.exception.note } : {}),
                  })
                }
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-muted">
              Note
              <input
                className="field mt-1"
                value={night.exception.note ?? ""}
                onChange={(e) =>
                  onSetException({
                    reason: night.exception?.reason ?? "extended-service",
                    note: e.target.value,
                  })
                }
              />
            </label>
          </div>
        ) : null}
      </section>

      <section aria-label="Work windows" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">
            Work windows{" "}
            <span className="font-mono text-xs font-normal text-ink-muted">
              ({night.windows.length})
            </span>
          </h3>
          <form onSubmit={handleAdd}>
            <button type="submit" className="btn btn-primary">
              <span aria-hidden="true">+</span> Add window
            </button>
          </form>
        </div>
        {night.windows.length === 0 ? (
          <p className="text-sm text-ink-muted">No work planned for this night.</p>
        ) : (
          night.windows.map((w) => (
            <WindowEditor
              key={w.id}
              window={w}
              rules={rules}
              onUpdate={onUpdateWindow}
              onRemove={onRemoveWindow}
            />
          ))
        )}
      </section>
    </aside>
  );
}
