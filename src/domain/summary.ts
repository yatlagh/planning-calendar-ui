import type { CrewId, PlannerYear, Summary, ZoneId } from "./types";

export const ZONES: readonly ZoneId[] = ["Z1", "Z2", "Z3", "Z4"];
export const CREWS: readonly CrewId[] = ["A", "B", "C", "D"];

/** Aggregate a planning year into the figures shown in the summary bar. */
export function summarize(year: PlannerYear): Summary {
  const byZone: Record<ZoneId, number> = { Z1: 0, Z2: 0, Z3: 0, Z4: 0 };
  const byCrew: Record<CrewId, number> = { A: 0, B: 0, C: 0, D: 0 };

  let plannedNights = 0;
  let totalWindows = 0;
  let totalWorkMinutes = 0;
  let overrunCount = 0;
  let conflictCount = 0;
  let exceptionNights = 0;

  for (const night of year.nights) {
    if (night.windows.length > 0) plannedNights++;
    if (night.exception) exceptionNights++;
    for (const w of night.windows) {
      totalWindows++;
      totalWorkMinutes += Math.max(0, w.endMin - w.startMin);
      byZone[w.zone]++;
      byCrew[w.crew]++;
    }
    for (const warning of night.warnings) {
      if (warning.kind === "overrun") overrunCount++;
      else conflictCount++;
    }
  }

  return {
    totalNights: year.nights.length,
    plannedNights,
    totalWindows,
    totalWorkMinutes,
    overrunCount,
    conflictCount,
    exceptionNights,
    byZone,
    byCrew,
  };
}
