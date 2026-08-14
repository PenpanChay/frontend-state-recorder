import { timelineStore } from "./timelineStore";
import type { ActionKind } from "./types";

/**
 * The Recorder SDK.
 *
 * Portability note: this file (and the rest of `lib/recorder/`) has zero
 * dependencies — no React, no Next.js, no CSS framework. It only touches
 * plain DOM/BOM APIs (`document`, `window.fetch`, `window.history`), so it
 * can be copied into any web app, framework or not, and just works.
 *
 * Scope note (see the design doc's "MVP" section): this does *not* try to
 * hook into React's internals to capture every component's state for free.
 * Instead, an app opts specific pieces of state in via `recorder.trackState`
 * (see `lib/hooks/useTrackedState.ts` for the ergonomic React wrapper) —
 * clicks, field changes, navigation, `fetch` calls, and runtime errors are
 * all captured automatically since those are observable from plain
 * DOM/window APIs, regardless of framework or router.
 */

/** Last known values per tracked scope, so `trackState` can diff and only
 * emit events for keys that actually changed. Kept outside the timeline
 * store on purpose: it reflects "current app state", independent of
 * whether a recording happens to be running right now. */
const lastKnownState = new Map<string, Record<string, unknown>>();

let initialized = false;
let fetchPatched = false;
let historyPatched = false;
let callCounter = 0;

function labelForElement(el: Element): string {
  const withLabel = el.closest("[data-record-label]");
  if (withLabel instanceof HTMLElement) {
    const label = withLabel.getAttribute("data-record-label");
    if (label) return label;
  }
  if (el instanceof HTMLElement) {
    const text = el.textContent?.trim();
    if (text) return text.slice(0, 60);
    const aria = el.getAttribute("aria-label");
    if (aria) return aria;
  }
  return el.tagName.toLowerCase();
}

function fieldLabel(el: HTMLElement): string {
  return (
    el.getAttribute("data-record-field") ||
    el.getAttribute("name") ||
    el.getAttribute("placeholder") ||
    el.id ||
    el.tagName.toLowerCase()
  );
}

