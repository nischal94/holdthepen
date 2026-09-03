"use client";

import { useState } from "react";
import { COPY } from "@/lib/claim/copy";
import { useRegistrationStatus } from "@/lib/react/claim-context";
import { StatusChip } from "./status-chip";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      // clipboard unavailable; the text is visible to copy by hand
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${COPY.kit.copy}: ${label}`}
      className="ml-2 min-h-11 rounded-md border border-neutral-500 px-3 text-sm hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    >
      {done ? COPY.kit.copied : COPY.kit.copy}
    </button>
  );
}

/**
 * Above-the-fold kit: status, the three activation steps, and copyable
 * prompts. Collapses to one line once the agent tools are live.
 */
export function JudgeKit() {
  const status = useRegistrationStatus();
  const live = status.state === "ready";
  return (
    <section
      aria-labelledby="kit-heading"
      className="rounded-md border border-neutral-300 bg-white/60 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="kit-heading" className="text-base font-semibold">
          {COPY.kit.heading}
        </h2>
        <StatusChip />
      </div>

      {!live && (
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-[15px]">
          <li>
            {COPY.kit.step1}
            <div className="mt-1 flex flex-wrap items-center">
              <code className="rounded-md bg-neutral-200 px-1.5 py-0.5 text-sm">
                {COPY.kit.flag}
              </code>
              <CopyButton
                text={COPY.kit.flag}
                label="the Chrome flag address"
              />
            </div>
          </li>
          <li>{COPY.kit.step2}</li>
          <li>{COPY.kit.step3}</li>
        </ol>
      )}

      <ul
        className="mt-4 space-y-2"
        aria-label="Example prompts for your agent"
      >
        {COPY.kit.prompts.map((p) => (
          <li key={p} className="flex flex-wrap items-center text-[15px]">
            <span className="rounded-md bg-neutral-100 px-2 py-1">“{p}”</span>
            <CopyButton text={p} label={`prompt: ${p.slice(0, 30)}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
