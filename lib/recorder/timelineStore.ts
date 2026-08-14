import { countEvents } from "./counts";
import type {
  NewRecorderEvent,
  RecorderEvent,
  RecordingCounts,
  TimelineSnapshot,
} from "./types";

type Listener = () => void;

/**
 * In-memory timeline store for a single recording session.
 *
 * This is a plain pub/sub store (no external state library) so it can be
 * consumed from React via `useSyncExternalStore` and from non-React code
 * (the fetch/click/error interceptors in `recorder.ts`) without either side
 * depending on the other.
 */
class TimelineStore {
  private events: RecorderEvent[] = [];
  private recording = false;
  private startedAt: number | null = null;
  private stoppedAt: number | null = null;
  private nextId = 1;
  private listeners = new Set<Listener>();

  /** Cached snapshot object — only replaced when something actually changes,
   * so React's `useSyncExternalStore` doesn't re-render on every read. */
  private snapshot: TimelineSnapshot = this.buildSnapshot();

  private buildSnapshot(): TimelineSnapshot {
    return {
      recording: this.recording,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      events: this.events,
    };
  }

  private notify() {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): TimelineSnapshot => this.snapshot;

  isRecording(): boolean {
    return this.recording;
  }

  start() {
    if (this.recording) return;
    this.events = [];
    this.nextId = 1;
    this.recording = true;
    this.startedAt = Date.now();
    this.stoppedAt = null;
    this.notify();
  }

  stop() {
    if (!this.recording) return;
    this.recording = false;
    this.stoppedAt = Date.now();
    this.notify();
  }

  reset() {
    this.events = [];
    this.recording = false;
    this.startedAt = null;
    this.stoppedAt = null;
    this.nextId = 1;
    this.notify();
  }

  /** Push a new event onto the timeline. No-op while not recording, so every
   * interceptor in recorder.ts can call this unconditionally. */
  addEvent(event: NewRecorderEvent): void {
    if (!this.recording) return;
    const timestamp = this.startedAt ? Date.now() - this.startedAt : 0;
    const withMeta = {
      ...event,
      id: `evt_${this.nextId++}`,
      timestamp,
    } as RecorderEvent;
    this.events = [...this.events, withMeta];
    this.notify();
  }

  getEvents(): RecorderEvent[] {
    return this.events;
  }

  getCounts(): RecordingCounts {
    return countEvents(this.events);
  }
}

/** Singleton — one recording session per browser tab. */
export const timelineStore = new TimelineStore();
