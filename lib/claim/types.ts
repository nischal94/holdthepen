/**
 * Claim domain types. Framework-independent: nothing in lib/claim imports
 * React. Tool callbacks read the store through getSnapshot(); React
 * subscribes through useSyncExternalStore.
 */

export type SectionId = "household" | "income" | "caring" | "declaration";
export type FieldId = string;
export type FieldKind = "text" | "number" | "date" | "select" | "boolean";
export type Provenance = "human" | "agent";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  id: FieldId;
  section: SectionId;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: FieldOption[];
  maxLength?: number;
  /** Only shown (and validated) when the named field equals the value. */
  dependsOn?: { field: FieldId; equals: string };
  explain: {
    meaning: string;
    term?: string;
    consequences: string;
  };
}

export interface SectionDef {
  id: SectionId;
  title: string;
  purpose: string;
}

export interface ClaimSchema {
  sections: SectionDef[];
  fields: FieldDef[];
}

export interface FieldRecord {
  id: FieldId;
  value: string;
  /** null until anyone writes the field. */
  provenance: Provenance | null;
  /** Meaningful only for agent-supplied values; human values are implicitly reviewed. */
  reviewed: boolean;
  /** Bumped on every write to this field. Agent writes are revision-checked. */
  revision: number;
  error: string | null;
}

export type ReviewState =
  | { status: "idle" }
  | { status: "staged"; reviewId: string; claimRevision: number }
  | { status: "invalidated"; reviewId: string; claimRevision: number }
  | { status: "approved"; reviewId: string; claimRevision: number; reference: string };

export interface ClaimState {
  fields: Record<FieldId, FieldRecord>;
  /** Bumped on every field mutation. Staged reviews are pinned to it. */
  revision: number;
  review: ReviewState;
  currentSection: SectionId;
  focusedField: FieldId | null;
}

/** The error contract every tool failure returns. */
export interface ToolError {
  code:
    | "UNKNOWN_FIELD"
    | "FIELD_HIDDEN"
    | "CONFLICT_HUMAN_VALUE"
    | "CONFLICT_FOCUSED"
    | "CONFLICT_REVISION"
    | "VALIDATION"
    | "EMPTY_FIELD"
    | "MISSING_REQUIRED"
    | "REVIEW_NOT_STAGED"
    | "REVIEW_INVALIDATED"
    | "UNREVIEWED_ENTRIES"
    | "NOT_CONFIRMED"
    | "ALREADY_APPROVED";
  problem: string;
  cause: string;
  fix: string;
  retryable: boolean;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: ToolError };

export interface StagedSummary {
  reviewId: string;
  claimRevision: number;
  entries: { id: FieldId; label: string; value: string; provenance: Provenance }[];
  commitments: string[];
}
