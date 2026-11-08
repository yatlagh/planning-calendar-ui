import type {
  IsoDate,
  LineRules,
  Night,
  NightStatus,
  PlannerYear,
  ServiceException,
  Warning,
  WorkWindow,
} from "./types";
import { daysInMonth, toIsoDate, weekdayOf } from "./time";
import { detectOverruns } from "./overruns";

function statusFor(
  windows: readonly WorkWindow[],
  exception: ServiceException | null,
  warnings: readonly Warning[],
): NightStatus {
  if (warnings.some((w) => w.kind === "exception-conflict" || w.kind === "overlap")) {
    return "conflict";
  }
  if (exception) return "exception";
  if (warnings.some((w) => w.kind === "overrun")) return "overrun";
  return windows.length > 0 ? "planned" : "empty";
}

/**
 * Build the full planning year: one `Night` per calendar date, with its
 * windows, exception and derived warnings attached. Nights are also
 * grouped by month so the grid can render 12 rows without re-deriving.
 */
export function buildYear(
  year: number,
  windows: readonly WorkWindow[],
  exceptions: readonly ServiceException[],
  rules: LineRules,
): PlannerYear {
  const warnings = detectOverruns(windows, exceptions, rules);

  const windowsByNight = new Map<IsoDate, WorkWindow[]>();
  for (const w of windows) {
    const list = windowsByNight.get(w.night) ?? [];
    list.push(w);
    windowsByNight.set(w.night, list);
  }
  const exceptionByNight = new Map<IsoDate, ServiceException>();
  for (const ex of exceptions) exceptionByNight.set(ex.night, ex);
  const warningsByNight = new Map<IsoDate, Warning[]>();
  for (const w of warnings) {
    const list = warningsByNight.get(w.night) ?? [];
    list.push(w);
    warningsByNight.set(w.night, list);
  }

  const months: Night[][] = [];
  const nights: Night[] = [];

  for (let month = 0; month < 12; month++) {
    const row: Night[] = [];
    const count = daysInMonth(year, month);
    for (let day = 1; day <= count; day++) {
      const date = toIsoDate(year, month, day);
      const nightWindows = (windowsByNight.get(date) ?? []).sort(
        (a, b) => a.startMin - b.startMin,
      );
      const exception = exceptionByNight.get(date) ?? null;
      const nightWarnings = warningsByNight.get(date) ?? [];
      const night: Night = {
        date,
        weekday: weekdayOf(date),
        month,
        dayOfMonth: day,
        windows: nightWindows,
        exception,
        warnings: nightWarnings,
        status: statusFor(nightWindows, exception, nightWarnings),
      };
      row.push(night);
      nights.push(night);
    }
    months.push(row);
  }

  return { year, nights, months };
}
