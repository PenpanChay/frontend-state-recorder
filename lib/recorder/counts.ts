import type { RecorderEvent, RecordingCounts } from "./types";

/** Pure tally over a timeline — shared by the store (for internal bookkeeping)
 * and the UI (which reads `RecorderEvent[]` straight from a snapshot). */
export function countEvents(events: RecorderEvent[]): RecordingCounts {
  let actions = 0;
  let stateChanges = 0;
  let apiCalls = 0;
  let errors = 0;

  for (const event of events) {
    if (event.type === "action") {
      actions++;
    } else if (event.type === "state") {
      stateChanges++;
    } else if (event.type === "api") {
      if (event.phase === "request") apiCalls++;
      if (event.phase === "error" || (event.status ?? 0) >= 400) errors++;
    } else if (event.type === "error") {
      errors++;
    }
  }

  return { actions, stateChanges, apiCalls, errors, total: events.length };
}
