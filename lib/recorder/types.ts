/**
 * Frontend State Recorder — core event model.
 *
 * These types are intentionally framework-agnostic: nothing in this file
 * imports React. The React-specific glue lives in `lib/hooks/*`.
 */

export type ActionKind = "click" | "input" | "select" | "navigate";

export type ApiPhase = "request" | "response" | "error";

export type RecorderEventType = "action" | "state" | "api" | "error";

interface BaseEvent {
  /** Monotonically increasing id, unique within a single recording session. */
  id: string;
  /** ms since the recording started (`timelineStore.start()`), not wall-clock epoch. */
  timestamp: number;
  type: RecorderEventType;
}

/** A user-driven interaction: clicking a button, typing into a field, etc. */
export interface ActionEvent extends BaseEvent {
  type: "action";
  action: ActionKind;
  /** Human-readable label for whatever was acted on, e.g. `Button: "Save"`. */
  target: string;
  /** Present for input/select — the value entered/chosen. */
  value?: string;
}

/** One field within a tracked state scope changed value. */
export interface StateEvent extends BaseEvent {
  type: "state";
  /** The name passed to `recorder.trackState(scope, patch)`, e.g. "userForm". */
  scope: string;
  key: string;
  prevValue: unknown;
  nextValue: unknown;
}

/** A network request made through the patched `fetch`. */
export interface ApiEvent extends BaseEvent {
  type: "api";
  phase: ApiPhase;
  method: string;
  url: string;
  /** Groups the request/response/error rows for the same call together. */
  callId: string;
  status?: number;
  statusText?: string;
  ok?: boolean;
  durationMs?: number;
  requestBody?: unknown;
  responseBody?: unknown;
  errorMessage?: string;
}

/** An uncaught exception, unhandled rejection, or other runtime error. */
export interface ErrorEvent extends BaseEvent {
  type: "error";
  source: "window" | "promise" | "console";
  message: string;
  stack?: string;
}

export type RecorderEvent = ActionEvent | StateEvent | ApiEvent | ErrorEvent;

/**
 * Plain `Omit<Union, K>` collapses a discriminated union down to its shared
 * keys only (a well-known TS gotcha), which would erase `action`/`scope`/
 * `phase`/`source` from the per-variant payloads. This distributes the
 * `Omit` over each union member instead, preserving them.
 */
export type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;

/** Shape callers pass to `timelineStore.addEvent` — everything but the
 * `id`/`timestamp` the store itself assigns. */
export type NewRecorderEvent = DistributiveOmit<RecorderEvent, "id" | "timestamp">;

export interface TimelineSnapshot {
  recording: boolean;
  startedAt: number | null;
  stoppedAt: number | null;
  events: RecorderEvent[];
}

export interface RecordingCounts {
  actions: number;
  stateChanges: number;
  apiCalls: number;
  errors: number;
  total: number;
}
