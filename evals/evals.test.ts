/**
 * Executable validator for the eval fixtures. An eval JSON that nothing reads
 * is decoration; this test makes each fixture fail when it references a tool
 * or argument the app does not actually register.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOOL_SCHEMAS } from "../lib/webmcp/tool-schemas";

interface EvalCase {
  id: string;
  messages: { role: string; content: string }[];
  expectedCall: { functionName: string; arguments: Record<string, unknown> }[];
}
interface EvalFile {
  tools: string[];
  cases: EvalCase[];
}

const dir = join(__dirname);
const files = readdirSync(dir).filter((f) => f.endsWith(".eval.json"));

describe("eval fixtures reference real tools", () => {
  it("has at least one fixture", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(dir, file), "utf8")) as EvalFile;

    describe(file, () => {
      it("declares only tools the app registers", () => {
        for (const name of data.tools) {
          expect(TOOL_SCHEMAS, `unknown tool "${name}"`).toHaveProperty(name);
        }
      });

      for (const c of data.cases) {
        it(`case ${c.id}: expected calls use real tools and known arguments`, () => {
          expect(c.messages.length).toBeGreaterThan(0);
          for (const call of c.expectedCall) {
            const schema = TOOL_SCHEMAS[call.functionName];
            expect(schema, `unknown tool "${call.functionName}"`).toBeDefined();
            const props = Object.keys(schema.inputSchema.properties ?? {});
            for (const key of Object.keys(call.arguments)) {
              expect(props, `arg "${key}" not in ${call.functionName}`).toContain(key);
            }
          }
        });
      }
    });
  }
});
