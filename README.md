# Frontend State Recorder

A small dev-tool widget that records what a user actually did — clicks,
field input, API calls, and app state — and turns it into a precise bug
reproduction report. It closes this gap:

> QA: "The Submit button errors."
> Dev: "What did you click? What did you type?"

Hit **Start Recording**, reproduce the bug once, hit **Stop**, and copy
the generated report straight into Jira or a GitHub issue.

**Who it's for:** **QA/Software Testers**, who get an exact timestamped
reproduction instead of hand-writing repro steps from memory, and
**Frontend Developers**, who get that same report with state before/after
already attached, so reproducing the bug locally needs no round trip of
clarifying questions back to QA.

**Captured automatically, no integration needed:** clicks, field changes,
every `fetch()` call, uncaught errors, and navigation. Captured with one
line per form (`useTrackedState`): the form/page's own state, before and
after.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** — demo app and dashboard UI
- **Tailwind CSS v4** — demo app's own styling only; the recorder widget itself ships with zero CSS dependencies
- **Vitest** — unit tests for the recorder core
- No backend, database, or external service — runs entirely client-side in memory

## Setup

```bash
npm install        # 1. Install
npm run dev         # 2. Run — open http://localhost:3000
```

No configuration step: this tool has no backend and no third-party
integrations, so there are no environment variables to set (`.env.example`
documents that explicitly — there's no `.env` to create).

Also available: `npm run build` (production build + type check),
`npm run lint`, `npm run test`.

## Usage example

The page is a **Shipping Address** form with a real, order-dependent bug:
changing **Country** never resets **City**. Picking City first, then
changing Country, always fails (400) — picking Country first always
succeeds. It's 100% deterministic, but "I set my address and it failed"
alone doesn't explain why — only a step-by-step trace does:

1. Click the floating **Record a Bug** button, then **Start Recording**.
2. Pick a City (e.g. Chiang Mai), *then* change Country (e.g. United
   States), then click **Save Address** — it fails with a generic modal,
   but the recorder captures the real API response.
3. Click **Stop Recording**, then open the **Bug Report** tab.

Sample output:

```
## Bug Report

**Page:** `/`

### Steps to Reproduce
1. Select "Chiang Mai" in City
2. Select "United States" in Country
3. Click "Save Address"

### API
POST /api/shipping

### Expected
POST /api/shipping should return a successful response.

### Actual
POST /api/shipping returned 400 Invalid city "Chiang Mai" for United States.

### State before
country = "Thailand"
city = "Chiang Mai"
loading = true

### State after (final)
country = "United States"
city = "Chiang Mai"
loading = false
```

One-click **Copy to GitHub Issue** / **Copy to Jira** buttons, and
**Export JSON** for the raw timeline. Note the report captures field
order (City before Country) — that's the entire bug, and a plain "it
failed" report would never surface it.

## Reusing this in another project

`lib/recorder/`, `lib/hooks/`, and `components/recorder/` are plain
TypeScript/React — no Tailwind, no Next.js dependency, no `@/` path alias.
Copy the three folders into any React 18+ project (same relative layout,
or adjust the `../` import paths), then mount once:

```tsx
import { RecorderWidget } from "./components/recorder/RecorderWidget";

export default function App({ children }) {
  return (
    <>
      {children}
      <RecorderWidget />
    </>
  );
}
```

Clicks, field changes, navigation, `fetch`, and errors are then captured
automatically. To also track a component's own state, swap `useState` for
`useTrackedState("scopeName", initialState)` — same API, but only changed
keys get logged. Non-React apps can still use `lib/recorder/` directly
(`recorder.init()`, `recorder.trackState`/`trackAction`) but need their
own dashboard UI, since `components/recorder/` is React-specific.

## Tests

`lib/recorder/__tests__/` covers the store, the `trackState` diffing
logic, and the report generator against the demo scenario above.
