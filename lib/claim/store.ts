import { COMMITMENTS } from "./schema";
import type {
  ClaimSchema,
  ClaimState,
  FieldDef,
  FieldId,
  FieldRecord,
  Result,
  SectionId,
  StagedSummary,
  ToolError,
} from "./types";
import { sanitize, validateField } from "./validate";

/**
 * The claim store. Plain TypeScript, no React.
 *
 * WebMCP tool callbacks are registered once and never re-registered, so they
 * must read state through getSnapshot() at call time — never through a
 * closure over React state, which would be frozen at mount. React renders
 * via useSyncExternalStore(subscribe, getSnapshot).
 */
export interface ClaimStore {
  getSnapshot(): ClaimState;
  subscribe(listener: () => void): () => void;
  schema: ClaimSchema;

  /** Is the field currently shown, given its dependsOn rule? */
  isVisible(id: FieldId): boolean;
  fieldDef(id: FieldId): FieldDef | undefined;

  /** Human typing. Always accepted; provenance flips to human. */
  humanSet(id: FieldId, value: string): void;
  /** Agent write. Conflict-checked, revision-checked, validated. */
  agentFill(
    id: FieldId,
    value: string,
    expectedRevision?: number
  ): Result<FieldRecord>;
  clearField(id: FieldId): Result<FieldRecord>;
  /** Human accepts an agent-supplied value. Provenance stays agent; reviewed becomes true. */
  acceptField(id: FieldId): Result<FieldRecord>;
  setFocus(id: FieldId | null): void;
  navigate(section: SectionId): void;

  stageReview(): Result<StagedSummary>;
  approve(input: { confirmed: boolean }): Result<{ reference: string }>;

  unreviewedIds(): FieldId[];
  missingRequiredIds(): FieldId[];

  hydrate(state: ClaimState): void;
  reset(): void;
}

function emptyRecord(id: FieldId): FieldRecord {
  return {
    id,
    value: "",
    provenance: null,
    reviewed: false,
    corrected: false,
    revision: 0,
    error: null,
  };
}

function initialState(schema: ClaimSchema): ClaimState {
  return {
    fields: Object.fromEntries(
      schema.fields.map((f) => [f.id, emptyRecord(f.id)])
    ),
    revision: 0,
    review: { status: "idle" },
    currentSection: schema.sections[0].id,
    focusedField: null,
  };
}

function err(error: ToolError): Result<never> {
  return { ok: false, error };
}

let reviewCounter = 0;
function nextReviewId(): string {
  reviewCounter += 1;
  return `rev-${Date.now().toString(36)}-${reviewCounter}`;
}

