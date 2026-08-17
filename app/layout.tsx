import type { Metadata } from "next";
import "./globals.css";
import { RecorderWidget } from "state-recorder-sdk/components/recorder/RecorderWidget";

export const metadata: Metadata = {
  title: "Frontend State Recorder",
  description:
    "Record user actions, state changes, and API calls, then generate a precise bug reproduction report.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        {children}
        {/* Mounted once, globally, so recording survives client-side
         * navigation between pages of the app being recorded. The widget
         * itself calls recorder.init() on mount — no separate route
         * tracker needed, since navigation is captured via a history.
         * pushState/popstate patch inside the SDK (framework-agnostic). */}
        <RecorderWidget />
      </body>
    </html>
  );
}
