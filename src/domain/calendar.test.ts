import { describe, expect, it } from "vitest";
import { buildYear } from "./calendar";
import { summarize } from "./summary";
import { formatClock, parseClock } from "./time";
import type { LineRules, ServiceException, WorkWindow } from "./types";

const rules: LineRules = {
  possessionStartMin: 1470,
  serviceStartMin: 1740,
  clearanceMin: 20,
};

const window = (over: Partial<WorkWindow> & Pick<WorkWindow, "id" | "night">): WorkWindow => ({
  startMin: 1500,
  endMin: 1680,
  crew: "A",
  zone: "Z1",
  task: "Rail grinding",
  ...over,
});

describe("buildYear", () => {
  it("produces 365 nights for a common year and 366 for a leap year", () => {
    expect(buildYear(2026, [], [], rules).nights).toHaveLength(365);
    expect(buildYear(2028, [], [], rules).nights).toHaveLength(366);
  });

  it("groups nights into 12 month rows with correct lengths", () => {
    const year = buildYear(2026, [], [], rules);
    expect(year.months.map((m) => m.length)).toEqual([
      31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ]);
    expect(year.months[1]?.[27]?.date).toBe("2026-02-28");
  });

  it("derives a status for every night", () => {
    const windows = [
      window({ id: "ok", night: "2026-02-02" }),
      window({ id: "late", night: "2026-02-03", endMin: 1760 }),
      window({ id: "blocked", night: "2026-02-04" }),
    ];
    const exceptions: ServiceException[] = [
      { id: "e1", night: "2026-02-04", reason: "holiday" },
      { id: "e2", night: "2026-02-05", reason: "special-event" },
    ];
    const year = buildYear(2026, windows, exceptions, rules);
    const status = (d: string) => year.nights.find((n) => n.date === d)?.status;

    expect(status("2026-02-01")).toBe("empty");
    expect(status("2026-02-02")).toBe("planned");
    expect(status("2026-02-03")).toBe("overrun");
    expect(status("2026-02-04")).toBe("conflict");
    expect(status("2026-02-05")).toBe("exception");
  });

  it("sorts a night's windows by start time", () => {
    const year = buildYear(
      2026,
      [
        window({ id: "second", night: "2026-05-05", startMin: 1560, endMin: 1620 }),
        window({ id: "first", night: "2026-05-05", startMin: 1480, endMin: 1540, zone: "Z2" }),
      ],
      [],
      rules,
    );
    const night = year.nights.find((n) => n.date === "2026-05-05");
    expect(night?.windows.map((w) => w.id)).toEqual(["first", "second"]);
  });
});

describe("summarize", () => {
  it("aggregates counts, minutes and per-zone/per-crew tallies", () => {
    const year = buildYear(
      2026,
      [
        window({ id: "a", night: "2026-01-05", startMin: 1500, endMin: 1680 }),
        window({ id: "b", night: "2026-01-05", startMin: 1500, endMin: 1620, zone: "Z3", crew: "C" }),
        window({ id: "c", night: "2026-01-06", endMin: 1800 }),
      ],
      [{ id: "e", night: "2026-01-07", reason: "holiday" }],
      rules,
    );
    const s = summarize(year);
    expect(s.totalNights).toBe(365);
    expect(s.plannedNights).toBe(2);
    expect(s.totalWindows).toBe(3);
    expect(s.totalWorkMinutes).toBe(180 + 120 + 300);
    expect(s.overrunCount).toBe(1);
    expect(s.conflictCount).toBe(0);
    expect(s.exceptionNights).toBe(1);
    expect(s.byZone).toEqual({ Z1: 2, Z2: 0, Z3: 1, Z4: 0 });
    expect(s.byCrew).toEqual({ A: 2, B: 0, C: 1, D: 0 });
  });
});

describe("time helpers", () => {
  it("parses and formats clock values past midnight", () => {
    expect(parseClock("04:15")).toBe(255);
    expect(parseClock("28:15")).toBe(1695);
    expect(parseClock("4:5")).toBeNull();
    expect(formatClock(1695)).toBe("04:15");
    expect(formatClock(1695, true)).toBe("04:15 +1");
  });
});
