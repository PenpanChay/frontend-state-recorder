// Thin wrapper: bundles the bookmarklet entry point that now lives in the
// state-recorder-sdk package (installed as a sibling dependency) into a
// single, dependency-free script served from this project's own public/
// folder. Next.js serves everything under public/ at the site root, so once
// this is built and `npm run dev`/`npm run build` is running, the file is
// reachable at http://localhost:3000/recorder-standalone.js — see
// bookmarklet.html for how the bookmarklet loads it.
//
// The actual recorder/panel source is not duplicated here; see
// node_modules/state-recorder-sdk/bookmarklet/ for the implementation.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(
  __dirname,
  "../node_modules/state-recorder-sdk/bookmarklet/src/index.ts"
);
const outfile = path.join(__dirname, "../public/recorder-standalone.js");

await build({
  entryPoints: [entry],
  bundle: true,
  format: "iife",
  target: ["es2019"],
  platform: "browser",
  outfile,
  minify: process.env.NODE_ENV === "production",
  sourcemap: false,
  legalComments: "none",
});

console.log(`Built ${path.relative(process.cwd(), outfile)}`);
