import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReplay, REPLAY_STEPS } from "./replay";
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

  it("stop() halts the run without further mutations", async () => {
    const store = createClaimStore(CLAIM_SCHEMA);
    const ctrl = createReplay(store);
    const done = ctrl.play(() => {});
    await vi.advanceTimersByTimeAsync(1000); // past the first two steps
    ctrl.stop();
    await vi.runAllTimersAsync();
    await done;
    expect(store.unreviewedIds().length).toBe(0);
  });
});