export const recorder = {
  isRecording(): boolean {
    return timelineStore.isRecording();
  },

  start(): void {
    timelineStore.start();
  },

  stop(): void {
    timelineStore.stop();
  },

  reset(): void {
    timelineStore.reset();
  },

  /** Manually record a user action. Prefer this over relying on the
   * automatic DOM listeners for custom widgets they can't label well. */
  trackAction(action: ActionKind, target: string, value?: string): void {
    timelineStore.addEvent({ type: "action", action, target, value });
  },

  /** Manually record a navigation. Automatic navigation tracking (any
   * `history.pushState`/`replaceState` call, plus back/forward via
   * `popstate`) is wired up by `init()` — this is here for cases like
   * seeding the very first "page" when a recording starts. */
  trackNavigation(path: string): void {
    timelineStore.addEvent({ type: "action", action: "navigate", target: path });
  },

  /**
   * Diff `values` against the last known values for `scope` and emit one
   * StateEvent per changed key. Cheap to call on every render/update — it
   * only touches the timeline when a value actually changed and recording
   * is on (see `useTrackedState`, which calls this automatically).
   */
  trackState(scope: string, values: Record<string, unknown>): void {
    const prev = lastKnownState.get(scope) ?? {};
    const changedKeys = Object.keys(values).filter(
      (key) => !Object.is(prev[key], values[key]),
    );
    lastKnownState.set(scope, { ...prev, ...values });

    for (const key of changedKeys) {
      timelineStore.addEvent({
        type: "state",
        scope,
        key,
        prevValue: prev[key],
        nextValue: values[key],
      });
    }
  },

  /**
   * Attach the global click / field-change / fetch / error listeners.
   * Idempotent and safe to call multiple times (e.g. React StrictMode
   * double-invoking effects in dev) — only the first call does anything.
   */
  init(): void {
    if (initialized || typeof window === "undefined") return;
    initialized = true;

    // Capture phase so we still see the click even if a handler further
    // down the tree calls stopPropagation().
    document.addEventListener(
      "click",
      (event) => {
        if (!timelineStore.isRecording()) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const interactive = target.closest(
          'button, a, [role="button"], [data-record-label]',
        );
        if (!interactive) return;
        recorder.trackAction("click", labelForElement(interactive));
      },
      true,
    );

    document.addEventListener(
      "change",
      (event) => {
        if (!timelineStore.isRecording()) return;
        const target = event.target;
        if (
          !(target instanceof HTMLInputElement) &&
          !(target instanceof HTMLSelectElement) &&
          !(target instanceof HTMLTextAreaElement)
        ) {
          return;
        }
        const label = fieldLabel(target);
        if (target instanceof HTMLSelectElement) {
          const optionText = target.selectedOptions[0]?.textContent?.trim();
          recorder.trackAction("select", label, optionText || target.value);
        } else if (
          target instanceof HTMLInputElement &&
          (target.type === "checkbox" || target.type === "radio")
        ) {
          recorder.trackAction("select", label, String(target.checked));
        } else {
          recorder.trackAction("input", label, target.value);
        }
      },
      true,
    );

    window.addEventListener("error", (event) => {
      if (!timelineStore.isRecording()) return;
      timelineStore.addEvent({
        type: "error",
        source: "window",
        message: event.message || "Unknown error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      if (!timelineStore.isRecording()) return;
      const reason: unknown = event.reason;
      timelineStore.addEvent({
        type: "error",
        source: "promise",
        message:
          reason instanceof Error
            ? reason.message
            : typeof reason === "string"
              ? reason
              : "Unhandled promise rejection",
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });

    patchFetch();
    patchHistory();
  },
};

/**
 * Every client-side router (Next.js App/Pages Router, React Router, plain
 * `<a>` SPA navigation, etc.) ultimately calls `history.pushState` /
 * `replaceState`, or triggers `popstate` for back/forward — so patching
 * those two is enough to see every navigation without depending on any
 * particular router's APIs.
 */
function patchHistory(): void {
  if (historyPatched || typeof window === "undefined" || !window.history) return;
  historyPatched = true;

  const notifyNavigation = () => {
    if (!timelineStore.isRecording()) return;
    recorder.trackNavigation(window.location.pathname + window.location.search);
  };

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = ((...args: Parameters<typeof window.history.pushState>) => {
    originalPushState(...args);
    notifyNavigation();
  }) as typeof window.history.pushState;

  window.history.replaceState = ((...args: Parameters<typeof window.history.replaceState>) => {
    originalReplaceState(...args);
    notifyNavigation();
  }) as typeof window.history.replaceState;

  window.addEventListener("popstate", notifyNavigation);
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function patchFetch(): void {
  if (fetchPatched || typeof window === "undefined" || !window.fetch) return;
  fetchPatched = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!timelineStore.isRecording()) {
      return originalFetch(input, init);
    }

    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = requestUrl(input);
    const callId = `api_${++callCounter}`;
    const startedAt = Date.now();

    let requestBody: unknown;
    if (typeof init?.body === "string") {
      try {
        requestBody = JSON.parse(init.body);
      } catch {
        requestBody = init.body;
      }
    }

    timelineStore.addEvent({
      type: "api",
      phase: "request",
      callId,
      method,
      url,
      requestBody,
    });

    try {
      const response = await originalFetch(input, init);
      const durationMs = Date.now() - startedAt;
      let responseBody: unknown;
      try {
        responseBody = await response.clone().json();
      } catch {
        // Non-JSON or empty body — nothing to capture, that's fine.
      }
      timelineStore.addEvent({
        type: "api",
        phase: "response",
        callId,
        method,
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        durationMs,
        responseBody,
      });
      return response;
    } catch (err) {
      timelineStore.addEvent({
        type: "api",
        phase: "error",
        callId,
        method,
        url,
        durationMs: Date.now() - startedAt,
        errorMessage: err instanceof Error ? err.message : "Network error",
      });
      throw err;
    }
  }) as typeof fetch;
}
