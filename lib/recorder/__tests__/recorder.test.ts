import { beforeEach, describe, expect, it } from "vitest";
import { recorder } from "../recorder";
import { timelineStore } from "../timelineStore";

describe("recorder.trackAction", () => {
  beforeEach(() => {
    timelineStore.reset();
  });

  it("is a no-op while not recording", () => {
    recorder.trackAction("click", "Save");
    expect(timelineStore.getEvents()).toHaveLength(0);
  });

  it("records the action once recording is on", () => {
    timelineStore.start();
    recorder.trackAction("click", "Save");

    const [event] = timelineStore.getEvents();
    expect(event).toMatchObject({ type: "action", action: "click", target: "Save" });
  });
});

describe("recorder.trackState", () => {
  beforeEach(() => {
    timelineStore.reset();
  });

  it("emits one state event per key on the very first call for a scope", () => {
    timelineStore.start();
    recorder.trackState("test:first-call", { name: "", role: "Admin" });

    expect(timelineStore.getEvents()).toHaveLength(2);
  });

  it("only emits events for keys whose value actually changed", () => {
    const scope = "test:diff-only";
    // Establish a baseline while not recording — trackState still updates
    // its internal "last known values" map even when the store is idle,
    // it just doesn't log anything (mirrors a form mounting before the
    // user has hit Start Recording).
    recorder.trackState(scope, { name: "", loading: false, error: null });

    timelineStore.start();
    recorder.trackState(scope, { name: "Somchai", loading: false, error: null });

    const events = timelineStore.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "state",
      scope,
      key: "name",
      prevValue: "",
      nextValue: "Somchai",
    });
  });

  it("emits nothing when called again with identical values", () => {
    const scope = "test:no-change";
    timelineStore.start();
    recorder.trackState(scope, { count: 1 });
    recorder.trackState(scope, { count: 1 });

    expect(timelineStore.getEvents()).toHaveLength(1);
  });

  it("tracks multiple sequential updates as separate events, in order", () => {
    const scope = "test:sequence";
    timelineStore.start();
    recorder.trackState(scope, { loading: false });
    recorder.trackState(scope, { loading: true });
    recorder.trackState(scope, { loading: false });

    const loadingEvents = timelineStore
      .getEvents()
      .filter((e) => e.type === "state" && e.key === "loading");
    expect(loadingEvents.map((e) => (e.type === "state" ? e.nextValue : undefined))).toEqual([
      false,
      true,
      false,
    ]);
  });
});
