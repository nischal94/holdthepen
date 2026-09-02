"use client";

import { useEffect, useRef, useState } from "react";
import {
  REPLAY_STEPS,
  createReplay,
  storeHasContent,
  type ReplayController,
} from "@/lib/claim/replay";
import { useClaimContext } from "@/lib/react/claim-context";

/**
 * "Watch the agent flow", for visitors without WebMCP. Plays the scripted
 * demonstration through the real tools and shows a transcript. Clearly
 * labelled as recorded; ends with the person's own review and approval.
 *
 * Playing resets the form, so if the person has entered anything, the
 * button first asks for confirmation instead of erasing their answers.
 */
export function Replay() {
  const { store, announce } = useClaimContext();
  const [lines, setLines] = useState<{ actor: string; text: string }[]>([]);
  const [playing, setPlaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ctrl = useRef<ReplayController | null>(null);
  const playButton = useRef<HTMLButtonElement | null>(null);
  const confirmButton = useRef<HTMLButtonElement | null>(null);
  const stopButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => () => ctrl.current?.stop(), []);

  // Keyboard focus must follow the dialog: into it when it opens (the Play
  // button it replaced is gone), back to Play when it closes.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true; // never steal focus on initial page load
      return;
    }
    if (confirming) confirmButton.current?.focus();
    else if (playing) stopButton.current?.focus({ preventScroll: true });
    else playButton.current?.focus({ preventScroll: true });
  }, [confirming, playing]);

  /** Start, or ask first when the form already holds the person's answers. */
  function requestPlay() {
    if (storeHasContent(store)) {
      setConfirming(true);
      return;
    }
    void play();
  }

  /** Run the demonstration and announce its true outcome. */
  async function play() {
    setConfirming(false);
    ctrl.current?.stop();
    const controller = createReplay(store);
    ctrl.current = controller;
    setLines([]);
    setPlaying(true);
    announce("Recorded demonstration started.");
    const outcome = await controller.play((i, text) => {
      if (ctrl.current !== controller) return;
      setLines((l) => [...l, { actor: REPLAY_STEPS[i].actor, text }]);
    });
    // A newer run may have replaced this one; only the current run reports.
    if (ctrl.current !== controller) return;
    setPlaying(false);
    announce(
      outcome === "finished"
        ? "Recorded demonstration finished. Your turn to review."
        : "Recorded demonstration stopped. The form was cleared."
    );
  }

  /** Halt the run; the controller clears the demonstration's data. */
  function stop() {
    ctrl.current?.stop();
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
        agent would. It resets the form and stops before approval. That part is
        yours.
      </p>

      {confirming ? (
        <div
          role="alertdialog"
          aria-labelledby="replay-confirm"
          className="mt-3 rounded border border-amber-700 bg-amber-50 p-3"
        >
          <p id="replay-confirm" className="text-sm font-medium">
            Playing the demonstration clears everything you have entered so far.
            Continue?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              ref={confirmButton}
              type="button"
              onClick={() => void play()}
              className="min-h-11 rounded bg-neutral-900 px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Clear and play
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-11 rounded border border-neutral-600 px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Keep my answers
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            ref={playButton}
            type="button"
            onClick={requestPlay}
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
              ref={stopButton}
              type="button"
              onClick={stop}
              className="min-h-11 rounded border border-neutral-600 px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Stop
            </button>
          )}
        </div>
      )}

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
