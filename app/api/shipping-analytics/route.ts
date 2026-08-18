import { NextResponse } from "next/server";

/**
 * Page-view analytics endpoint for the Shipping Address form (see
 * ShippingForm.tsx's mount effect). Fire-and-forget from the client's
 * perspective — it only checks `response.ok`, so a 200 with an empty-ish
 * body is enough; there's no real analytics backend behind this demo.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
