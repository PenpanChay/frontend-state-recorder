import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frontend State Recorder — Demo",
  description:
    "A plain demo app with a real, order-dependent bug. Record it with the state-recorder-sdk bookmarklet — nothing recorder-related runs in this app itself.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        {children}
        {/* No recorder widget mounted here on purpose — this app ships
         * with zero recorder integration. To record a session against it,
         * use the state-recorder-sdk bookmarklet (see bookmarklet/ and
         * the README's "Recording a bug here" section) instead. */}
      </body>
    </html>
  );
}
