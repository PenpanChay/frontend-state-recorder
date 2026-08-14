import type { Metadata } from "next";
import "./globals.css";
import { RecorderWidget } from "@/components/recorder/RecorderWidget";

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
        <RecorderWidget />
      </body>
    </html>
  );
}
