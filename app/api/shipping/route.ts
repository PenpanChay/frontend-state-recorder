import { NextResponse } from "next/server";
import { CITY_OPTIONS, COUNTRIES, isCountry } from "@/components/shipping/countries";

/**
 * Validates the {country, city} combo server-side, against the exact same
 * mapping the form's <select> options come from. This is what turns the
 * frontend's stale-city bug (see ShippingForm.tsx) into a real, visible
 * error response instead of silently accepting a mismatched pair.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || !("country" in body) || !("city" in body)) {
    return NextResponse.json(
      { error: `Bad Request: expected { country, city }` },
      { status: 400 },
    );
  }

  const { country, city } = body as { country: string; city: string };

  if (!isCountry(country)) {
    return NextResponse.json(
      { error: `Unknown country: "${country}". Expected one of ${COUNTRIES.join(", ")}.` },
      { status: 400 },
    );
  }

  if (!CITY_OPTIONS[country].includes(city)) {
    return NextResponse.json(
      { error: `Invalid city "${city}" for ${country}.` },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Address saved" });
}
