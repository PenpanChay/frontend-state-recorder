import type {
  ActionEvent,
  ApiEvent,
  ErrorEvent,
  RecorderEvent,
  StateEvent,
  TimelineSnapshot,
} from "./types";

export interface BugReport {
  page: string;
  steps: string[];
  api?: {
    method: string;
    url: string;
    status?: number;
    statusText?: string;
  };
  errorMessage?: string;
  expected: string;
  actual: string;
  stateScope?: string;
  stateBefore: Record<string, unknown>;
  stateAfter: Record<string, unknown>;
  /** Full before→after→...→final history per state key, e.g.
   * `{ loading: [false, true, false] }` — mirrors the "State Change" view
   * from the design doc, not just the two endpoints. */
  stateTransitions: Record<string, unknown[]>;
  hasFailure: boolean;
}

function isActionEvent(event: RecorderEvent): event is ActionEvent {
  return event.type === "action";
}

function isStateEvent(event: RecorderEvent): event is StateEvent {
  return event.type === "state";
}

function isFailingApiEvent(event: RecorderEvent): event is ApiEvent {
  if (event.type !== "api") return false;
  if (event.phase === "error") return true;
  return event.phase === "response" && (event.status ?? 0) >= 400;
}

function isErrorEvent(event: RecorderEvent): event is ErrorEvent {
  return event.type === "error";
}

function describeAction(event: ActionEvent): string {
  switch (event.action) {
    case "click":
      return `Click "${event.target}"`;
    case "input":
      return `Enter "${event.value ?? ""}" into ${event.target}`;
    case "select":
      return `Select "${event.value ?? ""}" from ${event.target}`;
    case "navigate":
      return `Navigate to ${event.target}`;
    default:
      return event.target;
  }
}

/** The first page the recording touched — used as the report's "Page" field. */
export function findPage(events: RecorderEvent[]): string {
  const nav = events.filter(isActionEvent).find((e) => e.action === "navigate");
  if (nav) return nav.target;
  return typeof window !== "undefined" ? window.location.pathname : "/";
}

/** Human-readable reproduction steps, in order. Navigations are surfaced via
 * the "Page" field instead, so they're excluded here. */
export function buildReproductionSteps(events: RecorderEvent[]): string[] {
  return events
    .filter(isActionEvent)
    .filter((e) => e.action !== "navigate")
    .map(describeAction);
}

function firstStateScope(events: RecorderEvent[]): string | undefined {
  return events.find(isStateEvent)?.scope;
}

/** Merge every state event up to (and including) `uptoIndex` into a single
 * "current values" object, restricted to `scope` if given. */
function stateSnapshotUpTo(
  events: RecorderEvent[],
  uptoIndex: number,
  scope?: string,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const end = Math.min(uptoIndex, events.length - 1);
  for (let i = 0; i <= end; i++) {
    const event = events[i];
    if (!isStateEvent(event)) continue;
    if (scope && event.scope !== scope) continue;
    values[event.key] = event.nextValue;
  }
  return values;
}

/** Full value history per key, e.g. `loading: [false, true, false]`. */
export function buildStateTransitions(
  events: RecorderEvent[],
  scope?: string,
): Record<string, unknown[]> {
  const transitions: Record<string, unknown[]> = {};
  for (const event of events) {
    if (!isStateEvent(event)) continue;
    if (scope && event.scope !== scope) continue;
    if (!transitions[event.key]) {
      transitions[event.key] = [event.prevValue];
    }
    transitions[event.key].push(event.nextValue);
  }
  return transitions;
}

/**
 * Turn a raw event timeline into a structured bug report: reproduction
 * steps, the first failure encountered (a 4xx/5xx API response, a network
 * error, or an uncaught exception), and the app state right before/after it.
 *
 * MVP scope: this assumes one bug per recording, and reports the *first*
 * failure it finds — good enough for the "record → reproduce → report"
 * workflow this tool targets; it does not try to correlate multiple
 * independent errors in one session.
 */
