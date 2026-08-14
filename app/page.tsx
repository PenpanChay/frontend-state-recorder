import { ShippingForm } from "@/components/shipping/ShippingForm";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-gradient-to-b from-zinc-50 to-zinc-100 px-6 py-16 dark:from-black dark:to-zinc-950">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Frontend State Recorder
        </h1>
      </div>

      <ShippingForm />
    </div>
  );
}
