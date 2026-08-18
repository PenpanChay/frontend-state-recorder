# Frontend State Recorder (demo)

A plain demo app with a real, order-dependent bug — a testbed for
**state-recorder-sdk**, a small dev-tool widget that records what a user
actually did (clicks, field input, API calls, and app state) and turns it
into a precise bug reproduction report. It closes this gap:

> QA: "The Submit button errors."
> Dev: "What did you click? What did you type?"

This app itself ships with **zero recorder-related code** — no widget
mounted, no tracking hooks, not even a devDependency on the SDK. To record
a session against it, you inject the recorder from the outside using
**`state-recorder-sdk`'s bookmarklet** (see "Recording a bug here" below).
That's a deliberate choice: it proves the tool works on a target project
that was never written with it in mind — no code, no dependency, nothing
committed here — the same way it'd work on any other site.

## This repo vs. the SDK

The recorder widget, its capture logic, and the bookmarklet all live in a
separate, independent package,
[`state-recorder-sdk`](../state-recorder-sdk). This repo is just the
**demo/testbed**: a Shipping Address form with a real bug, and nothing
else.

If you want to understand how the recorder itself works, reuse it in a
project you *do* control (mounting the widget + `useTrackedState` for state
capture), or read its test suite, go to `state-recorder-sdk`'s own README —
this file only covers running *this* demo and recording against it via the
bookmarklet.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — styling only
- No backend, database, or external service — the shipping "API" is a
  local Next.js route handler
- No dependency on `state-recorder-sdk` at all — see "Recording a bug
  here" below for how the two projects connect without one

## Setup

```bash
npm install
npm run dev   # open http://localhost:3000
```

No configuration step: this tool has no backend and no third-party
integrations, so there are no environment variables to set (`.env.example`
documents that explicitly — there's no `.env` to create).

Also available: `npm run build` (production build + type check) and
`npm run lint`. This project has no test suite of its own — see "Tests"
below.

## The bug

The page is a **Shipping Address** form with a real, order-dependent bug:
changing **Country** never resets **City**. Picking City first, then
changing Country, always fails (400) — picking Country first always
succeeds. It's 100% deterministic, but "I set my address and it failed"
alone doesn't explain why — only a step-by-step trace does, which is what
the recorder is for.

## Recording a bug here

This app has no built-in "Record a Bug" button and no bookmarklet build of
its own — build it from `state-recorder-sdk` instead (see that repo's
README for details); it works against *any* running site, this demo
included, with no hosting step needed:

1. In `state-recorder-sdk`: `npm install`, then
   `npm run build:bookmarklet` — produces `dist/bookmarklet.html`.
2. Open that file **as a local file** (e.g. `open dist/bookmarklet.html`
   from a terminal, or double-click it) — it's a static page, not
   something any dev server routes, so a `localhost:3000/...` URL for it
   will 404. Drag the **⏺ Record a Bug** button into your bookmarks bar.
3. Run this demo (`npm run dev`, `http://localhost:3000`) and click the
   bookmarklet — the widget appears on the page.
4. Click **Start Recording**.
5. Pick a City (e.g. Chiang Mai), *then* change Country (e.g. United
   States), then click **Save Address** — it fails with a generic modal,
   but the recorder captures the real API response.
6. Click **Stop Recording**, then open the **Bug Report** tab.

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

### Response
**Status:** 400 Bad Request
{
  "error": "Invalid city \"Chiang Mai\" for United States."
}

### Expected
POST /api/shipping should return a successful response.

### Actual
POST /api/shipping returned 400 Bad Request
```

Note the report includes a **Response** section with the API's actual
JSON response body (not just the HTTP status) whenever the failing call
returned one — the server's own error message, exactly as it came back,
not just "it failed." It also captures field order (City before
Country, via the generic click/select listener the bookmarklet installs)
— that's the entire bug, and a plain "it failed" report would never
surface it.

One-click **Copy to GitHub Issue** / **Copy to Jira** buttons, a
**Download Report** button (saves the formatted report above as a `.txt`
file), and **Export JSON** for the raw timeline.

**What you won't see here:** a `### State before` / `### State after`
section. That comes from `useTrackedState`, which this app deliberately
doesn't use — the bookmarklet injects its own separate copy of the
recorder into the page, with no way to reach into this app's own React
state, so there's nothing to wire up even if the app called it. Projects
that install `state-recorder-sdk` directly (as a real dependency, with the
widget mounted and `useTrackedState` used for their forms) get that section
too — see `state-recorder-sdk`'s README for that flow.

**Trade-off to know:** the bookmarklet's *dashboard* is fully standalone,
but the *instrumentation* (patching `fetch`/clicks/errors) is a browser
constraint — it still has to run inside the target page's own JavaScript
context once injected. A site with a strict Content-Security-Policy may
block the injected `<script>` tag; a browser extension (content script)
is the more robust alternative there, at the cost of extra setup
(`manifest.json`, packaging). Verified end-to-end with a headless-browser
check against a bare page with zero recorder code: cross-origin injection,
recording, a failing API call, the generated Bug Report (Response section
included), Download Report, and the double-injection guard all work
correctly.

## Tests

This project has no test suite of its own — it has no recorder-related
code to test. `state-recorder-sdk` covers the store, the `trackState`
diffing logic, and the report generator (`npm run test` there); this
repo's own `npm run build` + `npm run lint` are enough to confirm the demo
itself still works.

## Console issues for testing scanners

This app also intentionally logs a few real (not mocked) console
issues as soon as the page loads, so it can double as a target for a
console-scanning tool (e.g. `console-warning-collector-web`) instead of
only that tool's own bundled demo pages:

- A broken `<img>` (`/brand/company-logo.png` doesn't exist under
  `public/`) — a 404 plus the browser's own "Failed to load resource" log.
- `console.warn` on mount: a deprecation-style notice about the (fictional)
  legacy field-tracking listener.
- A `fetch("/api/shipping-analytics")` call on mount — that route doesn't
  exist, so it 404s and is logged via `console.error`.
- An uncaught exception on mount (`Cannot read properties of null`) from
  reading `.dataset` off an element that's never rendered on this page.

None of this touches the real Country/City bug above, the shipping API, or
the recorder bookmarklet flow — it's additive, always fires on page load
without any interaction, and is there purely so a console/network scanner
has real (if intentionally injected) issues to find on a "real" app instead
of a purpose-built demo page.
