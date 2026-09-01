"use client";

import { useEffect, useState } from "react";
import { COPY } from "@/lib/claim/copy";
import type { SectionId } from "@/lib/claim/types";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  useClaimContext,
  useClaimState,
} from "@/lib/react/claim-context";
import { Approval } from "./approval";
import { FieldControl } from "./field-control";
import { JudgeKit } from "./judge-kit";
import { ReviewQueue } from "./review-queue";

/** One document: sections render conditionally, the URL never changes. */
export function ClaimForm() {
  const { store, announcement, announce } = useClaimContext();
  const state = useClaimState();
  const [notice, setNotice] = useState("");
  const sections = store.schema.sections;
  const current = state.currentSection;

  // Opt-in draft restore: only if the person saved one earlier this session.
  useEffect(() => {
    loadDraft(store);
  }, [store]);

  // Move focus to the section heading when navigation happens (tool or click).
  useEffect(() => {
    document.getElementById(`section-${current}`)?.focus();
  }, [current]);

  function go(id: SectionId) {
    store.navigate(id);
  }

  const idx = sections.findIndex((s) => s.id === current);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <header className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-600">
          {COPY.productName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold">{COPY.claimTitle}</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-neutral-700">
          {COPY.claimPurpose}
        </p>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          {COPY.storageNote}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded border border-neutral-600 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            onClick={() => {
              setNotice(
                saveDraft(store)
                  ? COPY.actions.savedDraft
                  : "Could not save in this browser."
              );
              announce(COPY.actions.savedDraft);
            }}
          >
            {COPY.actions.saveDraft}
          </button>
          <button
            type="button"
            className="min-h-11 rounded border border-neutral-600 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            onClick={() => {
              clearDraft(store);
              setNotice(COPY.actions.clearedData);
              announce(COPY.actions.clearedData);
            }}
          >
            {COPY.actions.clearData}
          </button>
          <span className="self-center text-sm text-neutral-600" role="status">
            {notice}
          </span>
        </div>
      </header>

      <div className="mb-6">
        <JudgeKit />
      </div>

      <nav
        aria-label="Claim sections"
        className="sticky top-0 z-10 mb-6 border-b border-neutral-300 bg-[#f8f7f4] py-2"
      >
        <ol className="flex flex-wrap gap-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => go(s.id)}
                aria-current={s.id === current ? "step" : undefined}
                className={`min-h-11 rounded px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  s.id === current
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-500 hover:bg-neutral-200"
                }`}
              >
                {i + 1}. {s.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <main>
          {current === "declaration" ? (
            <Approval />
          ) : (
            <section aria-labelledby={`section-${current}`}>
              <h2
                id={`section-${current}`}
                tabIndex={-1}
                className="text-2xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
              >
                {sections[idx].title}
              </h2>
              <p className="mt-1 mb-4 text-[15px] text-neutral-700">
                {sections[idx].purpose}
              </p>
              <div className="space-y-4">
                {store.schema.fields
                  .filter((f) => f.section === current && store.isVisible(f.id))
                  .map((f) => (
                    <FieldControl key={f.id} def={f} rec={state.fields[f.id]} />
                  ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => go(sections[idx - 1].id)}
                  className="min-h-11 rounded border border-neutral-600 px-4 text-sm disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => go(sections[idx + 1].id)}
                  className="min-h-11 rounded bg-neutral-900 px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Next: {sections[idx + 1].title}
                </button>
              </div>
            </section>
          )}
        </main>
        <div className="lg:sticky lg:top-16 lg:self-start">
          <ReviewQueue />
        </div>
      </div>
    </div>
  );
}
