import type { IsoDate, Minutes } from "./types";

const pad = (n: number): string => String(n).padStart(2, "0");

export function toIsoDate(year: number, month: number, day: number): IsoDate {
  return `${year}-${pad(month + 1)}-${pad(day)}` as IsoDate;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/** Shift an ISO date by `days` (may be negative). */
export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return toIsoDate(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate());
}

/** Weekday for an ISO date, 0 = Sunday. */
export function weekdayOf(date: IsoDate): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Parse "HH:MM" into minutes. Hours >= 24 are allowed for next-morning times. */
export function parseClock(value: string): Minutes | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (m > 59 || h > 47) return null;
  return h * 60 + m;
}

/**
 * Format minutes as a clock time. Values past 24:00 wrap to the next
 * morning (1695 -> "04:15") and are annotated with a "+1" marker when
 * `markNextDay` is set.
 */
export function formatClock(min: Minutes, markNextDay = false): string {
  const wrapped = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const base = `${pad(h)}:${pad(m)}`;
  return markNextDay && min >= 1440 ? `${base} +1` : base;
}

export function formatDuration(min: Minutes): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${pad(m)}`;
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function formatLongDate(date: IsoDate): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const weekday = WEEKDAY_NAMES[weekdayOf(date)];
  const month = MONTH_NAMES[m - 1];
  return `${weekday}, ${d} ${month} ${y}`;
}
