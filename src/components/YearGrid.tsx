import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { IsoDate, Night, PlannerYear } from "../domain";
import { MONTH_NAMES, addDays, daysInMonth, toIsoDate } from "../domain";
import { NightCell } from "./NightCell";

export interface YearGridProps {
  readonly year: PlannerYear;
  readonly selected: IsoDate | null;
  readonly onSelect: (night: IsoDate) => void;
}

const COLUMNS = 31;

/**
 * 12 rows x 31 columns. Implements the WAI-ARIA grid pattern with a
 * roving tabindex: one cell is in the tab order, arrow keys move focus
 * between nights, Enter/Space selects, Home/End jump within a month.
 */
export function YearGrid({ year, selected, onSelect }: YearGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<IsoDate>(
    selected ?? year.nights[0]?.date ?? toIsoDate(year.year, 0, 1),
  );
  const pendingFocus = useRef<IsoDate | null>(null);

  // Move DOM focus after React has rendered the new tabIndex.
  useEffect(() => {
    if (!pendingFocus.current || !rootRef.current) return;
    const el = rootRef.current.querySelector<HTMLElement>(
      `[data-night="${pendingFocus.current}"]`,
    );
    el?.focus();
    pendingFocus.current = null;
  }, [focused]);

  const moveFocus = useCallback(
    (next: IsoDate) => {
      const first = toIsoDate(year.year, 0, 1);
      const last = toIsoDate(year.year, 11, 31);
      if (next < first || next > last) return;
      pendingFocus.current = next;
      setFocused(next);
    },
    [year.year],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, night: Night) => {
      const { key } = event;
      const monthDays = daysInMonth(year.year, night.month);
      let handled = true;

      switch (key) {
        case "ArrowRight":
          moveFocus(addDays(night.date, 1));
          break;
        case "ArrowLeft":
          moveFocus(addDays(night.date, -1));
          break;
        case "ArrowDown":
          if (night.month < 11) {
            const days = daysInMonth(year.year, night.month + 1);
            moveFocus(toIsoDate(year.year, night.month + 1, Math.min(night.dayOfMonth, days)));
          }
          break;
        case "ArrowUp":
          if (night.month > 0) {
            const days = daysInMonth(year.year, night.month - 1);
            moveFocus(toIsoDate(year.year, night.month - 1, Math.min(night.dayOfMonth, days)));
          }
          break;
        case "Home":
          moveFocus(toIsoDate(year.year, night.month, 1));
          break;
        case "End":
          moveFocus(toIsoDate(year.year, night.month, monthDays));
          break;
        case "PageUp":
          moveFocus(toIsoDate(year.year, 0, 1));
          break;
        case "PageDown":
          moveFocus(toIsoDate(year.year, 11, 31));
          break;
        case "Enter":
        case " ":
          onSelect(night.date);
          break;
        default:
          handled = false;
      }
      if (handled) event.preventDefault();
    },
    [moveFocus, onSelect, year.year],
  );

  const handleSelect = useCallback(
    (night: Night) => {
      setFocused(night.date);
      onSelect(night.date);
    },
    [onSelect],
  );

  return (
    <div
      ref={rootRef}
      role="grid"
      aria-label={`Night-shift plan for ${year.year}, one row per month`}
      aria-rowcount={13}
      aria-colcount={COLUMNS + 1}
      className="grid gap-x-1 gap-y-1.5"
      style={{ gridTemplateColumns: `minmax(5.5rem, auto) repeat(${COLUMNS}, minmax(0, 1fr))` }}
    >
      <div role="row" aria-rowindex={1} className="contents">
        <div role="columnheader" className="text-[11px] text-ink-faint">
          <span className="sr-only">Month</span>
        </div>
        {Array.from({ length: COLUMNS }, (_, i) => (
          <div
            key={i}
            role="columnheader"
            className="pb-1 text-center font-mono text-[10px] text-ink-faint"
          >
            {i + 1}
          </div>
        ))}
      </div>

      {year.months.map((nights, monthIndex) => (
        <div key={monthIndex} role="row" aria-rowindex={monthIndex + 2} className="contents">
          <div
            role="rowheader"
            className="flex items-center pr-3 text-xs font-medium text-ink-muted"
          >
            {MONTH_NAMES[monthIndex]}
          </div>
          {nights.map((night) => (
            <NightCell
              key={night.date}
              night={night}
              selected={selected === night.date}
              focusable={focused === night.date}
              onSelect={handleSelect}
              onKeyDown={handleKeyDown}
            />
          ))}
          {Array.from({ length: COLUMNS - nights.length }, (_, i) => (
            <div key={`pad-${i}`} role="gridcell" aria-hidden="true" />
          ))}
        </div>
      ))}
    </div>
  );
}
