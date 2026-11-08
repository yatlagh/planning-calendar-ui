# planning-calendar-ui

A year-at-a-glance calendar for planning night maintenance windows on a rail line. 365 nights on one screen, each with zero or more work windows (time, crew, zone, task). The app flags windows that run past the first-service cutoff, nights blocked by a service exception, and two crews booked in the same zone at the same time.

I built the real version of this for a client in 2026. This is a rebuild of the UI part only, with made-up rules and data, mostly because I wanted a public example of how I structure a React + TypeScript app and handle keyboard access on a dense grid.

![](docs/screenshot.png)

Live: https://yatlagh.github.io/planning-calendar-ui/

## Stack

Vite, React 18, TypeScript (strict, `noUncheckedIndexedAccess`), Tailwind 4, Vitest + Testing Library. No state library; one hook and `localStorage`.

## How it's organised

```
src/domain/      pure functions, no React
  types.ts       Night, WorkWindow, ServiceException, Warning, LineRules
  time.ts        minutes-after-midnight helpers (a window ending 04:15 is 1695)
  overruns.ts    detectOverruns(): cutoff, exception and overlap rules
  calendar.ts    buildYear()
  summary.ts     summarize()
src/hooks/usePlanner.ts   state, persistence, derived year + summary
src/components/           YearGrid, NightCell, NightPanel, SummaryBar, Legend
src/data/sample.ts        seeded sample year so the demo is the same everywhere
```

Times are integers (minutes after 00:00 on the night's date, can go past 1440), so every rule is a comparison and there's no timezone maths anywhere.

## Keyboard and screen readers

The grid is a WAI-ARIA `grid` with a roving tabindex: Tab once into it, then arrows move between nights, Home/End within the month, PageUp/PageDown to January/December, Enter opens the night. Each cell's accessible name is the full date + status + counts. Status isn't colour-only (`!` overrun, `x` conflict, hatched exception). Warnings go through an `aria-live` region. Reduced motion is respected.

## Scripts

```
npm install
npm run dev
npm test          # 18 tests
npm run build
npm run screenshot   # regenerates docs/screenshot.png with Playwright
```

`.github/workflows/pages.yml` tests, builds and deploys to GitHub Pages on push to `main`.

## Not done / ideas

- time inputs are plain text (HH:MM); a proper time picker that understands "past midnight" would be nicer
- drag a window from one night to another
- export the year as CSV
- mobile layout is usable but the grid really wants a wide screen

MIT.
