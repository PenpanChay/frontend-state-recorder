"use client";

import { useSyncExternalStore } from "react";
import { timelineStore } from "../recorder/timelineStore";
import type { TimelineSnapshot } from "../recorder/types";

const SERVER_SNAPSHOT: TimelineSnapshot = {
  recording: false,
  startedAt: null,
  stoppedAt: null,
  events: [],
};

/** Subscribes a component to the recorder's timeline store. Re-renders
 * whenever a new event is captured, recording starts/stops, or the
 * timeline is reset — but not on unrelated renders. */
export function useRecorderSnapshot(): TimelineSnapshot {
  return useSyncExternalStore(
    timelineStore.subscribe,
    timelineStore.getSnapshot,
    () => SERVER_SNAPSHOT,
  );
}
