import { describe, expect, it } from "vitest";
import { cutoffMin, detectOverruns } from "./overruns";
import type { LineRules, ServiceException, WorkWindow } from "./types";

const rules: LineRules = {
  possessionStartMin: 24 * 60 + 30, // 00:30
  serviceStartMin: 24 * 60 + 5 * 60, // 05:00
  clearanceMin: 20, // cutoff 04:40
};

const base: WorkWindow = {
  id: "w-1",
  night: "2026-03-10",
  startMin: 24 * 60 + 45,
  endMin: 24 * 60 + 4 * 60,
  crew: "A",
  zone: "Z1",
  task: "Tamping",
};

describe("cutoffMin", () => {
  it("subtracts the clearance margin from first service", () => {
    expect(cutoffMin(rules)).toBe(24 * 60 + 4 * 60 + 40);
  });
});

describe("detectOverruns", () => {
  it("returns no warnings for a window that clears the track in time", () => {
    expect(detectOverruns([base], [], rules)).toEqual([]);
  });

  it("flags a window that eats into the clearance margin as a warning", () => {
    const w: WorkWindow = { ...base, endMin: cutoffMin(rules) + 10 };
    const [warning] = detectOverruns([w], [], rules);
    expect(warning).toMatchObject({
      kind: "overrun",
      severity: "warning",
      windowId: "w-1",
      overrunMin: 10,
    });
  });

  it("escalates to an error when the window runs past first service", () => {
    const w: WorkWindow = { ...base, endMin: rules.serviceStartMin + 25 };
    const [warning] = detectOverruns([w], [], rules);
    expect(warning?.severity).toBe("error");
    expect(warning?.message).toContain("after first service at 05:00");
  });

  it("flags a window that starts before possession opens", () => {
    const w: WorkWindow = { ...base, startMin: rules.possessionStartMin - 15 };
    const warnings = detectOverruns([w], [], rules);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain("before possession opens at 00:30");
  });

  it("reports a conflict when a window is planned on an exception night", () => {
    const ex: ServiceException = {
      id: "ex-1",
      night: base.night,
      reason: "special-event",
    };
    const warnings = detectOverruns([base], [ex], rules);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ kind: "exception-conflict", severity: "error" });
  });

  it("does not report exceptions on nights without windows", () => {
    const ex: ServiceException = { id: "ex-1", night: "2026-12-31", reason: "holiday" };
    expect(detectOverruns([base], [ex], rules)).toEqual([]);
  });

  it("detects overlapping windows in the same zone but not across zones", () => {
    const a: WorkWindow = { ...base, id: "w-a", startMin: 1500, endMin: 1600 };
    const b: WorkWindow = { ...base, id: "w-b", crew: "B", startMin: 1550, endMin: 1650 };
    const c: WorkWindow = { ...base, id: "w-c", crew: "C", zone: "Z2", startMin: 1550, endMin: 1650 };
    const warnings = detectOverruns([a, b, c], [], rules);
    expect(warnings.map((w) => [w.kind, w.windowId])).toEqual([["overlap", "w-b"]]);
  });

  it("returns warnings sorted by night then window id", () => {
    const late: WorkWindow = { ...base, id: "w-z", night: "2026-06-01", endMin: 1800 };
    const early: WorkWindow = { ...base, id: "w-a", night: "2026-01-05", endMin: 1800 };
    const warnings = detectOverruns([late, early], [], rules);
    expect(warnings.map((w) => w.night)).toEqual(["2026-01-05", "2026-06-01"]);
  });
});
