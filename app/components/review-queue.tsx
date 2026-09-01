"use client";

import { COPY } from "@/lib/claim/copy";
import { useClaimContext, useClaimState } from "@/lib/react/claim-context";

/**
 * Persistent list of agent-supplied entries awaiting review. Every row can be
 * accepted, corrected (focus moves to the field), or cleared. Enumerable by
 * agents through review_agent_entries; actionable only here.
 */
export function ReviewQueue() {
  const { store, announce } = useClaimContext();
  const state = useClaimState();
  const pending = store.unreviewedIds();

  return (
    <aside
      aria-labelledby="queue-heading"
      className="rounded-lg border border-neutral-300 bg-white p-4"
    >
      <h2 id="queue-heading" className="text-base font-semibold">
        {COPY.queue.heading}
      </h2>
      <p className="mt-1 text-sm" aria-live="polite" aria-atomic="true">
        {pending.length === 0
          ? COPY.queue.empty
          : COPY.queue.count(pending.length)}
      </p>
      {pending.length > 0 && (
        <ul className="mt-3 space-y-3">
          {pending.map((id) => {
            const def = store.fieldDef(id);
            const rec = state.fields[id];
            if (!def) return null;
            return (
              <li
                key={id}
                className="rounded border border-amber-300 bg-amber-50 p-3"
              >
                <p className="text-sm font-medium">{def.label}</p>
                <p className="mt-0.5 break-words font-mono text-sm">
                  {rec.value}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded bg-green-800 px-3 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    onClick={() => {
                      store.acceptField(id);
                      announce(COPY.announce.accepted(def.label));
                    }}
                  >
                    {COPY.queue.accept}
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded border border-neutral-600 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    onClick={() => {
                      store.navigate(def.section);
                      requestAnimationFrame(() =>
                        document.getElementById(id)?.focus()
                      );
                    }}
                  >
                    {COPY.queue.correct}
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded border border-neutral-600 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    onClick={() => {
                      store.clearField(id);
                      announce(COPY.announce.cleared(def.label));
                    }}
                  >
                    {COPY.queue.clear}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
