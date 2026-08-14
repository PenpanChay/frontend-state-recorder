"use client";

import { useEffect } from "react";

/**
 * Deliberately generic — see ShippingForm.tsx: the API's detailed
 * validation message is not passed in here on purpose, so there's nothing
 * for this modal to show but the fact that it failed. The recorder still
 * captures the real response (see the Bug Report tab) even though the user
 * never sees it on screen.
 */
export function ErrorModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="shipping-error-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl dark:bg-red-950/40">
            ⚠️
          </span>
          <p id="shipping-error-title" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Something went wrong. Please try again.
          </p>
          <button
            type="button"
            onClick={onClose}
            data-record-label="Dismiss Error"
            className="mt-1 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
