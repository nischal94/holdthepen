import { beforeEach, describe, expect, it } from "vitest";
import { CLAIM_SCHEMA } from "../claim/schema";
import { createClaimStore, type ClaimStore } from "../claim/store";
import { BUDGET, CLAIM_TOOL_NAMES } from "./tool-schemas";
import { capOutput, createClaimTools } from "./tools";

let store: ClaimStore;
let tools: Record<string, WebMcpToolDefinition>;

async function call(name: string, input: Record<string, unknown> = {}) {
  const raw = await tools[name].execute(input);
  return JSON.parse(String(raw));
}

beforeEach(() => {
  store = createClaimStore(CLAIM_SCHEMA);
  tools = Object.fromEntries(createClaimTools(store).map((t) => [t.name, t]));
});

describe("tool surface", () => {
  it("exposes exactly the seven claim tools, no commit tool", () => {
    expect(Object.keys(tools).sort()).toEqual([...CLAIM_TOOL_NAMES].sort());
    expect(
      Object.keys(tools).some(
        (n) =>
          /submit|approve|commit/.test(n) && n !== "prepare_submission_review"
      )
    ).toBe(false);
  });

  it("marks read-only and untrusted-content annotations per tool", () => {
    expect(tools.get_claim_state.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: true,
    });
    expect(tools.fill_field.annotations).toEqual({
      readOnlyHint: false,
      untrustedContentHint: true,
    });
    expect(tools.explain.annotations?.readOnlyHint).toBe(true);
  });
});

describe("get_claim_state (entry point)", () => {
  it("reads live state, never a stale snapshot (row 1 through the tool)", async () => {
    const before = await call("get_claim_state");
    expect(before.empty_fields).toContain("full_name");
    for (let i = 0; i < 10; i++) store.humanSet("household_size", String(i));
    store.humanSet("full_name", "Ada");
    const after = await call("get_claim_state");
    expect(after.empty_fields).not.toContain("full_name");
  });

  it("suggests review first when agent entries are unreviewed", async () => {
    store.agentFill("household_size", "2");
    const s = await call("get_claim_state");
    expect(s.agent_filled_unreviewed).toEqual(["household_size"]);
    expect(s.next_suggested_tools).toEqual(["review_agent_entries"]);
  });

  it("hides dependent fields from the section listing until their condition holds", async () => {
    const s1 = await call("get_claim_state");
    expect(
      s1.sections.find((x: { id: string }) => x.id === "caring").fields
    ).not.toContain("carer_hours");
    store.humanSet("is_carer", "true");
    const s2 = await call("get_claim_state");
    expect(
      s2.sections.find((x: { id: string }) => x.id === "caring").fields
    ).toContain("carer_hours");
  });
});

describe("explain", () => {
  it("returns all three explanations by default and one on request", async () => {
    const all = await call("explain", {
      question_id: "income_received_last_month",
    });
    expect(all.meaning).toMatch(/actually arrived/);
    expect(all.consequences).toMatch(/lower than what you earned/);
    const one = await call("explain", {
      question_id: "income_received_last_month",
      intent: "term",
    });
    expect(one.term).toMatch(/Received means/);
    expect(one.meaning).toBeUndefined();
  });

  it("never changes state", async () => {
    const rev = store.getSnapshot().revision;
    await call("explain", { question_id: "full_name" });
    expect(store.getSnapshot().revision).toBe(rev);
  });

  it("returns the error envelope with valid ids for an unknown question", async () => {
    const r = await call("explain", { question_id: "nope" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatchObject({ code: "UNKNOWN_FIELD", retryable: true });
    expect(r.error.fix).toContain("full_name");
    for (const k of ["code", "problem", "cause", "fix", "retryable"])
      expect(r.error).toHaveProperty(k);
  });
});

describe("fill_field / clear_field", () => {
  it("fills, reports needs-review, and refuses a human-owned field with the envelope", async () => {
    const f = await call("fill_field", {
      field_id: "household_size",
      value: "2",
    });
    expect(f).toMatchObject({
      ok: true,
      field_id: "household_size",
      value: "2",
    });
    store.humanSet("full_name", "Ada");
    const c = await call("fill_field", { field_id: "full_name", value: "Bob" });
    expect(c.ok).toBe(false);
    expect(c.error.code).toBe("CONFLICT_HUMAN_VALUE");
    expect(store.getSnapshot().fields.full_name.value).toBe("Ada");
  });

  it("validation failure names the accepted values so the agent can retry", async () => {
    const r = await call("fill_field", {
      field_id: "employment_status",
      value: "jobless",
    });
    expect(r.error.code).toBe("VALIDATION");
    expect(r.error.fix).toContain("not_working");
  });

  it("clear_field undoes an agent value", async () => {
    await call("fill_field", { field_id: "household_size", value: "2" });
    const r = await call("clear_field", { field_id: "household_size" });
    expect(r).toMatchObject({ ok: true, status: "cleared" });
  });
});

describe("review_agent_entries and prepare_submission_review", () => {
  it("lists agent entries with review status and points to the page for accepting", async () => {
    await call("fill_field", { field_id: "household_size", value: "2" });
    const r = await call("review_agent_entries");
    expect(r.count).toBe(1);
    expect(r.entries[0]).toMatchObject({
      field_id: "household_size",
      status: "needs review",
    });
    expect(r.note).toMatch(/no tool/);
  });

  it("prepare_submission_review never submits and reports missing fields in form order", async () => {
    const r = await call("prepare_submission_review");
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe("MISSING_REQUIRED");
    expect(r.error.fix).toMatch(/full_name, date_of_birth/);
  });

  it("stages when complete, returns submitted:false and the declarations", async () => {
    for (const [id, v] of Object.entries({
      full_name: "Ada",
      date_of_birth: "1990-01-01",
      household_size: "1",
      employment_status: "employed",
      income_received_last_month: "100",
      has_disability: "false",
      is_carer: "false",
    }))
      store.humanSet(id, v);
    const r = await call("prepare_submission_review");
    expect(r.ok).toBe(true);
    expect(r.submitted).toBe(false);
    expect(r.the_person_declares.length).toBeGreaterThan(0);
    expect(store.getSnapshot().review.status).toBe("staged");
  });
});

describe("navigate_to_section", () => {
  it("moves the section and rejects unknown ones", async () => {
    const ok = await call("navigate_to_section", { section: "income" });
    expect(ok).toMatchObject({ ok: true, current_section: "income" });
    expect(store.getSnapshot().currentSection).toBe("income");
    const bad = await call("navigate_to_section", { section: "pets" });
    expect(bad.error.fix).toContain("declaration");
  });
});

describe("output budget", () => {
  it("caps every output at the budget and marks truncation", () => {
    const big = "x".repeat(BUDGET.output * 3);
    const out = capOutput(big);
    expect(out.length).toBe(BUDGET.output);
    expect(out.endsWith("…[truncated]")).toBe(true);
    expect(capOutput("short")).toBe("short");
  });

  it("every tool's happy-path output fits the budget", async () => {
    await call("fill_field", { field_id: "full_name", value: "A".repeat(120) });
    for (const name of CLAIM_TOOL_NAMES) {
      const raw = String(
        await tools[name].execute({
          question_id: "full_name",
          field_id: "full_name",
          value: "x",
          section: "income",
        })
      );
      expect(raw.length, name).toBeLessThanOrEqual(BUDGET.output);
    }
  });
});
