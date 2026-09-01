import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hold the Pen",
  description:
    "An agent can fill the form. You hold the pen. A WebMCP-powered benefits claim where every agent entry is reviewed by you.",
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
