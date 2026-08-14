import { describe, expect, it } from "vitest";
import { countEvents } from "../counts";
import type { RecorderEvent } from "../types";

function evt(partial: Partial<RecorderEvent> & Pick<RecorderEvent, "type">): RecorderEvent {
  return { id: "e", timestamp: 0, ...partial } as RecorderEvent;
}

describe("countEvents", () => {
  it("returns all zeros for an empty timeline", () => {
    expect(countEvents([])).toEqual({
      actions: 0,
      stateChanges: 0,
      apiCalls: 0,
      errors: 0,
      total: 0,
    });
  });

  it("tallies each event type independently", () => {
    const events: RecorderEvent[] = [
      evt({ type: "action", action: "click", target: "Save" }),
      evt({ type: "action", action: "input", target: "Name", value: "Somchai" }),
      evt({ type: "state", scope: "userForm", key: "name", prevValue: "", nextValue: "Somchai" }),
      evt({ type: "api", phase: "request", callId: "1", method: "POST", url: "/api/users" }),
      evt({
        type: "api",
        phase: "response",
        callId: "1",
        method: "POST",
        url: "/api/users",
        status: 500,
        ok: false,
      }),
      evt({ type: "error", source: "window", message: "boom" }),
    ];

    expect(countEvents(events)).toEqual({
      actions: 2,
      stateChanges: 1,
      apiCalls: 1,
      errors: 2, // the 500 response + the window error
      total: 6,
    });
  });

  it("counts a network-level api error (no response) as an error too", () => {
    const events: RecorderEvent[] = [
      evt({ type: "api", phase: "request", callId: "1", method: "GET", url: "/x" }),
      evt({ type: "api", phase: "error", callId: "1", method: "GET", url: "/x", errorMessage: "down" }),
    ];
    expect(countEvents(events).errors).toBe(1);
    expect(countEvents(events).apiCalls).toBe(1);
  });

  it("does not count a successful response as an error", () => {
    const events: RecorderEvent[] = [
      evt({ type: "api", phase: "request", callId: "1", method: "GET", url: "/x" }),
      evt({ type: "api", phase: "response", callId: "1", method: "GET", url: "/x", status: 200, ok: true }),
    ];
    expect(countEvents(events).errors).toBe(0);
  });
});
