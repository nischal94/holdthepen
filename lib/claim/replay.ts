/**
 * A deterministic, clearly-labelled demonstration for visitors whose browser
 * has no WebMCP. It drives the REAL store through the REAL tool executors
 * (nothing is faked except the agent's timing) and it stops before approval:
 * the person still has to review and submit.
 */
import type { ClaimStore } from "./store";
import { createClaimTools } from "../webmcp/tools";

export interface ReplayStep {
  /** Who is acting in this beat. */
  actor: "you" | "agent" | "narrator";
  /** What the transcript shows. */
  text: string;
  /** Milliseconds to wait before running this step. */
  delay: number;
  /** Optional action; a returned string replaces `text` in the transcript. */
  run?: (
    store: ClaimStore,
    tools: Record<string, WebMcpToolDefinition>
  ) => Promise<string | void>;
}

/** Execute one tool through its registered definition and parse the JSON reply. */
async function call(
  tools: Record<string, WebMcpToolDefinition>,
  name: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return JSON.parse(String(await tools[name].execute(input))) as Record<
    string,
    unknown
  >;
}

/** The scripted beats, in order. Timing is the only thing that is staged. */
export const REPLAY_STEPS: ReplayStep[] = [
  {
    actor: "narrator",
    text: "Recorded demonstration. The agent's words are scripted; every action below runs through the same tools a live agent would call.",
    delay: 0,
  },
  {
    actor: "you",
    text: "You type your own name into the form.",
    delay: 900,
    run: async (store) => {
      store.humanSet("full_name", "Ada King");
    },
  },
  {
    actor: "you",
    text: "“Explain the income question before I answer it.”",
    delay: 1400,
  },
  {
    actor: "agent",
    text: "",
    delay: 900,
    run: async (_store, tools) => {
      const r = await call(tools, "explain", {
        question_id: "income_received_last_month",
        intent: "consequences",
      });
      return `It asks about money that actually arrived last month, not money you earned. ${String(r.consequences)}`;
    },
  },
  {
    actor: "you",
    text: "“Fill in the household section: I'm Ada King, born 1990-12-10, two of us at home.”",
    delay: 1600,
  },
  {
    actor: "agent",
    text: "",
    delay: 900,
    run: async (_store, tools) => {
      const r = await call(tools, "fill_field", {
        field_id: "full_name",
        value: "Ada King",
      });
      const err = r.error as { code: string; problem: string } | undefined;
      return err
        ? `I tried to write your name and the form refused (${err.code}): ${err.problem} I'll leave it as you typed it.`
        : "Wrote your name.";
    },
  },
  {
    actor: "agent",
    text: "",
    delay: 1100,
    run: async (_store, tools) => {
      await call(tools, "fill_field", {
        field_id: "date_of_birth",
        value: "1990-12-10",
      });
      await call(tools, "fill_field", {
        field_id: "household_size",
        value: "2",
      });
      return "Filled date of birth and household size. Both are marked as filled by me and need your review.";
    },
  },
  {
    actor: "you",
    text: "“Everything is filled in. Get it ready for me to check.”",
    delay: 1600,
  },
  {
    actor: "agent",
    text: "",
    delay: 900,
    run: async (_store, tools) => {
      const r = await call(tools, "prepare_submission_review", {});
      const err = r.error as { problem: string } | undefined;
      return err
        ? `Not yet: ${err.problem}`
        : "Staged a review. I cannot submit; that button is yours.";
    },
  },
  {
    actor: "agent",
    text: "",
    delay: 1100,
    run: async (_store, tools) => {
      await call(tools, "fill_field", {
        field_id: "employment_status",
        value: "employed",
      });
      await call(tools, "fill_field", {
        field_id: "income_received_last_month",
        value: "1450",
      });
      await call(tools, "fill_field", {
        field_id: "has_disability",
        value: "false",
      });
      await call(tools, "fill_field", { field_id: "is_carer", value: "false" });
      const r = await call(tools, "prepare_submission_review", {});
      return r.error
        ? `Still missing: ${String((r.error as { problem: string }).problem)}`
        : "Filled the rest and staged the review. Nothing is submitted.";
    },
  },
  {
    actor: "narrator",
    text: "Your turn. Six entries are waiting in the review queue. Accept or correct each one, tick the declaration, and only then can the claim be submitted, by you.",
    delay: 1200,
    run: async (store) => {
      store.navigate("declaration");
    },
  },
];

export type ReplayOutcome = "finished" | "stopped";

export interface ReplayController {
  /**
   * Run every step in order, reporting each transcript line. Resolves with
   * "finished" after the last step, or "stopped" if stop() was called.
   */
  play(onStep: (index: number, text: string) => void): Promise<ReplayOutcome>;
  /**
   * Halt the run and clear the demonstration's data from the store, so a
   * partial run never lingers as if it were the person's own answers.
   */
  stop(): void;
}

/** True when any field holds a value the person or an agent entered. */
export function storeHasContent(store: ClaimStore): boolean {
  return Object.values(store.getSnapshot().fields).some((f) => f.value !== "");
}

/**
 * Build a controller bound to a store. play() resets the store, so callers
 * must ask the person first when storeHasContent() is true.
 */
export function createReplay(
  store: ClaimStore,
  steps = REPLAY_STEPS
): ReplayController {
  const tools = Object.fromEntries(
    createClaimTools(store).map((t) => [t.name, t])
  );
  let cancelled = false;
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let release: (() => void) | null = null;

  // stop() must both clear the timer AND resolve the pending wait, or play()
  // would hang forever on the awaited promise.
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      release = resolve;
      timer = setTimeout(() => {
        release = null;
        resolve();
      }, ms);
    });

  return {
    async play(onStep) {
      cancelled = false;
      finished = false;
      store.reset();
      try {
        for (let i = 0; i < steps.length; i++) {
          if (cancelled) return "stopped";
          await wait(steps[i].delay);
          if (cancelled) return "stopped";
          const out = steps[i].run
            ? await steps[i].run!(store, tools)
            : undefined;
          if (cancelled) return "stopped";
          onStep(i, typeof out === "string" && out ? out : steps[i].text);
        }
      } catch (error) {
        // A failing step must not strand partial demonstration data.
        console.warn(
          "[replay] step failed; clearing demonstration data",
          error
        );
        cancelled = true;
        store.reset();
        return "stopped";
      }
      finished = true;
      return "finished";
    },
    stop() {
      // After a finished run the store holds the person's review-in-progress;
      // stopping then must not touch it.
      if (cancelled || finished) return;
      cancelled = true;
      if (timer) clearTimeout(timer);
      release?.();
      release = null;
      store.reset();
    },
  };
}
