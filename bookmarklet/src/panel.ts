import { recorder } from "../../lib/recorder/recorder";
import { timelineStore } from "../../lib/recorder/timelineStore";
import { countEvents } from "../../lib/recorder/counts";
import {
  buildJsonExport,
  formatAsGitHubMarkdown,
  formatAsJiraMarkup,
  generateBugReport,
} from "../../lib/recorder/report";
import { RECORDER_STYLES } from "../../components/recorder/styles";
import type { ActionEvent, RecorderEvent, RecordingCounts } from "../../lib/recorder/types";

/**
 * Vanilla-DOM twin of components/recorder/RecorderWidget.tsx.
 *
 * Exists because the bookmarklet has to work on pages that have no React at
 * all (any site, not just ones built with this stack) — so the dashboard UI
 * can't depend on it either. It reuses the exact same `RECORDER_STYLES` CSS
 * and class names as the React widget, so it renders identically; only the
 * rendering mechanism (manual DOM string diffing instead of React) differs.
 *
 * Everything under lib/recorder/ is untouched — this only ports the
 * presentational layer that RecorderWidget.tsx / EventRow.tsx /
 * BugReportPanel.tsx own in the React build.
 */

type Tab = "summary" | "timeline" | "report";
type Format = "github" | "jira";

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function formatOffset(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function actionIcon(event: ActionEvent): string {
  switch (event.action) {
    case "click":
      return "🖱";
    case "input":
      return "⌨️";
    case "select":
      return "🔽";
    case "navigate":
      return "🧭";
  }
}

function actionSummary(event: ActionEvent): string {
  const target = escapeHtml(event.target);
  const value = escapeHtml(event.value ?? "");
  switch (event.action) {
    case "click":
      return `Click: ${target}`;
    case "input":
      return `Input ${target}: "${value}"`;
    case "select":
      return `Select ${target}: "${value}"`;
    case "navigate":
      return `Navigate: ${target}`;
  }
}

function iconFor(event: RecorderEvent): string {
  if (event.type === "action") return actionIcon(event);
  if (event.type === "state") return "🔄";
  if (event.type === "api") {
    if (event.phase === "request") return "🌐";
    if (event.phase === "error") return "❌";
    return (event.status ?? 0) >= 400 ? "❌" : "✅";
  }
  return "💥";
}

function summaryFor(event: RecorderEvent): string {
  if (event.type === "action") return actionSummary(event);
  if (event.type === "state") {
    const scope = escapeHtml(event.scope);
    const key = escapeHtml(event.key);
    const prev = escapeHtml(JSON.stringify(event.prevValue));
    const next = escapeHtml(JSON.stringify(event.nextValue));
    return `${scope}.${key}: ${prev} → ${next}`;
  }
  if (event.type === "api") {
    const url = escapeHtml(event.url);
    if (event.phase === "request") return `${event.method} ${url}`;
    if (event.phase === "error") return `${event.method} ${url} failed: ${escapeHtml(event.errorMessage ?? "")}`;
    return `${event.method} ${url} → ${event.status} ${escapeHtml(event.statusText ?? "")}`.trim();
  }
  return escapeHtml(event.message);
}

function isErrorLike(event: RecorderEvent): boolean {
  if (event.type === "error") return true;
  if (event.type === "api") return event.phase === "error" || (event.status ?? 0) >= 400;
  return false;
}

function downloadBlob(content: string, type: string, filename: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Mounts the floating widget on the current page. No-op if it's already
 * mounted (guards against double-injection if the bookmarklet is clicked
 * twice on the same page). */
export function mountPanel(): void {
  if (document.getElementById("fsr-bookmarklet-root")) return;

  const styleEl = document.createElement("style");
  styleEl.textContent = RECORDER_STYLES;
  document.head.appendChild(styleEl);

  const root = document.createElement("div");
  root.id = "fsr-bookmarklet-root";
  document.body.appendChild(root);

  let expanded = false;
  let tab: Tab = "summary";
  let format: Format = "github";
  let copied = false;
  const openEventIds = new Set<string>();

  function renderLauncher(recording: boolean): string {
    return `
      <button type="button" data-action="expand"
        title="Record your steps to auto-generate a bug report" class="fsr-launcher">
        <span class="${recording ? "fsr-pulse" : ""}">${recording ? "🔴" : "⏺"}</span>
        ${recording ? "Recording..." : "Record a Bug"}
      </button>`;
  }

  function renderStat(label: string, value: number, title: string, danger = false): string {
    return `
      <div class="fsr-stat" title="${escapeHtml(title)}">
        <div class="fsr-stat-value${danger ? " fsr-stat-value--danger" : ""}">${value}</div>
        <div class="fsr-stat-label">${label}</div>
      </div>`;
  }

  function renderSummaryTab(counts: RecordingCounts, recording: boolean, hasRecording: boolean): string {
    const rows = [
      ["🖱 User Actions", counts.actions],
      ["🔄 State Changes", counts.stateChanges],
      ["🌐 API Calls", counts.apiCalls],
      ["❌ Errors", counts.errors],
    ]
      .map(
        ([label, value]) => `
        <div class="fsr-summary-row">
          <span class="fsr-summary-label">${label}</span>
          <span class="fsr-summary-value">${value}</span>
        </div>`,
      )
      .join("");

    let footer = "";
    if (!recording && hasRecording) {
      footer = `
        <div class="fsr-actions-row">
          <button type="button" data-action="view-report" title="See the reproduction steps + Copy to GitHub/Jira" class="fsr-btn fsr-btn--primary">Generate Bug Report</button>
          <button type="button" data-action="export-json" title="Download the raw recording as a .json file" class="fsr-btn fsr-btn--secondary">Export JSON</button>
        </div>`;
    } else if (recording) {
      footer = `<p class="fsr-hint">🔴 Recording — use the page normally. When you hit the bug, click <strong>Stop Recording</strong> above.</p>`;
    } else {
      footer = `<p class="fsr-hint">👉 Click <strong>Start Recording</strong> above, then reproduce the bug. Stop when it happens — a report will be ready here.</p>`;
    }

    return `<div class="fsr-summary">${rows}${footer}</div>`;
  }

  function renderTimelineTab(events: RecorderEvent[]): string {
    if (events.length === 0) {
      return `
        <div class="fsr-empty">
          👉 Nothing yet — click <strong>Start Recording</strong> above, then use the page as
          normal. Every click, field change, and API call will show up here.
        </div>`;
    }
    const rows = events
      .map((event) => {
        const open = openEventIds.has(event.id);
        return `
        <li class="fsr-event-row">
          <button type="button" data-action="toggle-event" data-event-id="${event.id}"
            title="${open ? "Click to hide raw event data" : "Click to see raw event data"}"
            class="fsr-event-row-btn${isErrorLike(event) ? " fsr-event-row-btn--error" : ""}">
            <span class="fsr-event-time">${formatOffset(event.timestamp)}</span>
            <span class="fsr-event-icon">${iconFor(event)}</span>
            <span class="fsr-event-summary">${summaryFor(event)}</span>
          </button>
          ${open ? `<pre class="fsr-event-detail">${escapeHtml(JSON.stringify(event, null, 2))}</pre>` : ""}
        </li>`;
      })
      .join("");
    return `<ul class="fsr-event-list">${rows}</ul>`;
  }

  function renderReportTab(events: RecorderEvent[]): string {
    if (events.length === 0) {
      return `
        <div class="fsr-empty">
          👉 Nothing recorded yet. Click <strong>Start Recording</strong> above, then reproduce
          the bug — the report will appear here.
        </div>`;
    }

    const report = generateBugReport(events);
    const text = format === "github" ? formatAsGitHubMarkdown(report) : formatAsJiraMarkup(report);
    const banner = report.hasFailure
      ? `<div class="fsr-banner fsr-banner--error">❌ Bug detected — ${escapeHtml(report.actual)}</div>`
      : `<div class="fsr-banner fsr-banner--warning">⚠️ No error captured yet in this recording.</div>`;

    return `
      <div class="fsr-report">
        ${banner}
        <div class="fsr-format-toggle">
          <button type="button" data-action="set-format" data-format="github" class="fsr-format-btn${format === "github" ? " fsr-format-btn--active" : ""}">GitHub Issue</button>
          <button type="button" data-action="set-format" data-format="jira" class="fsr-format-btn${format === "jira" ? " fsr-format-btn--active" : ""}">Jira</button>
        </div>
        <pre class="fsr-report-text">${escapeHtml(text)}</pre>
        <div class="fsr-actions-row">
          <button type="button" data-action="copy-report" class="fsr-btn fsr-btn--primary">
            ${copied ? "Copied!" : format === "github" ? "Copy to GitHub Issue" : "Copy to Jira"}
          </button>
          <button type="button" data-action="download-report" title="Download this report as a .txt file" class="fsr-btn fsr-btn--secondary">Download Report</button>
        </div>
      </div>`;
  }

  function renderPanel(): string {
    const snapshot = timelineStore.getSnapshot();
    const counts = countEvents(snapshot.events);
    const hasRecording = snapshot.events.length > 0;

    const tabContent =
      tab === "summary"
        ? renderSummaryTab(counts, snapshot.recording, hasRecording)
        : tab === "timeline"
          ? renderTimelineTab(snapshot.events)
          : renderReportTab(snapshot.events);

    return `
      <div class="fsr-panel">
        <div class="fsr-header">
          <div class="fsr-header-main">
            <div class="fsr-header-title"><span aria-hidden="true">🎥</span> Frontend State Recorder</div>
            <p class="fsr-header-subtitle">Records clicks, form input, API calls &amp; errors — then builds a bug report for you.</p>
          </div>
          <button type="button" data-action="collapse" aria-label="Collapse"
            title="Collapse (recording keeps running in the background)" class="fsr-close-btn">✕</button>
        </div>

        <div class="fsr-status-row">
          <span class="fsr-status${snapshot.recording ? " fsr-status--recording" : ""}">
            <span class="${snapshot.recording ? "fsr-pulse" : ""}">${snapshot.recording ? "🔴" : "⚪"}</span>
            ${snapshot.recording ? "Recording" : "Idle"}
          </span>
          <button type="button" data-action="toggle-record"
            title="${snapshot.recording ? "Stop recording and generate the bug report" : "Start capturing clicks, input, API calls & errors from here on"}"
            class="fsr-record-btn ${snapshot.recording ? "fsr-record-btn--stop" : "fsr-record-btn--start"}">
            ${snapshot.recording ? "Stop Recording" : "Start Recording"}
          </button>
        </div>

        <div class="fsr-stats-grid">
          ${renderStat("Events", counts.total, "Everything captured so far, of every kind below")}
          ${renderStat("Actions", counts.actions, "Clicks, typing, selections & page navigation")}
          ${renderStat("API Calls", counts.apiCalls, "Every fetch() request and its response")}
          ${renderStat("Errors", counts.errors, "Failed API calls (4xx/5xx) and uncaught runtime errors", counts.errors > 0)}
        </div>

        <div class="fsr-tabs">
          <button type="button" data-action="set-tab" data-tab="summary" title="Live counts of what's been recorded" class="fsr-tab${tab === "summary" ? " fsr-tab--active" : ""}">Summary</button>
          <button type="button" data-action="set-tab" data-tab="timeline" title="Every recorded event, in order — click one for full detail" class="fsr-tab${tab === "timeline" ? " fsr-tab--active" : ""}">Timeline</button>
          <button type="button" data-action="set-tab" data-tab="report" title="Auto-generated repro steps, ready to copy to GitHub or Jira" class="fsr-tab${tab === "report" ? " fsr-tab--active" : ""}">Bug Report</button>
        </div>

        <div class="fsr-content">${tabContent}</div>
      </div>`;
  }

  function render(): void {
    const snapshot = timelineStore.getSnapshot();
    root.innerHTML = expanded ? renderPanel() : renderLauncher(snapshot.recording);
  }

  function handleToggleRecording(): void {
    if (timelineStore.isRecording()) {
      recorder.stop();
      tab = "report";
    } else {
      recorder.reset();
      recorder.start();
      recorder.trackNavigation(window.location.pathname);
      tab = "summary";
    }
    render();
  }

  async function handleCopy(): Promise<void> {
    const report = generateBugReport(timelineStore.getSnapshot().events);
    const text = format === "github" ? formatAsGitHubMarkdown(report) : formatAsJiraMarkup(report);
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      render();
      window.setTimeout(() => {
        copied = false;
        render();
      }, 1500);
    } catch {
      // Clipboard API can be blocked (permissions / insecure context) — the
      // report text is still visible in the panel for a manual copy.
    }
  }

  function handleDownloadReport(): void {
    const report = generateBugReport(timelineStore.getSnapshot().events);
    const text = format === "github" ? formatAsGitHubMarkdown(report) : formatAsJiraMarkup(report);
    downloadBlob(text, "text/plain", `bug-report-${format}-${Date.now()}.txt`);
  }

  function handleExportJson(): void {
    const json = buildJsonExport(timelineStore.getSnapshot());
    downloadBlob(json, "application/json", `state-recorder-${Date.now()}.json`);
  }

  root.addEventListener("click", (domEvent) => {
    const target = (domEvent.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");

    if (action === "expand") {
      expanded = true;
      render();
    } else if (action === "collapse") {
      expanded = false;
      render();
    } else if (action === "toggle-record") {
      handleToggleRecording();
    } else if (action === "set-tab") {
      tab = (target.getAttribute("data-tab") as Tab) ?? "summary";
      render();
    } else if (action === "view-report") {
      tab = "report";
      render();
    } else if (action === "export-json") {
      handleExportJson();
    } else if (action === "set-format") {
      format = (target.getAttribute("data-format") as Format) ?? "github";
      copied = false;
      render();
    } else if (action === "copy-report") {
      void handleCopy();
    } else if (action === "download-report") {
      handleDownloadReport();
    } else if (action === "toggle-event") {
      const id = target.getAttribute("data-event-id");
      if (!id) return;
      if (openEventIds.has(id)) openEventIds.delete(id);
      else openEventIds.add(id);
      render();
    }
  });

  timelineStore.subscribe(render);
  render();
}
