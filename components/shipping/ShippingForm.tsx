"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CITY_OPTIONS, COUNTRIES, type Country } from "./countries";
import { ErrorModal } from "./ErrorModal";

interface FormState {
  country: Country;
  city: string;
  loading: boolean;
}

const INITIAL_STATE: FormState = {
  country: "Thailand",
  city: "Bangkok",
  loading: false,
};

/**
 * The demo app: a plain Shipping Address form (no recorder integration —
 * this project ships with zero recorder-related code; see the README's
 * "Recording a bug here" section for the bookmarklet-based alternative)
 * with a real validation bug — changing Country never resets City, so a
 * stale City value from before the Country change can get submitted
 * alongside it (see app/api/shipping/route.ts). Order-dependent, 100%
 * deterministic: a dev who habitually tests "country first" will never see
 * it locally, while QA (or a real user correcting a mis-picked country)
 * hits it every time.
 */
export function ShippingForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Console noise for testing scanners (see README "Console issues for
  // testing scanners"). The deprecation-style console.warn below is still
  // an intentional fixture. The page-view analytics call and the
  // shipping-metrics-panel access used to be broken on purpose too (a 404
  // and an uncaught TypeError) — they're now wired up for real instead:
  // /api/shipping-analytics exists, and the panel lookup is null-guarded.
  useEffect(() => {
    console.warn(
      "[frontend-state-recorder] Legacy field-tracking listener is deprecated; migrate to state-recorder-sdk's useTrackedState instead.",
    );

    fetch("/api/shipping-analytics").then(async (response) => {
      if (!response.ok) {
        console.error(
          `[frontend-state-recorder] Failed to record page-view analytics: HTTP ${response.status}`,
        );
      }
      // Drain the body so this fetch doesn't look "still in flight" to a
      // headless browser waiting for network-idle (e.g.
      // console-warning-collector-web's scanner), which could otherwise
      // hang until its navigation timeout.
      await response.text().catch(() => {});
    });

    const timer = setTimeout(() => {
      // shipping-metrics-panel is never rendered on this page, so guard
      // against a null element instead of asserting it's always there.
      const panel = document.getElementById("shipping-metrics-panel");
      if (panel) {
        panel.dataset.ready = "true";
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  function handleCountryChange(country: Country) {
    setForm((prev) => ({ ...prev, country }));
  }

  function handleCityChange(city: string) {
    setForm((prev) => ({ ...prev, city }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForm((prev) => ({ ...prev, loading: true }));

    try {
      const response = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: form.country, city: form.city }),
      });

      if (!response.ok) {
        // Deliberately not reading/surfacing the response body here — the
        // API's validation message (e.g. which city/country combo was
        // invalid) is useful for a recorder/log to capture, but not
        // something the end user needs to see.
        setForm((prev) => ({ ...prev, loading: false }));
        setShowErrorModal(true);
        return;
      }

      setForm((prev) => ({ ...prev, loading: false }));
      router.push("/success");
    } catch {
      setForm((prev) => ({ ...prev, loading: false }));
      setShowErrorModal(true);
    }
  }

  return (
    <>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-5 dark:border-zinc-900">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg dark:bg-zinc-50">
            📦
          </span>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Shipping Address</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          <label className="flex flex-col gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Country</span>
            <select
              name="Country"
              data-record-field="Country"
              value={form.country}
              disabled={form.loading}
              onChange={(e) => handleCountryChange(e.target.value as Country)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-800"
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">City</span>
            <select
              name="City"
              data-record-field="City"
              value={form.city}
              disabled={form.loading}
              onChange={(e) => handleCityChange(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-800"
            >
              {CITY_OPTIONS[form.country].map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            data-record-label="Save Address"
            disabled={form.loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {form.loading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900" />
            )}
            {form.loading ? "Saving..." : "Save Address"}
          </button>
        </form>
      </div>
      {showErrorModal && <ErrorModal onClose={() => setShowErrorModal(false)} />}
    </>
  );
}
