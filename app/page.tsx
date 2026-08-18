import { ShippingForm } from "@/components/shipping/ShippingForm";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-gradient-to-b from-zinc-50 to-zinc-100 px-6 py-16 dark:from-black dark:to-zinc-950">
      <div className="max-w-lg text-center">
        {/* Intentionally broken (see README "Console issues for testing
         * scanners" section) — this path doesn't exist under public/, so it
         * 404s and the browser logs a console error. Used as a test fixture
         * for console-warning-collector-web; harmless to the actual
         * shipping-form bug demo below. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/company-logo.png"
          alt=""
          className="mx-auto mb-4 h-10 w-10"
        />
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Frontend State Recorder
        </h1>
      </div>

      <ShippingForm />
    </div>
  );
}
