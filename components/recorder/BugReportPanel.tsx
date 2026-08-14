"use client";

import { useMemo, useState } from "react";
import {
  formatAsGitHubMarkdown,
  formatAsJiraMarkup,
  generateBugReport,
} from "../../lib/recorder/report";
import type { RecorderEvent } from "../../lib/recorder/types";

type Format = "github" | "jira";

export function BugReportPanel({ events }: { events: RecorderEvent[] }) {
  const [format, setFormat] = useState<Format>("github");
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => generateBugReport(events), [events]);
  const text = useMemo(
    () => (format === "github" ? formatAsGitHubMarkdown(report) : formatAsJiraMarkup(report)),
    [report, format],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be blocked (permissions / insecure context) — the
      // report text is still visible below for a manual copy in that case.
    }
  }

  function handleDownload() {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bug-report-${format}-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (events.length === 0) {
    return (
      <div className="fsr-empty">
        👉 Nothing recorded yet. Click <strong>Start Recording</strong> above, then reproduce
        the bug — the report will appear here.
      </div>
    );
  }

  return (
    <div className="fsr-report">
      {report.hasFailure ? (
        <div className="fsr-banner fsr-banner--error">❌ Bug detected — {report.actual}</div>
      ) : (
        <div className="fsr-banner fsr-banner--warning">⚠️ No error captured yet in this recording.</div>
      )}

      <div className="fsr-format-toggle">
        {(["github", "jira"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={`fsr-format-btn${format === f ? " fsr-format-btn--active" : ""}`}
          >
            {f === "github" ? "GitHub Issue" : "Jira"}
          </button>
        ))}
      </div>

      <pre className="fsr-report-text">{text}</pre>

      <div className="fsr-actions-row">
        <button type="button" onClick={handleCopy} className="fsr-btn fsr-btn--primary">
          {copied ? "Copied!" : format === "github" ? "Copy to GitHub Issue" : "Copy to Jira"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          title="Download this report as a .txt file"
          className="fsr-btn fsr-btn--secondary"
        >
          Download Report
        </button>
      </div>
    </div>
  );
}
