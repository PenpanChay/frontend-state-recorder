import { describe, expect, it } from "vitest";
import {
  buildJsonExport,
  buildReproductionSteps,
  findPage,
  formatAsGitHubMarkdown,
  formatAsJiraMarkup,
  generateBugReport,
} from "../report";
import type { NewRecorderEvent, RecorderEvent, TimelineSnapshot } from "../types";

/** Builds the timeline for the design doc's demo scenario: navigate to
 * /users, type a name, hit Create User, and the API fails with a 500. */
function demoTimeline(): RecorderEvent[] {
  let id = 0;
  const events: NewRecorderEvent[] = [
    { type: "action", action: "navigate", target: "/users" },
    { type: "action", action: "input", target: "Name", value: "Somchai" },
    { type: "state", scope: "userForm", key: "name", prevValue: "", nextValue: "Somchai" },
    { type: "action", action: "click", target: "Create User" },
    { type: "state", scope: "userForm", key: "loading", prevValue: false, nextValue: true },
    { type: "api", phase: "request", callId: "api_1", method: "POST", url: "/api/users" },
    {
      type: "api",
      phase: "response",
      callId: "api_1",
      method: "POST",
      url: "/api/users",
      status: 500,
      statusText: "Internal Server Error",
      ok: false,
      responseBody: { error: "Internal Server Error" },
    },
    { type: "state", scope: "userForm", key: "loading", prevValue: true, nextValue: false },
    {
      type: "state",
      scope: "userForm",
      key: "error",
      prevValue: null,
      nextValue: "Internal Server Error",
    },
  ];

  return events.map((event, index) => ({
    ...event,
    id: `evt_${++id}`,
    timestamp: index * 100,
  })) as RecorderEvent[];
}

describe("buildReproductionSteps", () => {
  it("describes each action in plain language, excluding navigation", () => {
    expect(buildReproductionSteps(demoTimeline())).toEqual([
      'Enter "Somchai" into Name',
      'Click "Create User"',
    ]);
  });

  it("returns an empty list when nothing was recorded", () => {
    expect(buildReproductionSteps([])).toEqual([]);
  });
});

describe("findPage", () => {
  it("uses the first navigate action as the page", () => {
    expect(findPage(demoTimeline())).toBe("/users");
  });
});

describe("generateBugReport", () => {
  it("detects the failing API call as the bug", () => {
    const report = generateBugReport(demoTimeline());
    expect(report.hasFailure).toBe(true);
    expect(report.api).toMatchObject({ method: "POST", url: "/api/users", status: 500 });
    expect(report.actual).toContain("500");
  });

  it("reconstructs state right before the failure and the final state after", () => {
    const report = generateBugReport(demoTimeline());
    expect(report.stateBefore).toEqual({ name: "Somchai", loading: true });
    expect(report.stateAfter).toEqual({
      name: "Somchai",
      loading: false,
      error: "Internal Server Error",
    });
  });

  it("builds a full transition history per state key, not just endpoints", () => {
    const report = generateBugReport(demoTimeline());
    expect(report.stateTransitions.loading).toEqual([false, true, false]);
    expect(report.stateTransitions.error).toEqual([null, "Internal Server Error"]);
  });

  it("reports no failure when nothing went wrong", () => {
    const events: RecorderEvent[] = [
      { id: "1", timestamp: 0, type: "action", action: "click", target: "Save" },
    ];
    const report = generateBugReport(events);
    expect(report.hasFailure).toBe(false);
    expect(report.actual).toMatch(/no error/i);
  });

  it("falls back to an uncaught runtime error when there is no failing API call", () => {
    const events: RecorderEvent[] = [
      { id: "1", timestamp: 0, type: "action", action: "click", target: "Save" },
      { id: "2", timestamp: 100, type: "error", source: "window", message: "x is not a function" },
    ];
    const report = generateBugReport(events);
    expect(report.hasFailure).toBe(true);
    expect(report.actual).toContain("x is not a function");
  });
});

describe("formatAsGitHubMarkdown / formatAsJiraMarkup", () => {
  const report = generateBugReport(demoTimeline());

  it("GitHub format includes the repro steps and the failing request as a code fence", () => {
    const md = formatAsGitHubMarkdown(report);
    expect(md).toContain("### Steps to Reproduce");
    expect(md).toContain('Click "Create User"');
    expect(md).toContain("POST /api/users");
    expect(md).toContain("500");
  });

  it("Jira format uses wiki markup instead of GitHub markdown", () => {
    const jira = formatAsJiraMarkup(report);
    expect(jira).toContain("h2.");
    expect(jira).toContain("h3. Steps to Reproduce");
    expect(jira).toContain("{code}");
    expect(jira).not.toContain("###");
  });
});

describe("buildJsonExport", () => {
  it("produces valid JSON containing both the report and the raw timeline", () => {
    const events = demoTimeline();
    const snapshot: TimelineSnapshot = {
      recording: false,
      startedAt: 0,
      stoppedAt: 900,
      events,
    };
    const parsed = JSON.parse(buildJsonExport(snapshot));
    expect(parsed.durationMs).toBe(900);
    expect(parsed.events).toHaveLength(events.length);
    expect(parsed.report.hasFailure).toBe(true);
  });
});
