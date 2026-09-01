import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReplay, REPLAY_STEPS, storeHasContent } from "./replay";
import { CLAIM_SCHEMA } from "./schema";
import { createClaimStore } from "./store";

describe("recorded demonstration", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs through the real tools, hits the human-value conflict, stages, and stops before approval", async () => {
    const store = createClaimStore(CLAIM_SCHEMA);
    const lines: string[] = [];
    const ctrl = createReplay(store);
    const done = ctrl.play((_i, text) => lines.push(text));
    await vi.runAllTimersAsync();
    await done;

    expect(lines.length).toBe(REPLAY_STEPS.length);
    expect(lines.join("\n")).toMatch(/CONFLICT_HUMAN_VALUE/);
    const s = store.getSnapshot();
    expect(s.fields.full_name).toMatchObject({
      value: "Ada King",
      provenance: "human",
    });
    expect(s.fields.household_size).toMatchObject({
      provenance: "agent",
      reviewed: false,
    });
    expect(store.unreviewedIds().length).toBe(6);
    expect(s.review.status).toBe("staged");
    expect(s.currentSection).toBe("declaration");
    // The demonstration never approves.
    expect(store.approve({ confirmed: true }).ok).toBe(false);
  });

  it("stop() halts the run, reports 'stopped', and clears the partial demo data", async () => {
    const store = createClaimStore(CLAIM_SCHEMA);
    const ctrl = createReplay(store);
    const done = ctrl.play(() => {});
    await vi.advanceTimersByTimeAsync(1000); // past "you type your name"
    expect(store.getSnapshot().fields.full_name.value).toBe("Ada King");
    ctrl.stop();
    await vi.runAllTimersAsync();
    expect(await done).toBe("stopped");
    expect(store.getSnapshot().fields.full_name.value).toBe("");
    expect(store.unreviewedIds().length).toBe(0);
  });

  it("a full run reports 'finished'", async () => {
    const store = createClaimStore(CLAIM_SCHEMA);
    const done = createReplay(store).play(() => {});
    await vi.runAllTimersAsync();
    expect(await done).toBe("finished");
  });

  it("storeHasContent is false when empty and true after any entry", () => {
    const store = createClaimStore(CLAIM_SCHEMA);
    expect(storeHasContent(store)).toBe(false);
    store.humanSet("full_name", "A");
    expect(storeHasContent(store)).toBe(true);
  });
});
