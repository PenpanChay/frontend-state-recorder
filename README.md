# Frontend State Recorder (demo)

A demo app for **state-recorder-sdk** — a small dev-tool widget that records
what a user actually did (clicks, field input, API calls, and app state) and
turns it into a precise bug reproduction report. It closes this gap:

> QA: "The Submit button errors."
> Dev: "What did you click? What did you type?"

Hit **Start Recording**, reproduce the bug once, hit **Stop**, and copy the
generated report straight into Jira or a GitHub issue.

**Who it's for:** **QA/Software Testers**, who get an exact timestamped
reproduction instead of hand-writing repro steps from memory, and
**Frontend Developers**, who get that same report with state before/after
already attached, so reproducing the bug locally needs no round trip of
clarifying questions back to QA.

**Captured automatically, no integration needed:** clicks, field changes,
every `fetch()` call, uncaught errors, and navigation. Captured with one
line per form (`useTrackedState`): the form/page's own state, before and
after.

## This repo vs. the SDK

The recorder widget, its capture logic, and the bookmarklet are **not** part
of this project anymore — they live in a separate, independent package,
[`state-recorder-sdk`](../state-recorder-sdk), consumed here as an ordinary
dependency. This repo is now just the **demo/testbed**: a Shipping Address
form with a real bug, wired up to the SDK so you can see it in action.

If you want to understand how the recorder itself works, reuse it in your
own project, or read its test suite, go to `state-recorder-sdk`'s own
README — this file only covers running *this* demo.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** — demo app only
- **Tailwind CSS v4** — demo app's own styling only; the recorder widget
  itself ships with zero CSS dependencies
- **state-recorder-sdk** — the recorder core, dashboard widget, and
  bookmarklet, installed as a sibling-folder dependency (see below)
- No backend, database, or external service — runs entirely client-side in
  memory

## Setup

This project depends on `state-recorder-sdk` via a relative path
(`file:../state-recorder-sdk`), so both repos need to be cloned as **sibling
folders**:

```
assignment/
├── frontend-state-recorder/   (this repo)
└── state-recorder-sdk/
```

```bash
git clone <frontend-state-recorder-url> frontend-state-recorder
git clone <state-recorder-sdk-url> state-recorder-sdk
cd frontend-state-recorder
npm install         # 1. Install (also links ../state-recorder-sdk)
npm run dev          # 2. Run — open http://localhost:3000
```

No configuration step: this tool has no backend and no third-party
integrations, so there are no environment variables to set (`.env.example`
documents that explicitly — there's no `.env` to create).

Also available: `npm run build` (production build + type check) and
`npm run lint`. Unit tests live in `state-recorder-sdk` (`npm run test`
there) since that's where the code they cover now lives.

**Why there's a `.npmrc` here:** it sets `install-links=true`, which makes
npm copy `state-recorder-sdk`'s files into `node_modules` instead of
symlinking them. Without it, Turbopack (Next's default dev/build engine)
fails to resolve `state-recorder-sdk`'s subpath imports (e.g.
`state-recorder-sdk/components/recorder/RecorderWidget`) through a
symlinked package — Node itself resolves them fine, but Turbopack's
resolver doesn't follow the `exports` map through the symlink the same way.
`npm install` picks this setting up automatically; you shouldn't need to do
anything, but if you ever see "Module not found: Can't resolve
'state-recorder-sdk/...'", check that `.npmrc` is still present and
re-run `npm install`.

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

### Response
**Status:** 400 Bad Request
{
  "error": "Invalid city \"Chiang Mai\" for United States."
}

### Expected
POST /api/shipping should return a successful response.

### Actual
POST /api/shipping returned 400 Bad Request

### State before
country = "Thailand"
city = "Chiang Mai"
loading = true

### State after (final)
country = "United States"
city = "Chiang Mai"
loading = false
```

Note the report includes a **Response** section with the API's actual
JSON response body (not just the HTTP status) whenever the failing call
returned one — the server's own error message, exactly as it came back,
not just "it failed." It also captures field order (City before
Country) — that's the entire bug, and a plain "it failed" report would
never surface it.

One-click **Copy to GitHub Issue** / **Copy to Jira** buttons, a
**Download Report** button (saves the formatted report above as a
`.txt` file — handy when clipboard access is blocked, or to attach the
file directly to a ticket/email), and **Export JSON** for the raw
timeline.

## Bookmarklet (works on any site — zero integration)

Everything above still requires the SDK to be installed into a project.
The bookmarklet goes one step further: a **vanilla-DOM build with no
React, no build-time integration at all** — a QA tester can drop a bookmark
into their bookmarks bar and click it on **any website** (production,
staging, a competitor's site, whatever they were about to test by hand) to
start recording, with nothing committed to that site's codebase.

The bookmarklet's source lives in `state-recorder-sdk/bookmarklet/`; this
project just builds and serves it locally for convenience:

```bash
npm run build:bookmarklet   # bundles state-recorder-sdk's bookmarklet -> public/recorder-standalone.js
npm run dev                  # serves it at http://localhost:3000/recorder-standalone.js
```

Then open `bookmarklet/bookmarklet.html` in a browser, drag the
**⏺ Record a Bug** button into your bookmarks bar, and click it on any
open tab. It renders the exact same widget (same CSS, same tabs, same Bug
Report/Download/Export flow), verified end-to-end with a headless-browser
check: injecting the built script cross-origin into a bare page with zero
recorder code, starting a recording, triggering a failing API call, and
confirming the generated Bug Report (including the Response section) and
Download Report button both work correctly, with the widget refusing to
double-mount if the bookmarklet is clicked twice on the same page.

**Trade-off to know:** the *dashboard* is fully standalone this way, but
the *instrumentation* (patching `fetch`/clicks/errors) is a browser
constraint — it still has to run inside the target page's own JavaScript
context once injected. A site with a strict Content-Security-Policy may
block the injected `<script>` tag; a browser extension (content script)
is the more robust alternative there, at the cost of extra setup
(`manifest.json`, packaging).

## Tests

This project itself has no test suite anymore — the recorder core, hooks,
and widget it depends on moved to `state-recorder-sdk`, and that's where
their tests live now (`npm run test` in that repo covers the store, the
`trackState` diffing logic, and the report generator). Run them there if
you're changing the SDK; this repo's own `npm run build` + `npm run lint`
are enough to confirm the demo still wires up to it correctly.
