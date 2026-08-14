"use client";

import { useState } from "react";
import type { ActionEvent, RecorderEvent } from "../../lib/recorder/types";

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
  switch (event.action) {
    case "click":
      return `Click: ${event.target}`;
    case "input":
      return `Input ${event.target}: "${event.value ?? ""}"`;
    case "select":
      return `Select ${event.target}: "${event.value ?? ""}"`;
    case "navigate":
      return `Navigate: ${event.target}`;
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
    return `${event.scope}.${event.key}: ${JSON.stringify(event.prevValue)} → ${JSON.stringify(event.nextValue)}`;
  }
  if (event.type === "api") {
    if (event.phase === "request") return `${event.method} ${event.url}`;
    if (event.phase === "error") return `${event.method} ${event.url} failed: ${event.errorMessage ?? ""}`;
    return `${event.method} ${event.url} → ${event.status} ${event.statusText ?? ""}`.trim();
  }
  return event.message;
}

function isErrorLike(event: RecorderEvent): boolean {
  if (event.type === "error") return true;
  if (event.type === "api") {
    return event.phase === "error" || (event.status ?? 0) >= 400;
  }
  return false;
}

export function EventRow({ event }: { event: RecorderEvent }) {
  const [open, setOpen] = useState(false);
  const errorLike = isErrorLike(event);

  return (
    <li className="fsr-event-row">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={open ? "Click to hide raw event data" : "Click to see raw event data"}
        className={`fsr-event-row-btn${errorLike ? " fsr-event-row-btn--error" : ""}`}
      >
        <span className="fsr-event-time">{formatOffset(event.timestamp)}</span>
        <span className="fsr-event-icon">{iconFor(event)}</span>
        <span className="fsr-event-summary">{summaryFor(event)}</span>
      </button>
      {open && <pre className="fsr-event-detail">{JSON.stringify(event, null, 2)}</pre>}
    </li>
  );
}
