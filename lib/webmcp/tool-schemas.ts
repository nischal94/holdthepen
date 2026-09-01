/**
 * Single source of truth for tool names and input schemas. The registration
 * manager registers from here; the eval validator checks fixtures against it.
 * Budgets: name ≤30 chars, description ≤500, param description ≤150,
 * output ≤1500 (see BUDGET).
 *
 * Descriptions state what the tool can do, in positive language, and tools
 * 2–7 end by pointing at the entry point so a cold agent knows where to start.
 */
export interface ToolSchema {
  description: string;
  readOnly: boolean;
  /** Set when the output echoes user- or agent-supplied text. */
  untrustedContent: boolean;
  inputSchema: {
    type: "object";
    properties?: Record<
      string,
      { type: string; description?: string; enum?: string[] }
    >;
    required?: string[];
  };
}

const ENTRY = " Call get_claim_state first.";

export const TOOL_SCHEMAS: Record<string, ToolSchema> = {
  get_claim_state: {
    description:
      "Entry point. Returns the claim's sections, the current section, which fields are empty, invalid, or filled by an agent but not yet reviewed by the person, the review stage, and next_suggested_tools. Read-only; safe to call any time.",
    readOnly: true,
    untrustedContent: true,
    inputSchema: { type: "object", properties: {} },
  },
  explain: {
    description:
      "Explains one question in plain language: what it actually asks (meaning), a confusing term it uses (term), or how each truthful answer affects the claim (consequences). Never recommends an answer." +
      ENTRY,
    readOnly: true,
    untrustedContent: false,
    inputSchema: {
      type: "object",
      properties: {
        question_id: {
          type: "string",
          description: "The field id, as listed by get_claim_state.",
        },
        intent: {
          type: "string",
          enum: ["meaning", "term", "consequences"],
          description: "Which explanation to return. Omit for all three.",
        },
      },
      required: ["question_id"],
    },
  },
  review_agent_entries: {
    description:
      "Lists every value an agent has written into the form, with its review status, so the person or the agent can see exactly what was filled on their behalf. Read-only." +
      ENTRY,
    readOnly: true,
    untrustedContent: true,
    inputSchema: { type: "object", properties: {} },
  },
  fill_field: {
    description:
      "Writes one value into one field on the person's behalf. The value is marked as agent-supplied and must be reviewed by the person before the claim can be submitted. Refuses to overwrite a value the person typed or a field they are editing." +
      ENTRY,
    readOnly: false,
    untrustedContent: true,
    inputSchema: {
      type: "object",
      properties: {
        field_id: {
          type: "string",
          description: "The field id, as listed by get_claim_state.",
        },
        value: {
          type: "string",
          description:
            "The value as the person said it. Numbers as digits; dates as YYYY-MM-DD; yes/no as true/false.",
        },
      },
      required: ["field_id", "value"],
    },
  },
  clear_field: {
    description:
      "Empties one field, undoing a value that was filled by an agent or the person. Use when a value was wrong and should be re-entered." +
      ENTRY,
    readOnly: false,
    untrustedContent: false,
    inputSchema: {
      type: "object",
      properties: {
        field_id: {
          type: "string",
          description: "The field id to clear.",
        },
      },
      required: ["field_id"],
    },
  },
  navigate_to_section: {
    description:
      "Moves the visible form and keyboard focus to a section so the person can see the questions being discussed. Changes nothing in the claim." +
      ENTRY,
    readOnly: false,
    untrustedContent: false,
    inputSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: ["household", "income", "caring", "declaration"],
          description: "The section to show.",
        },
      },
      required: ["section"],
    },
  },
  prepare_submission_review: {
    description:
      "Does NOT submit. Stages a review of the completed claim so the person can read every answer and what they are declaring, then decide. Returns the staged summary, or the required fields still missing. Only the person can approve, in the page." +
      ENTRY,
    readOnly: false,
    untrustedContent: true,
    inputSchema: { type: "object", properties: {} },
  },
};

export const CLAIM_TOOL_NAMES = [
  "get_claim_state",
  "explain",
  "review_agent_entries",
  "fill_field",
  "clear_field",
  "navigate_to_section",
  "prepare_submission_review",
] as const;

export const NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
export const BUDGET = {
  name: 30,
  description: 500,
  paramDescription: 150,
  output: 1500,
};
