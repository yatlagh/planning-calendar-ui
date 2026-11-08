import type { NightStatus } from "../domain";
import { STATUS_GLYPH, STATUS_LABEL } from "./NightCell";

const ORDER: readonly NightStatus[] = ["empty", "planned", "overrun", "exception", "conflict"];

export function Legend() {
  return (
    <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
      {ORDER.map((status) => (
        <li key={status} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            data-status={status}
            className="night-cell !aspect-square !w-4 text-[9px]"
          >
            {STATUS_GLYPH[status]}
          </span>
          <span>{STATUS_LABEL[status]}</span>
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          data-status="empty"
          data-weekend="true"
          className="night-cell !aspect-square !w-4"
        />
        <span>Weekend night</span>
      </li>
    </ul>
  );
}
