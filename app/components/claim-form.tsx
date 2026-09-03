"use client";

import { useEffect, useRef, useState } from "react";
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
import { Replay } from "./replay";
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

  // Move focus to the section heading when navigation happens (tool or
  // click), never on first render: the page must open at the top.
  const lastFocused = useRef(current);
  useEffect(() => {
    if (lastFocused.current === current) return;
    lastFocused.current = current;
    document.getElementById(`section-${current}`)?.focus();
  }, [current]);

  function go(id: SectionId) {
    store.navigate(id);
  }

  const idx = sections.findIndex((s) => s.id === current);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-36 lg:px-6 lg:pb-8">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <header className="mb-8">
        <p className="text-sm font-medium tracking-wide text-neutral-600">
          {COPY.productName}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
          {COPY.claimTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-neutral-800">
          {COPY.claimPurpose}
        </p>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          {COPY.storageNote}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-md border border-neutral-600 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
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
            className="min-h-11 rounded-md border border-neutral-600 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
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
        <ol
          aria-label="Who does what"
          className="mt-6 grid gap-px overflow-hidden rounded-md border border-neutral-300 bg-neutral-300 sm:grid-cols-3"
        >
          {COPY.split.map((s) => (
            <li
              key={s.does}
              className={`p-4 ${s.who === "You" ? "bg-green-50" : "bg-white"}`}
            >
              <p
                className={`text-xs font-semibold tracking-wide ${s.who === "You" ? "text-green-900" : "text-amber-900"}`}
              >
                {s.who}
              </p>
              <p className="mt-0.5 font-serif text-xl font-semibold">
                {s.does}
              </p>
              <p className="mt-1 text-sm text-neutral-700">{s.detail}</p>
            </li>
          ))}
        </ol>
      </header>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <JudgeKit />
        <Replay />
      </div>

      <nav
        aria-label="Claim sections"
        className="sticky top-0 z-10 mb-6 border-b border-neutral-300 bg-paper py-2"
      >
        <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          {sections.map((s, i) => (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(s.id)}
                aria-current={s.id === current ? "step" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-md py-1 pr-3 pl-1.5 text-sm font-medium whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  s.id === current
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-500 hover:bg-neutral-200"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                    s.id === current
                      ? "bg-white text-neutral-900"
                      : "bg-neutral-200 text-neutral-800"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="sr-only">{i + 1}. </span>
                {s.title}
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
                className="font-serif text-3xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
              >
                {sections[idx].title}
              </h2>
              <p className="mt-1 mb-5 text-base text-neutral-700">
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
                  className="min-h-11 rounded-md border border-neutral-600 px-4 text-sm disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => go(sections[idx + 1].id)}
                  className="min-h-11 rounded-md bg-blue-800 px-4 text-sm font-medium text-white hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Next: {sections[idx + 1].title}
                </button>
              </div>
            </section>
          )}
        </main>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ReviewQueue />
        </div>
      </div>
    </div>
  );
}
