/**
 * Shared between the client form (ShippingForm.tsx) and the server route
 * (app/api/shipping/route.ts) — the API validates against the exact same
 * country→city mapping the form's <select> options are built from, so a
 * stale `city` value is guaranteed to be rejected, not accidentally
 * accepted.
 */
export const COUNTRIES = ["Thailand", "United States", "Japan"] as const;
export type Country = (typeof COUNTRIES)[number];

export const CITY_OPTIONS: Record<Country, string[]> = {
  Thailand: ["Bangkok", "Chiang Mai", "Phuket"],
  "United States": ["New York", "Los Angeles", "Chicago"],
  Japan: ["Tokyo", "Osaka", "Kyoto"],
};

export function isCountry(value: string): value is Country {
  return (COUNTRIES as readonly string[]).includes(value);
}
