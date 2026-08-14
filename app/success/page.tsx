import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 px-6 py-16 dark:from-black dark:to-zinc-950">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xl shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-3xl dark:bg-emerald-950/40">
          ✅
        </span>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">บันทึกเรียบร้อย</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Your shipping address has been saved.</p>
        <Link
          href="/"
          className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
