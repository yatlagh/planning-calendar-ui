import type {
  CrewId,
  ExceptionReason,
  IsoDate,
  LineRules,
  ServiceException,
  WorkWindow,
  ZoneId,
} from "../domain";
import { daysInYear, addDays, toIsoDate, weekdayOf } from "../domain";

export const PLAN_YEAR = 2026;

/** Line 1 operating rules: last train 00:30, first train 05:00, 20-minute clearance. */
export const LINE_RULES: LineRules = {
  possessionStartMin: 24 * 60 + 30,
  serviceStartMin: 24 * 60 + 5 * 60,
  clearanceMin: 20,
};

/** Small deterministic PRNG (mulberry32) so the demo renders identically every load. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TASKS = [
  "Rail grinding",
  "Tamping",
  "Sleeper renewal",
  "Switch inspection",
  "Overhead line check",
  "Ballast cleaning",
  "Track geometry survey",
  "Drainage clearance",
  "Signal cable pull",
  "Platform edge repair",
] as const;

const ZONES: readonly ZoneId[] = ["Z1", "Z2", "Z3", "Z4"];
const CREWS: readonly CrewId[] = ["A", "B", "C", "D"];

interface SampleData {
  readonly windows: readonly WorkWindow[];
  readonly exceptions: readonly ServiceException[];
}

const pick = <T,>(rand: () => number, list: readonly T[]): T => {
  const item = list[Math.floor(rand() * list.length)];
  if (item === undefined) throw new Error("empty list");
  return item;
};

/**
 * Generate a realistic year of planning data: roughly 55% of weeknights
 * carry a window, weekends are lighter, a handful of windows deliberately
 * overrun the cutoff, and about a dozen nights are blocked by exceptions.
 */
export function generateSample(year = PLAN_YEAR, seed = 20260101): SampleData {
  const rand = mulberry32(seed);
  const windows: WorkWindow[] = [];
  const exceptions: ServiceException[] = [];
  const first = toIsoDate(year, 0, 1);
  const total = daysInYear(year);

  // Fixed exceptions: new year, mid-summer festival weekend, year-end service.
  const fixed: readonly [IsoDate, ExceptionReason, string][] = [
    [toIsoDate(year, 0, 1), "holiday", "New Year's night, extended service"],
    [toIsoDate(year, 6, 14), "special-event", "Festival fireworks, late trains"],
    [toIsoDate(year, 6, 15), "special-event", "Festival fireworks, late trains"],
    [toIsoDate(year, 11, 24), "holiday", "Extended evening service"],
    [toIsoDate(year, 11, 31), "extended-service", "All-night service"],
  ];
  for (const [night, reason, note] of fixed) {
    exceptions.push({ id: `ex-${night}`, night, reason, note });
  }
  // Quarterly inspection blackouts.
  for (const month of [2, 5, 8, 10]) {
    const night = toIsoDate(year, month, 10 + Math.floor(rand() * 10));
    exceptions.push({
      id: `ex-${night}`,
      night,
      reason: "inspection-blackout",
      note: "Independent safety inspection",
    });
  }
  const exceptionNights = new Set(exceptions.map((e) => e.night));

  let seq = 1;
  for (let i = 0; i < total; i++) {
    const night = addDays(first, i);
    const weekday = weekdayOf(night);
    const isWeekend = weekday === 5 || weekday === 6;
    const probability = isWeekend ? 0.2 : 0.55;

    if (exceptionNights.has(night)) continue;
    if (rand() > probability) continue;

    const zone = pick(rand, ZONES);
    const crew = pick(rand, CREWS);
    const start = LINE_RULES.possessionStartMin + 15 * Math.floor(rand() * 4);
    // 2h00 - 3h45; the longest late starts run into the clearance margin.
    const duration = 120 + 15 * Math.floor(rand() * 8);
    windows.push({
      id: `w-${String(seq++).padStart(3, "0")}`,
      night,
      startMin: start,
      endMin: start + duration,
      crew,
      zone,
      task: pick(rand, TASKS),
    });

    // Occasionally a second crew in another zone.
    if (rand() < 0.18) {
      const otherZone = pick(
        rand,
        ZONES.filter((z) => z !== zone),
      );
      const otherCrew = pick(
        rand,
        CREWS.filter((c) => c !== crew),
      );
      const s2 = LINE_RULES.possessionStartMin + 15 * Math.floor(rand() * 3);
      windows.push({
        id: `w-${String(seq++).padStart(3, "0")}`,
        night,
        startMin: s2,
        endMin: s2 + 120 + 15 * Math.floor(rand() * 8),
        crew: otherCrew,
        zone: otherZone,
        task: pick(rand, TASKS),
      });
    }
  }

  // One deliberate conflict: a window left on the second festival night.
  windows.push({
    id: `w-${String(seq++).padStart(3, "0")}`,
    night: toIsoDate(year, 6, 15),
    startMin: LINE_RULES.possessionStartMin + 15,
    endMin: LINE_RULES.possessionStartMin + 15 + 180,
    crew: "C",
    zone: "Z2",
    task: "Switch inspection",
  });

  windows.sort((a, b) => a.night.localeCompare(b.night) || a.startMin - b.startMin);
  return { windows, exceptions };
}

export const SAMPLE = generateSample();
