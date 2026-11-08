import { memo, type KeyboardEvent, type MouseEvent } from "react";
import type { Night, NightStatus } from "../domain";
import { formatLongDate } from "../domain";

export const STATUS_LABEL: Readonly<Record<NightStatus, string>> = {
  empty: "No work planned",
  planned: "Work window planned",
  overrun: "Overrun warning",
  exception: "Service exception, no work allowed",
  conflict: "Conflict",
};

/** Glyph shown inside the cell so status is readable without colour. */
export const STATUS_GLYPH: Readonly<Record<NightStatus, string>> = {
  empty: "",
  planned: "",
  overrun: "!",
  exception: "–",
  conflict: "×",
};

export function describeNight(night: Night): string {
  const parts = [formatLongDate(night.date), STATUS_LABEL[night.status]];
  if (night.windows.length > 0) {
    parts.push(
      `${night.windows.length} ${night.windows.length === 1 ? "window" : "windows"}`,
    );
  }
  if (night.warnings.length > 0) {
    parts.push(
      `${night.warnings.length} ${night.warnings.length === 1 ? "warning" : "warnings"}`,
    );
  }
  return parts.join(". ");
}

export interface NightCellProps {
  readonly night: Night;
  readonly selected: boolean;
  readonly focusable: boolean;
  readonly onSelect: (night: Night) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>, night: Night) => void;
}

export const NightCell = memo(function NightCell({
  night,
  selected,
  focusable,
  onSelect,
  onKeyDown,
}: NightCellProps) {
  const isWeekend = night.weekday === 5 || night.weekday === 6;
  const glyph =
    night.status === "planned" && night.windows.length > 1
      ? String(night.windows.length)
      : STATUS_GLYPH[night.status];

  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    event.preventDefault();
    onSelect(night);
  };

  return (
    <div
      role="gridcell"
      tabIndex={focusable ? 0 : -1}
      aria-selected={selected}
      aria-label={describeNight(night)}
      data-night={night.date}
      data-status={night.status}
      data-weekend={isWeekend}
      className="night-cell cursor-pointer"
      onClick={handleClick}
      onKeyDown={(e) => onKeyDown(e, night)}
      title={describeNight(night)}
    >
      <span aria-hidden="true">{glyph}</span>
    </div>
  );
});
