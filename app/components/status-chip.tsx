"use client";

import { COPY } from "@/lib/claim/copy";
import { useRegistrationStatus } from "@/lib/react/claim-context";

/** Live registration status. Text carries the meaning; colour is secondary. */
export function StatusChip() {
  const status = useRegistrationStatus();
  let text: string;
  let tone: "ok" | "warn" | "muted";
  switch (status.state) {
    case "ready":
      text = COPY.status.ready(status.registered.length);
      tone = "ok";
      break;
    case "degraded":
      text = COPY.status.degraded(
        status.registered.length,
        status.failed.length
      );
      tone = "warn";
      break;
    case "unsupported":
      text = COPY.status.unsupported;
      tone = "warn";
      break;
    default:
      text = COPY.status.registering;
      tone = "muted";
  }
  const cls =
    tone === "ok"
      ? "border-green-700 bg-green-50 text-green-900"
      : tone === "warn"
        ? "border-amber-700 bg-amber-50 text-amber-900"
        : "border-neutral-400 bg-neutral-100 text-neutral-700";
  return (
    <p
      role="status"
      aria-label="Agent tools status"
      data-state={status.state}
      className={`inline-block rounded-full border px-3 py-1 text-sm font-medium ${cls}`}
    >
      {tone === "ok" ? "● " : tone === "warn" ? "▲ " : "… "}
      {text}
      {status.state === "unsupported" && (
        <span className="sr-only"> {status.reason}</span>
      )}
    </p>
  );
}