export function generateBugReport(events: RecorderEvent[]): BugReport {
  const steps = buildReproductionSteps(events);
  const page = findPage(events);
  const scope = firstStateScope(events);
  const stateTransitions = buildStateTransitions(events, scope);

  const failingApi = events.find(isFailingApiEvent);
  const errorEvent = events.find(isErrorEvent);

  const failureEvent = failingApi ?? errorEvent;
  const failureIndex = failureEvent ? events.indexOf(failureEvent) : -1;
  const hasFailure = failureIndex !== -1;

  const stateBefore = hasFailure
    ? stateSnapshotUpTo(events, failureIndex - 1, scope)
    : {};
  const stateAfter = stateSnapshotUpTo(events, events.length - 1, scope);

  let expected = "The action should complete successfully.";
  let actual = "No error was captured during this recording.";

  if (failingApi) {
    expected = `${failingApi.method} ${failingApi.url} should return a successful response.`;
    actual = (
      failingApi.phase === "error"
        ? `${failingApi.method} ${failingApi.url} failed: ${failingApi.errorMessage ?? "network error"}`
        : `${failingApi.method} ${failingApi.url} returned ${failingApi.status} ${failingApi.statusText ?? ""}`
    ).trim();
  } else if (errorEvent) {
    expected = "The page should not throw a runtime error.";
    actual = `${errorEvent.source === "promise" ? "Unhandled promise rejection" : "Runtime error"}: ${errorEvent.message}`;
  }

  return {
    page,
    steps,
    api: failingApi
      ? {
          method: failingApi.method,
          url: failingApi.url,
          status: failingApi.status,
          statusText: failingApi.statusText,
        }
      : undefined,
    errorMessage: errorEvent?.message,
    expected,
    actual,
    stateScope: scope,
    stateBefore,
    stateAfter,
    stateTransitions,
    hasFailure,
  };
}

function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  return JSON.stringify(value);
}

function formatStateBlock(state: Record<string, unknown>): string[] {
  return Object.entries(state).map(([key, value]) => `${key} = ${formatValue(value)}`);
}

/** GitHub-flavored Markdown — used by "Copy to GitHub Issue". */
export function formatAsGitHubMarkdown(report: BugReport, title = "Bug Report"): string {
  const lines: string[] = [`## ${title}`, "", `**Page:** \`${report.page}\``, ""];

  lines.push("### Steps to Reproduce", "");
  if (report.steps.length === 0) {
    lines.push("_No user actions were captured._");
  } else {
    report.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  lines.push("");

  if (report.api) {
    lines.push("### API", "", "```", `${report.api.method} ${report.api.url}`, "```", "");
  }

  lines.push("### Expected", "", report.expected, "");
  lines.push("### Actual", "", report.actual, "");

  if (Object.keys(report.stateBefore).length > 0) {
    lines.push(
      "### State before",
      "",
      "```",
      ...formatStateBlock(report.stateBefore),
      "```",
      "",
    );
  }
  if (Object.keys(report.stateAfter).length > 0) {
    lines.push(
      "### State after (final)",
      "",
      "```",
      ...formatStateBlock(report.stateAfter),
      "```",
      "",
    );
  }

  return lines.join("\n").trim() + "\n";
}

/** Jira wiki markup — used by "Copy to Jira". */
export function formatAsJiraMarkup(report: BugReport, title = "Bug Report"): string {
  const lines: string[] = [`h2. ${title}`, "", `*Page:* {{${report.page}}}`, ""];

  lines.push("h3. Steps to Reproduce");
  if (report.steps.length === 0) {
    lines.push("_No user actions were captured._");
  } else {
    report.steps.forEach((step) => lines.push(`# ${step}`));
  }
  lines.push("");

  if (report.api) {
    lines.push("h3. API", "{code}" + `${report.api.method} ${report.api.url}` + "{code}", "");
  }

  lines.push("h3. Expected", report.expected, "");
  lines.push("h3. Actual", report.actual, "");

  if (Object.keys(report.stateBefore).length > 0) {
    lines.push(
      "h3. State before",
      "{code}",
      ...formatStateBlock(report.stateBefore),
      "{code}",
      "",
    );
  }
  if (Object.keys(report.stateAfter).length > 0) {
    lines.push(
      "h3. State after (final)",
      "{code}",
      ...formatStateBlock(report.stateAfter),
      "{code}",
      "",
    );
  }

  return lines.join("\n").trim() + "\n";
}

/** Full-fidelity JSON export: the raw timeline plus the derived report, so
 * it's equally useful for a human reading it or a script replaying it. */
export function buildJsonExport(snapshot: TimelineSnapshot): string {
  const report = generateBugReport(snapshot.events);
  return JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      durationMs:
        snapshot.startedAt !== null && snapshot.stoppedAt !== null
          ? snapshot.stoppedAt - snapshot.startedAt
          : null,
      report,
      events: snapshot.events,
    },
    null,
    2,
  );
}
