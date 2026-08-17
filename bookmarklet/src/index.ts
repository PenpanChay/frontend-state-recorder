import { recorder } from "../../lib/recorder/recorder";
import { mountPanel } from "./panel";

/**
 * Entry point for the standalone bookmarklet bundle (see build.mjs).
 *
 * This is the whole point of the bookmarklet: dropping this one script tag
 * into ANY page — via a bookmarklet click, not a build step — is enough to
 * start recording. Nothing here assumes the host page is a React app, is
 * built with Next.js, or has any of this project's source in it at all.
 */
declare global {
  interface Window {
    __fsrBookmarkletLoaded?: boolean;
  }
}

(function bootstrap() {
  if (typeof window === "undefined") return;

  if (window.__fsrBookmarkletLoaded) {
    // Bookmarklet clicked twice on the same page — the widget is already
    // there and recording state is preserved, so just leave it alone.
    console.info("[Frontend State Recorder] already loaded on this page.");
    return;
  }
  window.__fsrBookmarkletLoaded = true;

  recorder.init();
  mountPanel();
})();
