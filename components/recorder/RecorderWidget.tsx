"use client";

import { useEffect, useMemo, useState } from "react";
import { recorder } from "../../lib/recorder/recorder";
import { useRecorderSnapshot } from "../../lib/hooks/useRecorderSnapshot";
import { countEvents } from "../../lib/recorder/counts";
import { buildJsonExport } from "../../lib/recorder/report";
import { EventRow } from "./EventRow";
import { BugReportPanel } from "./BugReportPanel";
import { RECORDER_STYLES } from "./styles";

type Tab = "summary" | "timeline" | "report";

/**
 * The Recorder Dashboard: a floating widget you mount once, anywhere in
 * your component tree (see app/layout.tsx for this project's usage).
 *
 * Portable by design: no Tailwind, no Next.js-specific APIs, no `@/` path
 * alias — everything under `components/recorder/` + `lib/recorder/` (and
 * optionally `lib/hooks/` for `useTrackedState`) can be copied as-is into
 * any React 18+ project. It talks to the SDK only through `recorder.*` and
 * the timeline store's own React hook, the same public surface any app
 * integrating the SDK would use.
 */
export function RecorderWidget() {
  const snapshot = useRecorderSnapshot();
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("summary");

  // Attaches the SDK's global click/change/fetch/history/error listeners.
  // Idempotent, so mounting the widget is all an app needs to do — no
  // separate "route tracker" component required.
  useEffect(() => {
    recorder.init();
  }, []);

  const counts = useMemo(() => countEvents(snapshot.events), [snapshot.events]);
  const hasRecording = snapshot.events.length > 0;

  function handleToggleRecording() {
    if (snapshot.recording) {
      recorder.stop();
      setTab("report");
      return;
    }
    recorder.reset();
    recorder.start();
    // Seed the timeline with the current page so reports have a "Page" to
    // point at, mirroring the "Page Loaded" first row in the design doc.
    recorder.trackNavigation(window.location.pathname);
    setTab("summary");
  }

  function handleExportJson() {
    const json = buildJsonExport(snapshot);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `state-recorder-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Injected once; scoped by the fsr- prefix so it can't collide with
       * the host app's own styles. This is what makes the widget render
       * identically whether or not the host project uses Tailwind. */}
      <style>{RECORDER_STYLES}</style>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Open Frontend State Recorder"
          title="Record your steps to auto-generate a bug report"
          className="fsr-launcher"
        >
          <span className={snapshot.recording ? "fsr-pulse" : ""}>
            {snapshot.recording ? "🔴" : "⏺"}
          </span>
          {snapshot.recording ? "Recording..." : "Record a Bug"}
        </button>
      ) : (
        <div className="fsr-panel">
          <div className="fsr-header">
            <div className="fsr-header-main">
              <div className="fsr-header-title">
                <span aria-hidden>🎥</span> Frontend State Recorder
              </div>
              <p className="fsr-header-subtitle">
                Records clicks, form input, API calls &amp; errors — then builds a bug report for you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Collapse"
              title="Collapse (recording keeps running in the background)"
              className="fsr-close-btn"
            >
              ✕
            </button>
          </div>

          <div className="fsr-status-row">
            <span className={`fsr-status${snapshot.recording ? " fsr-status--recording" : ""}`}>
              <span className={snapshot.recording ? "fsr-pulse" : ""}>
                {snapshot.recording ? "🔴" : "⚪"}
              </span>
              {snapshot.recording ? "Recording" : "Idle"}
            </span>
            <button
              type="button"
              onClick={handleToggleRecording}
              title={
                snapshot.recording
                  ? "Stop recording and generate the bug report"
                  : "Start capturing clicks, input, API calls & errors from here on"
              }
              className={`fsr-record-btn ${snapshot.recording ? "fsr-record-btn--stop" : "fsr-record-btn--start"}`}
            >
              {snapshot.recording ? "Stop Recording" : "Start Recording"}
            </button>
          </div>

          <div className="fsr-stats-grid">
            <Stat label="Events" value={counts.total} title="Everything captured so far, of every kind below" />
            <Stat label="Actions" value={counts.actions} title="Clicks, typing, selections & page navigation" />
            <Stat label="API Calls" value={counts.apiCalls} title="Every fetch() request and its response" />
            <Stat
              label="Errors"
              value={counts.errors}
              highlight={counts.errors > 0}
              title="Failed API calls (4xx/5xx) and uncaught runtime errors"
            />
          </div>

          <div className="fsr-tabs">
            {([
              ["summary", "Summary", "Live counts of what's been recorded"],
              ["timeline", "Timeline", "Every recorded event, in order — click one for full detail"],
              ["report", "Bug Report", "Auto-generated repro steps, ready to copy to GitHub or Jira"],
            ] as const).map(([key, label, hint]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                title={hint}
                className={`fsr-tab${tab === key ? " fsr-tab--active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="fsr-content">
            {tab === "summary" && (
              <SummaryTab
                counts={counts}
                recording={snapshot.recording}
                hasRecording={hasRecording}
                onExportJson={handleExportJson}
                onViewReport={() => setTab("report")}
              />
            )}
            {tab === "timeline" &&
              (hasRecording ? (
                <ul className="fsr-event-list">
                  {snapshot.events.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </ul>
              ) : (
                <div className="fsr-empty">
                  👉 Nothing yet — click <strong>Start Recording</strong> above, then use the
                  page as normal. Every click, field change, and API call will show up here.
                </div>
              ))}
            {tab === "report" && <BugReportPanel events={snapshot.events} />}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  highlight,
  title,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  title?: string;
}) {
  return (
    <div className="fsr-stat" title={title}>
      <div className={`fsr-stat-value${highlight ? " fsr-stat-value--danger" : ""}`}>{value}</div>
      <div className="fsr-stat-label">{label}</div>
    </div>
  );
}

function SummaryTab({
  counts,
  recording,
  hasRecording,
  onExportJson,
  onViewReport,
}: {
  counts: ReturnType<typeof countEvents>;
  recording: boolean;
  hasRecording: boolean;
  onExportJson: () => void;
  onViewReport: () => void;
}) {
  return (
    <div className="fsr-summary">
      <SummaryRow label="🖱 User Actions" value={counts.actions} />
      <SummaryRow label="🔄 State Changes" value={counts.stateChanges} />
      <SummaryRow label="🌐 API Calls" value={counts.apiCalls} />
      <SummaryRow label="❌ Errors" value={counts.errors} />

      {!recording && hasRecording && (
        <div className="fsr-actions-row">
          <button
            type="button"
            onClick={onViewReport}
            title="See the reproduction steps + Copy to GitHub/Jira"
            className="fsr-btn fsr-btn--primary"
          >
            Generate Bug Report
          </button>
          <button
            type="button"
            onClick={onExportJson}
            title="Download the raw recording as a .json file"
            className="fsr-btn fsr-btn--secondary"
          >
            Export JSON
          </button>
        </div>
      )}
      {recording && (
        <p className="fsr-hint">
          🔴 Recording — use the page normally. When you hit the bug, click{" "}
          <strong>Stop Recording</strong> above.
        </p>
      )}
      {!hasRecording && !recording && (
        <p className="fsr-hint">
          👉 Click <strong>Start Recording</strong> above, then reproduce the bug. Stop when
          it happens — a report will be ready here.
        </p>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="fsr-summary-row">
      <span className="fsr-summary-label">{label}</span>
      <span className="fsr-summary-value">{value}</span>
    </div>
  );
}
