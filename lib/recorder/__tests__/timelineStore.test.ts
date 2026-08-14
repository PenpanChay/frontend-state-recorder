import { beforeEach, describe, expect, it, vi } from "vitest";
import { timelineStore } from "../timelineStore";

describe("timelineStore", () => {
  beforeEach(() => {
    timelineStore.reset();
  });

  it("ignores addEvent while not recording", () => {
    timelineStore.addEvent({ type: "action", action: "click", target: "Save" });
    expect(timelineStore.getEvents()).toHaveLength(0);
  });

  it("records events once started, and assigns increasing ids", () => {
    timelineStore.start();
    timelineStore.addEvent({ type: "action", action: "click", target: "Save" });
    timelineStore.addEvent({ type: "action", action: "click", target: "Cancel" });

    const events = timelineStore.getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].id).not.toEqual(events[1].id);
  });

  it("stops accepting events after stop()", () => {
    timelineStore.start();
    timelineStore.addEvent({ type: "action", action: "click", target: "Save" });
    timelineStore.stop();
    timelineStore.addEvent({ type: "action", action: "click", target: "Ignored" });

    expect(timelineStore.getEvents()).toHaveLength(1);
    expect(timelineStore.isRecording()).toBe(false);
  });

  it("clears the timeline on start(), so a new recording begins fresh", () => {
    timelineStore.start();
    timelineStore.addEvent({ type: "action", action: "click", target: "Save" });
    timelineStore.stop();

    timelineStore.start();
    expect(timelineStore.getEvents()).toHaveLength(0);
  });

  it("notifies subscribers whenever the timeline changes", () => {
    const listener = vi.fn();
    const unsubscribe = timelineStore.subscribe(listener);

    timelineStore.start();
    expect(listener).toHaveBeenCalledTimes(1);

    timelineStore.addEvent({ type: "action", action: "click", target: "Save" });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    timelineStore.addEvent({ type: "action", action: "click", target: "Save" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("returns a stable snapshot reference until something changes", () => {
    timelineStore.start();
    const a = timelineStore.getSnapshot();
    const b = timelineStore.getSnapshot();
    expect(a).toBe(b);

    timelineStore.addEvent({ type: "action", action: "click", target: "Save" });
    const c = timelineStore.getSnapshot();
    expect(c).not.toBe(a);
  });
});
