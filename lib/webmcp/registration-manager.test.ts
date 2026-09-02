import { afterEach, describe, expect, it } from "vitest";
import { createRegistrationManager } from "./registration-manager";
import {
  FakeModelContext,
  installFakeModelContext,
} from "../../test/mock-model-context";

const tool = (name: string): WebMcpToolDefinition => ({
  name,
  description: `Tool ${name}`,
  inputSchema: { type: "object", properties: {} },
  execute: async () => "ok",
});

describe("registration manager (test plan rows 2, 13)", () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("reports unsupported with setup instructions when the API is absent", async () => {
    const m = createRegistrationManager(() => undefined);
    const s = await m.registerAll([tool("a")]);
    expect(s.state).toBe("unsupported");
    if (s.state === "unsupported")
      expect(s.reason).toMatch(/enable-webmcp-testing/);
  });

  it("registers every tool once and reports ready with the live list", async () => {
    const fake = new FakeModelContext();
    const m = createRegistrationManager(() => fake);
    const s = await m.registerAll([tool("b_tool"), tool("a_tool")]);
    expect(s).toEqual({ state: "ready", registered: ["b_tool", "a_tool"] });
    expect(fake.registrationAttempts).toEqual(["b_tool", "a_tool"]);
  });

  it("surfaces a rejected registration as degraded with the reason, never a silent gap", async () => {
    const fake = new FakeModelContext();
    const m = createRegistrationManager(() => fake);
    const s = await m.registerAll([
      tool("good"),
      tool("good"),
      tool("has space"),
    ]);
    expect(s.state).toBe("degraded");
    if (s.state === "degraded") {
      expect(s.registered).toEqual(["good"]);
      expect(s.failed.map((f) => f.name)).toEqual(["good", "has space"]);
      expect(s.failed[0].reason).toMatch(/already registered/);
      expect(s.failed[1].reason).toMatch(/violates/);
    }
  });

  it("never re-registers: a second registerAll (StrictMode double mount) touches nothing", async () => {
    const fake = new FakeModelContext();
    const m = createRegistrationManager(() => fake);
    await m.registerAll([tool("once")]);
    const again = await m.registerAll([tool("once"), tool("twice")]);
    expect(again.state).toBe("ready");
    expect(fake.registrationAttempts).toEqual(["once"]);
    expect(fake.unregistered).toEqual([]);
  });

  it("concurrent registerAll calls share one in-flight registration", async () => {
    const fake = new FakeModelContext();
    const m = createRegistrationManager(() => fake);
    const [a, b] = await Promise.all([
      m.registerAll([tool("x")]),
      m.registerAll([tool("x")]),
    ]);
    expect(a).toEqual(b);
    expect(fake.registrationAttempts).toEqual(["x"]);
  });

  it("reconcile marks a tool the browser dropped as degraded", async () => {
    const fake = new FakeModelContext();
    const m = createRegistrationManager(() => fake);
    await m.registerAll([tool("keep"), tool("lost")]);
    fake.tools.delete("lost");
    const s = await m.reconcile();
    expect(s.state).toBe("degraded");
    if (s.state === "degraded")
      expect(s.failed[0]).toMatchObject({ name: "lost" });
  });

  it("uses the real document.modelContext resolver by default", async () => {
    const installed = installFakeModelContext("document");
    restore = installed.restore;
    const m = createRegistrationManager();
    let notified = 0;
    m.subscribe(() => notified++);
    const s = await m.registerAll([tool("real")]);
    expect(s.state).toBe("ready");
    expect(notified).toBeGreaterThanOrEqual(2); // registering → ready
  });
});
