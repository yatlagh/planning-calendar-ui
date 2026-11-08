import type {
  IsoDate,
  LineRules,
  ServiceException,
  Warning,
  WorkWindow,
} from "./types";
import { formatClock, formatDuration } from "./time";

/** Latest minute a window may still occupy the track. */
export function cutoffMin(rules: LineRules): number {
  return rules.serviceStartMin - rules.clearanceMin;
}

/**
 * Detect every rule violation for a set of windows.
 *
 * - `overrun`: a window ends after the service-start cutoff. Severity is
 *   `error` when it runs past the first train itself, `warning` when it
 *   only eats into the clearance margin.
 * - `exception-conflict`: a window is planned on a night that has a
 *   service exception.
 * - `overlap`: two windows on the same night and zone overlap in time.
 *
 * Pure: the result depends only on the inputs and is stable in order
 * (sorted by night, then window id) so it can be diffed and snapshotted.
 */
export function detectOverruns(
  windows: readonly WorkWindow[],
  exceptions: readonly ServiceException[],
  rules: LineRules,
): Warning[] {
  const cutoff = cutoffMin(rules);
  const exceptionByNight = new Map<IsoDate, ServiceException>();
  for (const ex of exceptions) exceptionByNight.set(ex.night, ex);

  const warnings: Warning[] = [];

  for (const w of windows) {
    if (w.endMin > cutoff) {
      const overrunMin = w.endMin - cutoff;
      const pastService = w.endMin > rules.serviceStartMin;
      warnings.push({
        kind: "overrun",
        severity: pastService ? "error" : "warning",
        night: w.night,
        windowId: w.id,
        overrunMin,
        message: pastService
          ? `Ends ${formatClock(w.endMin)}, ${formatDuration(
              w.endMin - rules.serviceStartMin,
            )} after first service at ${formatClock(rules.serviceStartMin)}.`
          : `Ends ${formatClock(w.endMin)}, ${formatDuration(
              overrunMin,
            )} inside the ${rules.clearanceMin}-minute clearance margin.`,
      });
    }

    if (w.startMin < rules.possessionStartMin) {
      warnings.push({
        kind: "overrun",
        severity: "warning",
        night: w.night,
        windowId: w.id,
        overrunMin: rules.possessionStartMin - w.startMin,
        message: `Starts ${formatClock(w.startMin)}, before possession opens at ${formatClock(
          rules.possessionStartMin,
        )}.`,
      });
    }

    const ex = exceptionByNight.get(w.night);
    if (ex) {
      warnings.push({
        kind: "exception-conflict",
        severity: "error",
        night: w.night,
        windowId: w.id,
        message: `Night is blocked (${ex.reason.replace("-", " ")}); no work window allowed.`,
      });
    }
  }

  // Overlaps: same night, same zone, intervals intersect.
  const byNightZone = new Map<string, WorkWindow[]>();
  for (const w of windows) {
    const key = `${w.night}|${w.zone}`;
    const list = byNightZone.get(key) ?? [];
    list.push(w);
    byNightZone.set(key, list);
  }
  for (const group of byNightZone.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev && curr && curr.startMin < prev.endMin) {
        warnings.push({
          kind: "overlap",
          severity: "error",
          night: curr.night,
          windowId: curr.id,
          message: `Overlaps crew ${prev.crew} in zone ${prev.zone} (${formatClock(
            prev.startMin,
          )}-${formatClock(prev.endMin)}).`,
        });
      }
    }
  }

  return warnings.sort(
    (a, b) =>
      a.night.localeCompare(b.night) || a.windowId.localeCompare(b.windowId),
  );
}
