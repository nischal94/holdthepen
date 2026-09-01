/**
 * The fake is test infrastructure, so it gets its own prove-it-can-fail
 * tests: each contract below is one that real code has shipped wrong.
 */
import { describe, expect, it } from "vitest";
import { FakeModelContext } from "./mock-model-context";

const tool = (name: string): WebMcpToolDefinition => ({
  name,
  description: `Tool ${name}`,
  inputSchema: { type: "object", properties: { text: { type: "string" } } },
  execute: async (input) => `got ${String(input.text)}`,
});

describe("FakeModelContext contracts", () => {
  it("registerTool resolves for a valid tool and lists it via getTools", async () => {
    const mc = new FakeModelContext();
    await expect(mc.registerTool(tool("a_tool"))).resolves.toBeUndefined();
    const tools = await mc.getTools();
    expect(tools.map((t) => t.name)).toEqual(["a_tool"]);
    // inputSchema comes back serialized, as observed in Chrome (issue #278).
    expect(typeof tools[0].inputSchema).toBe("string");
  });

  it("registerTool REJECTS on duplicate name (silent-loss guard)", async () => {
    const mc = new FakeModelContext();
    await mc.registerTool(tool("dup"));
    await expect(mc.registerTool(tool("dup"))).rejects.toThrow(
      /already registered/
    );
  });

  it("registerTool rejects empty name, empty description, bad chars", async () => {
    const mc = new FakeModelContext();
    await expect(mc.registerTool({ ...tool(""), name: "" })).rejects.toThrow();
    await expect(
      mc.registerTool({ ...tool("x"), description: "" })
    ).rejects.toThrow(/description/);
    await expect(mc.registerTool(tool("has space"))).rejects.toThrow(
      /violates/
    );
  });

  it("executeTool requires a JSON string and passes the parsed object", async () => {
    const mc = new FakeModelContext();
    await mc.registerTool(tool("echo"));
    const [reg] = await mc.getTools();
    await expect(
      mc.executeTool(reg, { text: "hi" } as unknown as string)
    ).rejects.toThrow(/JSON string/);
    await expect(
      mc.executeTool(reg, JSON.stringify({ text: "hi" }))
    ).resolves.toBe("got hi");
  });

  it("aborting an execution fires the signal and both cancel event spellings", async () => {
    const mc = new FakeModelContext();
    const seen: string[] = [];
    window.addEventListener("toolcancel", () => seen.push("toolcancel"));
    window.addEventListener("toolcanceled", () => seen.push("toolcanceled"));
    let sawAbort = false;
    await mc.registerTool({
      ...tool("slow"),
      execute: (_input, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            sawAbort = true;
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    });
    const [reg] = await mc.getTools();
    const controller = new AbortController();
    const pending = mc.executeTool(reg, "{}", { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow(/aborted/);
    expect(sawAbort).toBe(true);
    expect(seen.sort()).toEqual(["toolcancel", "toolcanceled"]);
  });

  it("unregistration via AbortSignal is observable", async () => {
    const mc = new FakeModelContext();
    const controller = new AbortController();
    await mc.registerTool(tool("temp"), { signal: controller.signal });
    expect((await mc.getTools()).length).toBe(1);
    controller.abort();
    expect((await mc.getTools()).length).toBe(0);
    expect(mc.unregistered).toEqual(["temp"]);
  });
});
