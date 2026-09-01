import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reviewable Actions — WebMCP preflight",
  description:
    "Agent-mediation layer for consequential forms. Preflight build.",
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
