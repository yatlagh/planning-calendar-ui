import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  IsoDate,
  LineRules,
  PlannerYear,
  ServiceException,
  Summary,
  WorkWindow,
} from "../domain";
import { buildYear, summarize } from "../domain";
import { LINE_RULES, PLAN_YEAR, SAMPLE } from "../data/sample";

export const STORAGE_KEY = "planning-calendar-ui:v1";

interface PersistedState {
  readonly version: 1;
  readonly windows: readonly WorkWindow[];
  readonly exceptions: readonly ServiceException[];
}

export interface PlannerState {
  readonly year: PlannerYear;
  readonly summary: Summary;
  readonly rules: LineRules;
  readonly selected: IsoDate | null;
  readonly select: (night: IsoDate | null) => void;
  readonly addWindow: (input: Omit<WorkWindow, "id">) => void;
  readonly updateWindow: (id: string, patch: Partial<Omit<WorkWindow, "id" | "night">>) => void;
  readonly removeWindow: (id: string) => void;
  readonly setException: (night: IsoDate, exception: Omit<ServiceException, "id" | "night"> | null) => void;
  readonly reset: () => void;
}

function readStorage(storage: Storage | undefined): PersistedState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as { version?: unknown }).version === 1 &&
      Array.isArray((parsed as { windows?: unknown }).windows) &&
      Array.isArray((parsed as { exceptions?: unknown }).exceptions)
    ) {
      return parsed as PersistedState;
    }
  } catch {
    // Corrupt or inaccessible storage: fall through to the seed data.
  }
  return null;
}

function writeStorage(storage: Storage | undefined, state: PersistedState): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or private mode: persistence is best-effort.
  }
}

let idCounter = 0;
const nextId = (): string => `w-u${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export interface UsePlannerOptions {
  readonly storage?: Storage | undefined;
  readonly rules?: LineRules;
  readonly planYear?: number;
}

/**
 * Owns the editable plan (windows + exceptions), persists it to
 * localStorage and derives the read-only year model and summary.
 */
export function usePlanner(options: UsePlannerOptions = {}): PlannerState {
  const storage =
    options.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const rules = options.rules ?? LINE_RULES;
  const planYear = options.planYear ?? PLAN_YEAR;

  const [data, setData] = useState<PersistedState>(() => {
    return (
      readStorage(storage) ?? {
        version: 1,
        windows: SAMPLE.windows,
        exceptions: SAMPLE.exceptions,
      }
    );
  });
  const [selected, setSelected] = useState<IsoDate | null>(null);

  useEffect(() => {
    writeStorage(storage, data);
  }, [data, storage]);

  const year = useMemo(
    () => buildYear(planYear, data.windows, data.exceptions, rules),
    [planYear, data, rules],
  );
  const summary = useMemo(() => summarize(year), [year]);

  const addWindow = useCallback((input: Omit<WorkWindow, "id">) => {
    setData((prev) => ({
      ...prev,
      windows: [...prev.windows, { ...input, id: nextId() }],
    }));
  }, []);

  const updateWindow = useCallback(
    (id: string, patch: Partial<Omit<WorkWindow, "id" | "night">>) => {
      setData((prev) => ({
        ...prev,
        windows: prev.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      }));
    },
    [],
  );

  const removeWindow = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      windows: prev.windows.filter((w) => w.id !== id),
    }));
  }, []);

  const setException = useCallback(
    (night: IsoDate, exception: Omit<ServiceException, "id" | "night"> | null) => {
      setData((prev) => {
        const others = prev.exceptions.filter((e) => e.night !== night);
        return {
          ...prev,
          exceptions: exception
            ? [...others, { ...exception, id: `ex-${night}`, night }]
            : others,
        };
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setData({ version: 1, windows: SAMPLE.windows, exceptions: SAMPLE.exceptions });
  }, []);

  return {
    year,
    summary,
    rules,
    selected,
    select: setSelected,
    addWindow,
    updateWindow,
    removeWindow,
    setException,
    reset,
  };
}
