/**
 * Binds the seven claim tools to a claim store.
 *
 * Every execute() reads the store at call time through getSnapshot(); the
 * definitions are created once and registered once, so a closure over React
 * state would be frozen at mount. Every failure returns the error envelope
 * {code, problem, cause, fix, retryable} so the agent can self-correct.
 * Every output is capped at BUDGET.output characters.
 */
import type { ClaimStore } from "../claim/store";
import type { Result, SectionId, ToolError } from "../claim/types";
import { BUDGET, CLAIM_TOOL_NAMES, TOOL_SCHEMAS } from "./tool-schemas";

type Input = Record<string, unknown>;

export function capOutput(text: string, cap = BUDGET.output): string {
  if (text.length <= cap) return text;
  const marker = " …[truncated]";
  return text.slice(0, cap - marker.length) + marker;
}

function ok(value: unknown): string {
  return capOutput(JSON.stringify({ ok: true, ...(value as object) }));
}

function fail(error: ToolError): string {
  return capOutput(JSON.stringify({ ok: false, error }));
}

function fromResult<T>(r: Result<T>, shape: (v: T) => object): string {
  return r.ok ? ok(shape(r.value)) : fail(r.error);
}

function str(input: Input, key: string): string {
  const v = input[key];
  return v === undefined || v === null ? "" : String(v);
}

/** Cap a list at n entries, appending a count of what was left out. */
function capList<T>(items: T[], n: number): { items: T[]; more: number } {
  return { items: items.slice(0, n), more: Math.max(0, items.length - n) };
}

export function createClaimTools(store: ClaimStore): WebMcpToolDefinition[] {
  const schema = store.schema;

  const executors: Record<
    (typeof CLAIM_TOOL_NAMES)[number],
    (input: Input) => unknown
  > = {
    get_claim_state: () => {
      const s = store.getSnapshot();
      const visible = schema.fields.filter((f) => store.isVisible(f.id));
      const empty = visible
        .filter((f) => s.fields[f.id].value === "")
        .map((f) => f.id);
      const invalid = visible
        .filter((f) => s.fields[f.id].error && s.fields[f.id].value !== "")
        .map((f) => f.id);
      const unreviewed = store.unreviewedIds();
      const missing = store.missingRequiredIds();
      const review = s.review.status;

      let next: string[];
      if (review === "approved") next = [];
      else if (unreviewed.length > 0) next = ["review_agent_entries"];
      else if (missing.length > 0) next = ["explain", "fill_field"];
      else if (review === "staged") next = [];
      else next = ["prepare_submission_review"];

      return ok({
        current_section: s.currentSection,
        sections: schema.sections.map((sec) => ({
          id: sec.id,
          title: sec.title,
          fields: visible.filter((f) => f.section === sec.id).map((f) => f.id),
        })),
        empty_fields: empty,
        invalid_fields: invalid,
        agent_filled_unreviewed: unreviewed,
        missing_required: missing,
        review_stage: review,
        next_suggested_tools: next,
        note:
          review === "staged"
            ? "A review is staged. Only the person can approve it, in the page."
            : undefined,
      });
    },

    explain: (input) => {
      const id = str(input, "question_id");
      const def = store.fieldDef(id);
      if (!def) {
        return fail({
          code: "UNKNOWN_FIELD",
          problem: `No question with id "${id}".`,
          cause: "The id is not part of this claim.",
          fix: `Use one of: ${schema.fields.map((f) => f.id).join(", ")}.`,
          retryable: true,
        });
      }
      const intent = str(input, "intent");
      const all = {
        meaning: def.explain.meaning,
        term: def.explain.term ?? "This question uses no special term.",
        consequences: def.explain.consequences,
      };
      if (intent && intent in all) {
        return ok({
          question_id: id,
          label: def.label,
          [intent]: all[intent as keyof typeof all],
        });
      }
      return ok({ question_id: id, label: def.label, ...all });
    },

    review_agent_entries: () => {
      const s = store.getSnapshot();
      const entries = schema.fields
        .map((f) => ({ def: f, rec: s.fields[f.id] }))
        .filter(({ rec }) => rec.provenance === "agent")
        .map(({ def, rec }) => ({
          field_id: def.id,
          label: def.label,
          value: rec.value,
          status: rec.reviewed ? "reviewed" : "needs review",
        }));
      const { items, more } = capList(entries, 12);
      return ok({
        count: entries.length,
        entries: items,
        ...(more > 0 ? { and_more: more } : {}),
        note: "The person accepts or corrects each entry in the review queue on the page. There is no tool for that.",
      });
    },

    fill_field: (input) =>
      fromResult(
        store.agentFill(str(input, "field_id"), str(input, "value")),
        (rec) => ({
          field_id: rec.id,
          value: rec.value,
          status: "filled by agent, needs the person's review",
          revision: rec.revision,
        })
      ),

    clear_field: (input) =>
      fromResult(store.clearField(str(input, "field_id")), (rec) => ({
        field_id: rec.id,
        status: "cleared",
      })),

    navigate_to_section: (input) => {
      const section = str(input, "section") as SectionId;
      const known = schema.sections.find((s) => s.id === section);
      if (!known) {
        return fail({
          code: "UNKNOWN_FIELD",
          problem: `No section "${section}".`,
          cause: "The section id is not part of this claim.",
          fix: `Use one of: ${schema.sections.map((s) => s.id).join(", ")}.`,
          retryable: true,
        });
      }
      store.navigate(section);
      return ok({ current_section: section, title: known.title });
    },

    prepare_submission_review: () =>
      fromResult(store.stageReview(), (summary) => {
        const { items, more } = capList(summary.entries, 12);
        return {
          submitted: false,
          review_id: summary.reviewId,
          entries: items,
          ...(more > 0 ? { and_more: more } : {}),
          the_person_declares: summary.commitments,
          next: "The person reads this on the page and approves or corrects. Call get_claim_state later to see what they decided.",
        };
      }),
  };

  return CLAIM_TOOL_NAMES.map((name) => {
    const s = TOOL_SCHEMAS[name];
    return {
      name,
      description: s.description,
      inputSchema: s.inputSchema,
      annotations: {
        readOnlyHint: s.readOnly,
        untrustedContentHint: s.untrustedContent,
      },
      execute: async (input: Input) => executors[name](input ?? {}),
    };
  });
}
