"use client";

import { COPY, FIELD_STATE_LABEL } from "@/lib/claim/copy";
import type { FieldDef, FieldRecord } from "@/lib/claim/types";
import { useClaimContext } from "@/lib/react/claim-context";

export type FieldState =
  | "empty"
  | "human"
  | "agentUnreviewed"
  | "agentReviewed"
  | "corrected"
  | "invalid";

export function fieldState(rec: FieldRecord): FieldState {
  if (rec.value !== "" && rec.error) return "invalid";
  if (rec.provenance === "agent")
    return rec.reviewed ? "agentReviewed" : "agentUnreviewed";
  if (rec.provenance === "human") return rec.corrected ? "corrected" : "human";
  return "empty";
}

/**
 * One question. The state badge is text (exposed via aria-describedby), the
 * explanation is visible without an agent, and focus/blur tell the store so
 * an agent never writes into a field the person is editing.
 */
export function FieldControl({
  def,
  rec,
}: {
  def: FieldDef;
  rec: FieldRecord;
}) {
  const { store, announce } = useClaimContext();
  const state = fieldState(rec);
  const stateId = `${def.id}-state`;
  const explainId = `${def.id}-explain`;
  const errorId = `${def.id}-error`;
  const describedBy = [stateId, explainId, rec.error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  const badge =
    state === "invalid"
      ? `${FIELD_STATE_LABEL.invalid}`
      : FIELD_STATE_LABEL[state];
  const badgeTone =
    state === "agentUnreviewed"
      ? "border-amber-700 bg-amber-50 text-amber-900"
      : state === "invalid"
        ? "border-red-700 bg-red-50 text-red-900"
        : state === "empty"
          ? "border-neutral-400 bg-neutral-100 text-neutral-700"
          : "border-green-700 bg-green-50 text-green-900";

  const common = {
    id: def.id,
    name: def.id,
    "aria-describedby": describedBy,
    "aria-invalid": Boolean(rec.error && rec.value !== "") || undefined,
    onFocus: () => store.setFocus(def.id),
    onBlur: () => store.setFocus(null),
    className:
      "mt-1 block w-full rounded-md border border-neutral-500 bg-white px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700",
  };

  function set(value: string) {
    store.humanSet(def.id, value);
  }

  return (
    <div
      className="rounded-md border border-neutral-300 bg-white p-5"
      data-field={def.id}
      data-state={state}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label htmlFor={def.id} className="text-[17px] font-semibold">
          {def.label}
          {def.required && <span aria-hidden="true"> *</span>}
        </label>
        <span
          id={stateId}
          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeTone}`}
        >
          {badge}
        </span>
      </div>

      <p id={explainId} className="mt-1 text-sm text-neutral-600">
        {def.explain.meaning}
      </p>

      {def.kind === "select" ? (
        <select
          {...common}
          value={rec.value}
          onChange={(e) => set(e.target.value)}
        >
          <option value="">Choose…</option>
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : def.kind === "boolean" ? (
        <fieldset className="mt-1" aria-describedby={describedBy}>
          <legend className="sr-only">{def.label}</legend>
          {[
            ["true", "Yes"],
            ["false", "No"],
          ].map(([v, l]) => (
            <label
              key={v}
              className="mr-4 inline-flex min-h-11 items-center gap-2"
            >
              <input
                type="radio"
                name={def.id}
                value={v}
                checked={rec.value === v}
                onChange={() => set(v)}
                onFocus={() => store.setFocus(def.id)}
                onBlur={() => store.setFocus(null)}
                className="h-5 w-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              />
              {l}
            </label>
          ))}
        </fieldset>
      ) : (
        <input
          {...common}
          type={def.kind === "date" ? "date" : "text"}
          inputMode={def.kind === "number" ? "decimal" : undefined}
          value={rec.value}
          onChange={(e) => set(e.target.value)}
        />
      )}

      {rec.error && rec.value !== "" && (
        <p id={errorId} className="mt-1 text-sm text-red-800">
          {rec.error}
        </p>
      )}

      {state === "agentUnreviewed" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-md bg-green-800 px-4 text-sm font-medium text-white hover:bg-green-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            onClick={() => {
              store.acceptField(def.id);
              announce(COPY.announce.accepted(def.label));
            }}
          >
            {COPY.queue.accept}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md border border-neutral-600 px-4 text-sm font-medium hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            onClick={() => {
              store.clearField(def.id);
              announce(COPY.announce.cleared(def.label));
              document.getElementById(def.id)?.focus();
            }}
          >
            {COPY.queue.clear}
          </button>
        </div>
      )}
    </div>
  );
}
