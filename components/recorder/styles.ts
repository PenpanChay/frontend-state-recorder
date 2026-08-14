/**
 * Self-contained styling for the recorder widget — plain CSS injected via a
 * single `<style>` tag (see RecorderWidget.tsx), not Tailwind utility
 * classes. This is what makes `components/recorder/` copy-paste portable:
 * drop it into any React project (Tailwind or not) and it renders exactly
 * the same, including automatic light/dark mode via `prefers-color-scheme`.
 *
 * Class names are prefixed `fsr-` (Frontend State Recorder) to avoid
 * colliding with the host app's own CSS.
 */
export const RECORDER_STYLES = `
:root {
  --fsr-bg: #ffffff;
  --fsr-bg-subtle: #f4f4f5;
  --fsr-bg-hover: #f4f4f5;
  --fsr-border: #e4e4e7;
  --fsr-text: #18181b;
  --fsr-text-muted: #71717a;
  --fsr-text-faint: #a1a1aa;
  --fsr-accent: #18181b;
  --fsr-accent-hover: #3f3f46;
  --fsr-accent-text: #ffffff;
  --fsr-danger: #dc2626;
  --fsr-danger-hover: #b91c1c;
  --fsr-danger-bg: #fef2f2;
  --fsr-danger-text: #b91c1c;
  --fsr-success: #059669;
  --fsr-success-hover: #047857;
  --fsr-warning-bg: #fffbeb;
  --fsr-warning-text: #b45309;
  --fsr-shadow: 0 10px 30px rgba(0, 0, 0, 0.14);
  --fsr-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --fsr-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --fsr-bg: #09090b;
    --fsr-bg-subtle: #18181b;
    --fsr-bg-hover: #27272a;
    --fsr-border: #27272a;
    --fsr-text: #fafafa;
    --fsr-text-muted: #a1a1aa;
    --fsr-text-faint: #71717a;
    --fsr-accent: #fafafa;
    --fsr-accent-hover: #e4e4e7;
    --fsr-accent-text: #09090b;
    --fsr-danger: #f87171;
    --fsr-danger-hover: #ef4444;
    --fsr-danger-bg: rgba(127, 29, 29, 0.35);
    --fsr-danger-text: #fca5a5;
    --fsr-success: #34d399;
    --fsr-success-hover: #10b981;
    --fsr-warning-bg: rgba(120, 53, 15, 0.35);
    --fsr-warning-text: #fcd34d;
    --fsr-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  }
}

.fsr-launcher {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483000;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 9999px;
  background: var(--fsr-accent);
  color: var(--fsr-accent-text);
  padding: 12px 16px;
  font: 500 14px/1.2 var(--fsr-font);
  cursor: pointer;
  box-shadow: var(--fsr-shadow);
  transition: transform 0.15s ease;
}
.fsr-launcher:hover {
  transform: scale(1.05);
}

.fsr-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483000;
  width: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--fsr-border);
  border-radius: 12px;
  background: var(--fsr-bg);
  box-shadow: var(--fsr-shadow);
  font: 400 13px/1.4 var(--fsr-font);
  color: var(--fsr-text);
}

.fsr-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--fsr-border);
}
.fsr-header-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.fsr-header-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
}
.fsr-header-subtitle {
  margin: 0;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--fsr-text-muted);
}
.fsr-close-btn {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--fsr-text-faint);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  line-height: 1;
  font-size: 13px;
}
.fsr-close-btn:hover {
  background: var(--fsr-bg-hover);
  color: var(--fsr-text-muted);
}

.fsr-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--fsr-border);
}
.fsr-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--fsr-text-muted);
}
.fsr-status--recording {
  color: var(--fsr-danger);
}
.fsr-pulse {
  animation: fsr-pulse 1.4s ease-in-out infinite;
}
@keyframes fsr-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.fsr-record-btn {
  border: none;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
}
.fsr-record-btn--start {
  background: var(--fsr-success);
}
.fsr-record-btn--start:hover {
  background: var(--fsr-success-hover);
}
.fsr-record-btn--stop {
  background: var(--fsr-danger);
}
.fsr-record-btn--stop:hover {
  background: var(--fsr-danger-hover);
}

.fsr-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--fsr-border);
  border-bottom: 1px solid var(--fsr-border);
}
.fsr-stat {
  background: var(--fsr-bg);
  padding: 8px 4px;
  text-align: center;
}
.fsr-stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--fsr-text);
}
.fsr-stat-value--danger {
  color: var(--fsr-danger);
}
.fsr-stat-label {
  font-size: 11px;
  color: var(--fsr-text-faint);
}

.fsr-tabs {
  display: flex;
  border-bottom: 1px solid var(--fsr-border);
  font-size: 12px;
}
.fsr-tab {
  flex: 1;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px 8px;
  font-weight: 500;
  color: var(--fsr-text-faint);
  border-bottom: 2px solid transparent;
}
.fsr-tab:hover {
  color: var(--fsr-text-muted);
}
.fsr-tab--active {
  color: var(--fsr-text);
  border-bottom-color: var(--fsr-text);
}

.fsr-content {
  max-height: 384px;
  overflow-y: auto;
}

.fsr-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  font-size: 12px;
}
.fsr-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--fsr-bg-subtle);
  border-radius: 6px;
  padding: 6px 8px;
}
.fsr-summary-label {
  color: var(--fsr-text-muted);
}
.fsr-summary-value {
  font-weight: 600;
  color: var(--fsr-text);
}
.fsr-actions-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.fsr-btn {
  flex: 1;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
}
.fsr-btn--primary {
  border: none;
  background: var(--fsr-accent);
  color: var(--fsr-accent-text);
}
.fsr-btn--primary:hover {
  background: var(--fsr-accent-hover);
}
.fsr-btn--secondary {
  border: 1px solid var(--fsr-border);
  background: transparent;
  color: var(--fsr-text-muted);
}
.fsr-btn--secondary:hover {
  background: var(--fsr-bg-hover);
}
.fsr-hint {
  color: var(--fsr-text-faint);
  margin: 0;
}

.fsr-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 12px;
  color: var(--fsr-text-faint);
}

.fsr-event-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.fsr-event-row {
  border-bottom: 1px solid var(--fsr-border);
}
.fsr-event-row:last-child {
  border-bottom: none;
}
.fsr-event-row-btn {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--fsr-text-muted);
}
.fsr-event-row-btn:hover {
  background: var(--fsr-bg-hover);
}
.fsr-event-row-btn--error {
  color: var(--fsr-danger);
}
.fsr-event-time {
  flex-shrink: 0;
  font-family: var(--fsr-font-mono);
  font-size: 10px;
  color: var(--fsr-text-faint);
  margin-top: 1px;
}
.fsr-event-icon {
  flex-shrink: 0;
}
.fsr-event-summary {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}
.fsr-event-detail {
  overflow-x: auto;
  background: var(--fsr-bg-subtle);
  padding: 8px 12px;
  font-size: 10px;
  color: var(--fsr-text-muted);
  margin: 0;
  white-space: pre;
}

.fsr-report {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}
.fsr-banner {
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 500;
}
.fsr-banner--error {
  background: var(--fsr-danger-bg);
  color: var(--fsr-danger-text);
}
.fsr-banner--warning {
  background: var(--fsr-warning-bg);
  color: var(--fsr-warning-text);
}
.fsr-format-toggle {
  display: flex;
  gap: 2px;
  background: var(--fsr-bg-subtle);
  border-radius: 6px;
  padding: 2px;
  font-size: 12px;
}
.fsr-format-btn {
  flex: 1;
  border: none;
  background: transparent;
  border-radius: 4px;
  padding: 4px 8px;
  font-weight: 500;
  color: var(--fsr-text-faint);
  cursor: pointer;
}
.fsr-format-btn:hover {
  color: var(--fsr-text-muted);
}
.fsr-format-btn--active {
  background: var(--fsr-bg);
  color: var(--fsr-text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
.fsr-report-text {
  max-height: 192px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid var(--fsr-border);
  border-radius: 6px;
  background: var(--fsr-bg-subtle);
  padding: 8px;
  font-size: 11px;
  color: var(--fsr-text-muted);
  font-family: var(--fsr-font-mono);
  margin: 0;
}
.fsr-copy-btn {
  border: none;
  border-radius: 6px;
  background: var(--fsr-accent);
  color: var(--fsr-accent-text);
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.fsr-copy-btn:hover {
  background: var(--fsr-accent-hover);
}
`;
