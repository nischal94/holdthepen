import { describe, expect, it } from "vitest";
import { BUDGET, NAME_PATTERN, TOOL_SCHEMAS } from "./tool-schemas";

// Table-driven budget check: one row per registered tool. Adding a tool that
// blows a budget fails here before it ever reaches a browser.
describe("tool schema budgets", () => {
  for (const [name, schema] of Object.entries(TOOL_SCHEMAS)) {
    it(`${name}: name pattern, name ≤${BUDGET.name}, description ≤${BUDGET.description}, params ≤${BUDGET.paramDescription}`, () => {
      expect(name).toMatch(NAME_PATTERN);
      expect(name.length).toBeLessThanOrEqual(BUDGET.name);
      expect(schema.description.length).toBeGreaterThan(0);
      expect(schema.description.length).toBeLessThanOrEqual(BUDGET.description);
      for (const [param, def] of Object.entries(
        schema.inputSchema.properties ?? {}
      )) {
        expect(param.length, `param ${param}`).toBeLessThanOrEqual(BUDGET.name);
        expect((def.description ?? "").length).toBeLessThanOrEqual(
          BUDGET.paramDescription
        );
      }
    });
  }
});
