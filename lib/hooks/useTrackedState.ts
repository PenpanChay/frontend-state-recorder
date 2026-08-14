"use client";

import { useEffect, useState } from "react";
import { recorder } from "../recorder/recorder";

type Patch<T> = Partial<T> | ((prev: T) => Partial<T>);

/**
 * Drop-in replacement for `useState<T>` where `T` is a flat object (e.g. a
 * form's fields). Every render, the current value is mirrored into the
 * Recorder SDK under `scope` — the SDK diffs against the previous values
 * and only emits an event per key that actually changed, so this is cheap
 * to leave on all the time, not just while recording.
 *
 * This is the integration point the design doc's SDK sketch
 * (`recorder.trackState("userForm", { name, role, loading, error })`)
 * maps onto for a React app.
 */
export function useTrackedState<T extends Record<string, unknown>>(
  scope: string,
  initial: T,
): [T, (patch: Patch<T>) => void, (next: T) => void] {
  const [state, setState] = useState<T>(initial);

  useEffect(() => {
    recorder.trackState(scope, state);
  }, [state, scope]);

  const update = (patch: Patch<T>) => {
    setState((prev) => ({
      ...prev,
      ...(typeof patch === "function" ? patch(prev) : patch),
    }));
  };

  return [state, update, setState];
}
