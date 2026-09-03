"use client";

import { useState } from "react";
import { COPY, FIELD_STATE_LABEL } from "@/lib/claim/copy";
import { COMMITMENTS } from "@/lib/claim/schema";
import { useClaimContext, useClaimState } from "@/lib/react/claim-context";
import { fieldState } from "./field-control";

/**
 * The one place a claim can be submitted. Submit is disabled until a review
 * is staged for the current answers, every agent entry is reviewed, and the
 * declaration is ticked. The reason it is disabled is written out.
 */
export function Approval() {
  const { store } = useClaimContext();
  const state = useClaimState();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreviewed = store.unreviewedIds();
  const missing = store.missingRequiredIds();
  const staged =
    state.review.status === "staged" &&
    state.review.claimRevision === state.revision;

  if (state.review.status === "approved") {
    return (
      <section
        aria-labelledby="section-declaration"
        className="rounded-md border border-green-700 bg-green-50 p-6"
      >
        <h2
          id="section-declaration"
          tabIndex={-1}
          className="font-serif text-3xl font-semibold text-green-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
        >
          {COPY.approval.done}
        </h2>
        <p className="mt-2">
          {COPY.approval.reference}:{" "}
          <span className="font-mono text-lg">{state.review.reference}</span>
        </p>
        <p className="mt-2 text-sm text-neutral-700">
          This is a demonstration. Nothing was sent anywhere.
        </p>
      </section>
    );
  }

  const blockedReason = !staged
    ? COPY.approval.blockedStage
    : unreviewed.length > 0
      ? COPY.approval.blockedUnreviewed(unreviewed.length)
      : !confirmed
        ? COPY.approval.blockedDeclaration
        : null;

  return (
    <section aria-labelledby="section-declaration" className="space-y-4">
      <h2
        id="section-declaration"
        tabIndex={-1}
        className="font-serif text-3xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
      >
        {COPY.approval.heading}
      </h2>
      <p className="text-[15px] text-neutral-700">{COPY.approval.intro}</p>

      {missing.length > 0 ? (
        <p
          className="rounded-md border border-amber-700 bg-amber-50 p-3 text-sm"
          role="status"
        >
          Required questions still need an answer:{" "}
          {missing.map((id) => store.fieldDef(id)?.label ?? id).join("; ")}.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => {
            const r = store.stageReview();
            setError(r.ok ? null : r.error.problem);
          }}
          className="min-h-11 rounded-md border border-neutral-700 px-4 text-sm font-medium hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {state.review.status === "invalidated"
            ? COPY.approval.reprepare
            : COPY.approval.prepare}
        </button>
      )}
      {error && (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <table className="w-full border-collapse text-left text-[15px]">
        <caption className="sr-only">Your answers and who entered them</caption>
        <thead>
          <tr className="border-b border-neutral-300 text-sm text-neutral-600">
            <th className="py-2 pr-3 font-medium">Question</th>
            <th className="py-2 pr-3 font-medium">Answer</th>
            <th className="py-2 font-medium">Entered by</th>
          </tr>
        </thead>
        <tbody>
          {store.schema.fields
            .filter(
              (f) => store.isVisible(f.id) && state.fields[f.id].value !== ""
            )
            .map((f) => {
              const rec = state.fields[f.id];
              const s = fieldState(rec);
              return (
                <tr
                  key={f.id}
                  className="border-b border-neutral-200 align-top"
                >
                  <td className="py-2 pr-3">{f.label}</td>
                  <td className="py-2 pr-3 font-mono text-sm">{rec.value}</td>
                  <td className="py-2 text-sm">{FIELD_STATE_LABEL[s]}</td>
                </tr>
              );
            })}
        </tbody>
      </table>

      <ul
        className="list-disc space-y-1 pl-5 text-[15px]"
        aria-label="What you are declaring"
      >
        {COMMITMENTS.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <label className="flex min-h-11 items-start gap-3 text-[15px]">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        {COPY.approval.declaration}
      </label>

      <div>
        <button
          type="button"
          disabled={blockedReason !== null}
          aria-describedby="submit-why"
          onClick={() => {
            const r = store.approve({ confirmed });
            setError(r.ok ? null : r.error.problem);
          }}
          className="min-h-11 rounded-md bg-blue-800 px-5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {COPY.approval.submit}
        </button>
        <p
          id="submit-why"
          className="mt-2 text-sm text-neutral-700"
          aria-live="polite"
        >
          {blockedReason ?? ""}
        </p>
      </div>
    </section>
  );
}
