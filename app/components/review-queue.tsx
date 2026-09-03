"use client";

import { useState } from "react";
import { COPY } from "@/lib/claim/copy";
import { useClaimContext, useClaimState } from "@/lib/react/claim-context";

const ACTION_BUTTON =
  "min-h-11 rounded-md px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

/**
 * Persistent list of agent-supplied entries awaiting review. Every row can be
 * accepted, corrected (focus moves to the field), or cleared. Enumerable by
 * agents through review_agent_entries; actionable only here.
 *
 * One landmark, two shapes: a side rail from the `lg` breakpoint up, and a
 * bottom sheet below it. The sheet's bar always shows the live count; the
 * list opens on demand and closes when Correct moves focus into the form,
 * so the sheet never covers the field being corrected.
 */
export function ReviewQueue() {
  const { store, announce } = useClaimContext();
  const state = useClaimState();
  const [open, setOpen] = useState(false);
  const pending = store.unreviewedIds();

  return (
    <aside
      aria-labelledby="queue-heading"
      data-open={open}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-300 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:static lg:rounded-md lg:border lg:shadow-none"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:p-4">
        <div className="min-w-0">
          <h2 id="queue-heading" className="text-sm font-semibold lg:text-base">
            {COPY.queue.heading}
          </h2>
          <p className="mt-1 text-sm" aria-live="polite" aria-atomic="true">
            {pending.length === 0
              ? COPY.queue.empty
              : COPY.queue.count(pending.length)}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="queue-list"
          aria-label={open ? COPY.queue.hide : COPY.queue.show}
          onClick={() => setOpen((o) => !o)}
          className={`${ACTION_BUTTON} shrink-0 border border-neutral-600 lg:hidden`}
        >
          {open ? COPY.queue.hideShort : COPY.queue.showShort}
        </button>
      </div>
      <div
        id="queue-list"
        className={`${open ? "block" : "hidden"} max-h-[60vh] overflow-y-auto px-4 pb-4 lg:block lg:max-h-none lg:overflow-visible lg:pt-0`}
      >
        {pending.length > 0 && (
          <ul className="space-y-3">
            {pending.map((id) => {
              const def = store.fieldDef(id);
              const rec = state.fields[id];
              if (!def) return null;
              return (
                <li
                  key={id}
                  className="rounded-md border border-amber-300 bg-amber-50 p-3"
                >
                  <p className="flex items-start gap-2 text-sm font-medium">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700"
                    />
                    {def.label}
                  </p>
                  <p className="mt-1 ml-3.5 break-words font-mono text-sm">
                    {rec.value}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`${ACTION_BUTTON} bg-green-800 text-white`}
                      onClick={() => {
                        store.acceptField(id);
                        announce(COPY.announce.accepted(def.label));
                      }}
                    >
                      {COPY.queue.accept}
                    </button>
                    <button
                      type="button"
                      className={`${ACTION_BUTTON} border border-neutral-600`}
                      onClick={() => {
                        setOpen(false);
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
                      className={`${ACTION_BUTTON} border border-neutral-600`}
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
      </div>
    </aside>
  );
}
