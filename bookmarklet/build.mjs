// Bundles bookmarklet/src/index.ts (+ the same lib/recorder core the React
// app uses) into a single, dependency-free script: public/recorder-standalone.js.
// Next.js serves everything under public/ at the site root, so once this is
// built and `npm run dev`/`npm run build` is running, the file is reachable
// at http://localhost:3000/recorder-standalone.js — see bookmarklet.html for
// how the bookmarklet loads it.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.join(__dirname, "../public/recorder-standalone.js");

await build({
  entryPoints: [path.join(__dirname, "src/index.ts")],
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
