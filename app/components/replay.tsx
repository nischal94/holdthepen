"use client";

import { useEffect, useRef, useState } from "react";
import {
  REPLAY_STEPS,
  createReplay,
  type ReplayController,
} from "@/lib/claim/replay";
import { useClaimContext } from "@/lib/react/claim-context";

/**
 * "Watch the agent flow" — for visitors without WebMCP. Plays the scripted
 * demonstration through the real tools and shows a transcript. Clearly
 * labelled as recorded; ends with the person's own review and approval.
 */
export function Replay() {
  const { store, announce } = useClaimContext();
  const [lines, setLines] = useState<{ actor: string; text: string }[]>([]);
  const [playing, setPlaying] = useState(false);
  const ctrl = useRef<ReplayController | null>(null);

  useEffect(() => () => ctrl.current?.stop(), []);

  async function play() {
    ctrl.current?.stop();
    ctrl.current = createReplay(store);
    setLines([]);
    setPlaying(true);
    announce("Recorded demonstration started.");
    await ctrl.current.play((i, text) => {
      setLines((l) => [...l, { actor: REPLAY_STEPS[i].actor, text }]);
    });
    setPlaying(false);
    announce("Recorded demonstration finished. Your turn to review.");
  }

  function stop() {
    ctrl.current?.stop();
    setPlaying(false);
  }

  const label = (a: string) =>
    a === "you" ? "You" : a === "agent" ? "Agent (recorded)" : "Note";

  return (
    <section
      aria-labelledby="replay-heading"
      className="rounded-lg border border-neutral-300 bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="replay-heading" className="text-base font-semibold">
          Watch the agent flow
        </h2>
        <p className="text-xs text-neutral-600">
          Recorded demonstration, not a live agent.
        </p>
      </div>
      <p className="mt-1 text-sm text-neutral-700">
        No WebMCP browser? Play a scripted run that uses the same tools a live
        agent would. It resets the form and stops before approval — that part is
        yours.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={play}
          disabled={playing}
          className="min-h-11 rounded bg-neutral-900 px-4 text-sm font-medium text-white disabled:bg-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {playing
            ? "Playing…"
            : lines.length
              ? "Play again"
              : "Play the demonstration"}
        </button>
        {playing && (
          <button
            type="button"
            onClick={stop}
            className="min-h-11 rounded border border-neutral-600 px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Stop
          </button>
        )}
      </div>
      {lines.length > 0 && (
        <ol
          role="log"
          aria-label="Demonstration transcript"
          className="mt-3 space-y-2 text-[15px]"
        >
          {lines.map((l, i) => (
            <li
              key={i}
              className={
                l.actor === "agent"
                  ? "rounded bg-amber-50 p-2"
                  : l.actor === "you"
                    ? "rounded bg-neutral-100 p-2"
                    : "text-sm text-neutral-700"
              }
            >
              <span className="font-medium">{label(l.actor)}: </span>
              {l.text}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
