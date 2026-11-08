import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { YearGrid } from "./YearGrid";
import { buildYear } from "../domain";
import type { LineRules, WorkWindow } from "../domain";
import App from "../App";

const rules: LineRules = { possessionStartMin: 1470, serviceStartMin: 1740, clearanceMin: 20 };

const windows: WorkWindow[] = [
  {
    id: "w-1",
    night: "2026-01-02",
    startMin: 1500,
    endMin: 1770,
    crew: "B",
    zone: "Z2",
    task: "Tamping",
  },
];

describe("YearGrid", () => {
  it("renders every night as a labelled grid cell", () => {
    const year = buildYear(2026, windows, [], rules);
    render(<YearGrid year={year} selected={null} onSelect={() => {}} />);

    const grid = screen.getByRole("grid", { name: /night-shift plan for 2026/i });
    expect(grid).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(13);

    const cell = screen.getByRole("gridcell", { name: /^Friday, 2 January 2026/ });
    expect(cell).toHaveAttribute("data-status", "overrun");
    expect(cell).toHaveAccessibleName(/Overrun warning/);
  });

  it("moves focus with the arrow keys and selects with Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const year = buildYear(2026, [], [], rules);
    render(<YearGrid year={year} selected={null} onSelect={onSelect} />);

    await user.tab();
    expect(screen.getByRole("gridcell", { name: /^[A-Za-z]+, 1 January 2026/ })).toHaveFocus();

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("gridcell", { name: /^[A-Za-z]+, 3 January 2026/ })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("gridcell", { name: /^[A-Za-z]+, 3 February 2026/ })).toHaveFocus();

    await user.keyboard("{End}");
    expect(screen.getByRole("gridcell", { name: /^[A-Za-z]+, 28 February 2026/ })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("2026-02-28");

    // Only one cell is in the tab order (roving tabindex).
    const focusable = screen
      .getAllByRole("gridcell")
      .filter((el) => el.getAttribute("tabindex") === "0");
    expect(focusable).toHaveLength(1);
  });
});

describe("App", () => {
  it("opens the night panel, adds a window and persists it", async () => {
    const user = userEvent.setup();
    render(<App />);

    const cell = screen.getByRole("gridcell", { name: /^Thursday, 1 January 2026/ });
    await user.click(cell);

    const panel = screen.getByRole("complementary", { name: /^[A-Za-z]+, 1 January 2026/ });
    expect(panel).toBeInTheDocument();
    // Seed data blocks New Year's night with an exception.
    expect(screen.getByRole("checkbox", { name: /service exception/i })).toBeChecked();

    await user.click(screen.getByRole("button", { name: /add window/i }));

    expect(screen.getByRole("gridcell", { name: /^[A-Za-z]+, 1 January 2026/ })).toHaveAttribute(
      "data-status",
      "conflict",
    );
    expect(screen.getByRole("list", { name: /warnings/i })).toHaveTextContent(
      /no work window allowed/i,
    );

    const stored = window.localStorage.getItem("planning-calendar-ui:v1");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored ?? "{}")).toMatchObject({ version: 1 });
  });
});
