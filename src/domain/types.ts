/**
 * Core domain model for the night-shift planning calendar.
 *
 * All times are expressed as minutes after 00:00 on the night's calendar
 * date, so a window from 23:30 to 04:15 is `{ startMin: 1410, endMin: 1695 }`
 * (1695 = 24 * 60 + 255). This avoids timezone arithmetic entirely and keeps
 * every rule a plain integer comparison.
 */

/** ISO calendar date, `YYYY-MM-DD`. Identifies a night by the evening it starts. */
export type IsoDate = `${number}-${number}-${number}`;

/** Minutes after midnight of the night's calendar date. May exceed 1440. */
export type Minutes = number;

export type ZoneId = "Z1" | "Z2" | "Z3" | "Z4";

export type CrewId = "A" | "B" | "C" | "D";

export interface WorkWindow {
  readonly id: string;
  readonly night: IsoDate;
  readonly startMin: Minutes;
  readonly endMin: Minutes;
  readonly crew: CrewId;
  readonly zone: ZoneId;
  readonly task: string;
}

export type ExceptionReason =
  | "extended-service"
  | "special-event"
  | "holiday"
  | "inspection-blackout";

/** A night on which no work window may be planned. */
export interface ServiceException {
  readonly id: string;
  readonly night: IsoDate;
  readonly reason: ExceptionReason;
  readonly note?: string;
}

/**
 * Operating rules for the line. The first service train departs at
 * `serviceStartMin` the following morning (expressed relative to the
 * night's date, so 05:00 is 1740). Work must clear the track by
 * `serviceStartMin - clearanceMin`.
 */
export interface LineRules {
  readonly serviceStartMin: Minutes;
  readonly clearanceMin: Minutes;
  /** Earliest possession start (after the last service train). */
  readonly possessionStartMin: Minutes;
}

export type WarningKind = "overrun" | "exception-conflict" | "overlap";

export type WarningSeverity = "warning" | "error";

export interface Warning {
  readonly kind: WarningKind;
  readonly severity: WarningSeverity;
  readonly night: IsoDate;
  readonly windowId: string;
  readonly message: string;
  /** Minutes past the allowed cutoff, for overruns. */
  readonly overrunMin?: Minutes;
}

export type NightStatus =
  | "empty"
  | "planned"
  | "overrun"
  | "exception"
  | "conflict";

export interface Night {
  readonly date: IsoDate;
  /** 0 = Sunday ... 6 = Saturday */
  readonly weekday: number;
  readonly month: number;
  readonly dayOfMonth: number;
  readonly windows: readonly WorkWindow[];
  readonly exception: ServiceException | null;
  readonly warnings: readonly Warning[];
  readonly status: NightStatus;
}

export interface PlannerYear {
  readonly year: number;
  readonly nights: readonly Night[];
  /** Nights grouped by month index 0-11 for rendering. */
  readonly months: readonly (readonly Night[])[];
}

export interface Summary {
  readonly totalNights: number;
  readonly plannedNights: number;
  readonly totalWindows: number;
  readonly totalWorkMinutes: number;
  readonly overrunCount: number;
  readonly conflictCount: number;
  readonly exceptionNights: number;
  readonly byZone: Readonly<Record<ZoneId, number>>;
  readonly byCrew: Readonly<Record<CrewId, number>>;
}
