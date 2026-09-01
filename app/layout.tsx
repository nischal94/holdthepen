import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hold the Pen — WebMCP preflight",
  description:
    "You hold the pen. An agent-mediation layer for consequential forms. Preflight build.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