export function createClaimStore(schema: ClaimSchema): ClaimStore {
  let state: ClaimState = initialState(schema);
  const listeners = new Set<() => void>();
  const defs = new Map(schema.fields.map((f) => [f.id, f]));

  function emit() {
    for (const l of listeners) l();
  }

  /** Apply a field mutation: bump field + claim revision, invalidate any staged review. */
  function commitField(next: FieldRecord) {
    const review =
      state.review.status === "staged"
        ? { ...state.review, status: "invalidated" as const }
        : state.review;
    state = {
      ...state,
      fields: { ...state.fields, [next.id]: next },
      revision: state.revision + 1,
      review,
    };
    emit();
  }

  function isVisible(id: FieldId): boolean {
    const def = defs.get(id);
    if (!def) return false;
    if (!def.dependsOn) return true;
    return state.fields[def.dependsOn.field]?.value === def.dependsOn.equals;
  }

  function unknown(id: FieldId): Result<never> {
    return err({
      code: "UNKNOWN_FIELD",
      problem: `No field named "${id}".`,
      cause: "The field id is not part of this claim.",
      fix: `Use one of: ${schema.fields.map((f) => f.id).join(", ")}.`,
      retryable: true,
    });
  }

  const store: ClaimStore = {
    schema,
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isVisible,
    fieldDef: (id) => defs.get(id),

    humanSet(id, value) {
      const def = defs.get(id);
      if (!def) return;
      const cur = state.fields[id];
      const clean = sanitize(def, value, false);
      commitField({
        ...cur,
        value: clean,
        provenance: "human",
        reviewed: true,
        corrected: cur.corrected || cur.provenance === "agent",
        revision: cur.revision + 1,
        error: validateField(def, clean),
      });
    },

    agentFill(id, value, expectedRevision) {
      const def = defs.get(id);
      if (!def) return unknown(id);
      if (!isVisible(id)) {
        return err({
          code: "FIELD_HIDDEN",
          problem: `"${id}" is not shown for this claim yet.`,
          cause: `It depends on "${def.dependsOn?.field}" being "${def.dependsOn?.equals}".`,
          fix: `Fill "${def.dependsOn?.field}" first, or skip this field.`,
          retryable: true,
        });
      }
      const cur = state.fields[id];
      if (state.focusedField === id) {
        return err({
          code: "CONFLICT_FOCUSED",
          problem: `The person is editing "${id}" right now.`,
          cause: "Writing while they type would overwrite their keystrokes.",
          fix: "Wait, then call get_claim_state to see what they entered.",
          retryable: true,
        });
      }
      if (cur.provenance === "human" && cur.value !== "") {
        return err({
          code: "CONFLICT_HUMAN_VALUE",
          problem: `"${id}" was answered by the person and will not be overwritten.`,
          cause: `Current value: "${cur.value}".`,
          fix: "Ask the person to change it themselves, or leave it.",
          retryable: false,
        });
      }
      if (expectedRevision !== undefined && expectedRevision !== cur.revision) {
        return err({
          code: "CONFLICT_REVISION",
          problem: `"${id}" changed since you last read it.`,
          cause: `Expected revision ${expectedRevision}, current is ${cur.revision}.`,
          fix: "Call get_claim_state and decide again with the current value.",
          retryable: true,
        });
      }
      const clean = sanitize(def, value);
      const problem = validateField(def, clean);
      if (problem) {
        return err({
          code: "VALIDATION",
          problem,
          cause: `Received "${clean}".`,
          fix: def.options
            ? `Use one of: ${def.options.map((o) => o.value).join(", ")}.`
            : "Send a value in the format described in the problem.",
          retryable: true,
        });
      }
      if (cur.provenance === "agent" && cur.value === clean) {
        return { ok: true, value: cur }; // idempotent: no revision bump, no re-review
      }
      const next: FieldRecord = {
        ...cur,
        value: clean,
        provenance: "agent",
        reviewed: false,
        revision: cur.revision + 1,
        error: null,
      };
      commitField(next);
      return { ok: true, value: next };
    },

    clearField(id) {
      const def = defs.get(id);
      if (!def) return unknown(id);
      const cur = state.fields[id];
      if (cur.value === "" && cur.provenance === null) {
        return err({
          code: "EMPTY_FIELD",
          problem: `"${id}" is already empty.`,
          cause: "Nothing has been written to it.",
          fix: "No action needed.",
          retryable: false,
        });
      }
      const next = { ...emptyRecord(id), revision: cur.revision + 1 };
      commitField(next);
      return { ok: true, value: next };
    },

    acceptField(id) {
      const def = defs.get(id);
      if (!def) return unknown(id);
      const cur = state.fields[id];
      if (cur.provenance !== "agent") {
        return err({
          code: "EMPTY_FIELD",
          problem: `"${id}" has no agent-supplied value to accept.`,
          cause: `Provenance is ${cur.provenance ?? "none"}.`,
          fix: "Only agent-filled fields need review.",
          retryable: false,
        });
      }
      const next = { ...cur, reviewed: true, revision: cur.revision + 1 };
      commitField(next);
      return { ok: true, value: next };
    },

    setFocus(id) {
      if (state.focusedField === id) return;
      state = { ...state, focusedField: id };
      emit();
    },

    navigate(section) {
      if (state.currentSection === section) return;
      // Navigation is not a claim mutation: it never invalidates a staged review.
      state = { ...state, currentSection: section };
      emit();
    },

    unreviewedIds() {
      return schema.fields
        .map((f) => state.fields[f.id])
        .filter((r) => r.provenance === "agent" && !r.reviewed)
        .map((r) => r.id);
    },

    missingRequiredIds() {
      return schema.fields
        .filter((f) => f.required && isVisible(f.id))
        .filter(
          (f) => state.fields[f.id].value === "" || state.fields[f.id].error
        )
        .map((f) => f.id);
    },

    stageReview() {
      if (state.review.status === "approved") {
        return err({
          code: "ALREADY_APPROVED",
          problem: "This claim has already been approved and submitted.",
          cause: `Reference ${state.review.reference}.`,
          fix: "Start a new claim if needed.",
          retryable: false,
        });
      }
      const missing = store.missingRequiredIds();
      if (missing.length > 0) {
        return err({
          code: "MISSING_REQUIRED",
          problem: `${missing.length} required field(s) are missing or invalid: ${missing.join(", ")}.`,
          cause:
            "Every required visible field must hold a valid value before review.",
          fix: `Fill these in form order: ${missing.join(", ")}.`,
          retryable: true,
        });
      }
      // Idempotent per claim revision: re-staging the same revision reuses the stage.
      if (
        state.review.status === "staged" &&
        state.review.claimRevision === state.revision
      ) {
        return { ok: true, value: summary(state.review.reviewId) };
      }
      const reviewId = nextReviewId();
      state = {
        ...state,
        review: { status: "staged", reviewId, claimRevision: state.revision },
      };
      emit();
      return { ok: true, value: summary(reviewId) };
    },

    approve({ confirmed }) {
      const review = state.review;
      if (review.status === "approved") {
        return err({
          code: "ALREADY_APPROVED",
          problem: "Already approved.",
          cause: `Reference ${review.reference}.`,
          fix: "Nothing to do.",
          retryable: false,
        });
      }
      if (review.status === "idle") {
        return err({
          code: "REVIEW_NOT_STAGED",
          problem: "No review has been staged.",
          cause:
            "Approval requires a staged review of the exact answers being sent.",
          fix: "Stage a review first.",
          retryable: true,
        });
      }
      if (
        review.status === "invalidated" ||
        review.claimRevision !== state.revision
      ) {
        return err({
          code: "REVIEW_INVALIDATED",
          problem: "The claim changed after the review was staged.",
          cause: `Staged at revision ${review.claimRevision}, claim is now at ${state.revision}.`,
          fix: "Re-stage the review so the person sees the current answers.",
          retryable: true,
        });
      }
      const unreviewed = store.unreviewedIds();
      if (unreviewed.length > 0) {
        return err({
          code: "UNREVIEWED_ENTRIES",
          problem: `${unreviewed.length} agent-filled field(s) have not been reviewed: ${unreviewed.join(", ")}.`,
          cause:
            "Every agent-supplied value must be accepted or corrected by the person.",
          fix: "The person reviews them in the review queue; there is no tool for this.",
          retryable: true,
        });
      }
      if (!confirmed) {
        return err({
          code: "NOT_CONFIRMED",
          problem: "The declaration checkbox is not ticked.",
          cause: "Submission requires the person's explicit confirmation.",
          fix: "The person ticks the declaration; there is no tool for this.",
          retryable: true,
        });
      }
      const reference = `WC-${state.revision.toString().padStart(4, "0")}-${review.reviewId.slice(-4).toUpperCase()}`;
      state = {
        ...state,
        review: { ...review, status: "approved", reference },
      };
      emit();
      return { ok: true, value: { reference } };
    },

    hydrate(next) {
      // Trust the shape; re-run validation so a stale error never survives a reload.
      const fields: Record<FieldId, FieldRecord> = {};
      for (const f of schema.fields) {
        const r = next.fields[f.id] ?? emptyRecord(f.id);
        fields[f.id] = { ...r, error: validateField(f, r.value) };
      }
      state = { ...next, fields };
      emit();
    },

    reset() {
      state = initialState(schema);
      emit();
    },
  };

  function summary(reviewId: string): StagedSummary {
    return {
      reviewId,
      claimRevision: state.revision,
      entries: schema.fields
        .filter((f) => isVisible(f.id) && state.fields[f.id].value !== "")
        .map((f) => ({
          id: f.id,
          label: f.label,
          value: state.fields[f.id].value,
          provenance: state.fields[f.id].provenance ?? "human",
        })),
      commitments: COMMITMENTS,
    };
  }

  return store;
}
