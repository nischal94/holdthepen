# Hold the Pen

**An agent can fill the form. You hold the pen.**

A benefits-style claim form that an AI agent can read, explain, and fill
through [WebMCP](https://webmachinelearning.github.io/webmcp/) tools — while
every value the agent writes stays marked, reviewable, and undoable, and no
tool can submit the claim. Approval is a control on the page that only the
person can use.

**Live:** https://holdthepen.vercel.app
&nbsp;·&nbsp; [Design](docs/DESIGN.md) &nbsp;·&nbsp; [Testing](docs/TESTING.md)
&nbsp;·&nbsp; [![ci](https://github.com/nischal94/holdthepen/actions/workflows/ci.yml/badge.svg)](https://github.com/nischal94/holdthepen/actions/workflows/ci.yml)

## Why this exists

Consequential forms — benefits, insurance, immigration — are long,
conditional, and written in a language of their own. The hard part is rarely
typing; it is understanding what a question actually asks and what each
answer commits you to. An agent that can _explain_ a form and _fill_ it is
useful only if the person can see exactly what it did, correct it, and remain
the one who decides.

WebMCP makes that possible in the page itself: the agent calls typed tools
against the live form the person is looking at, instead of guessing at the
DOM. Hold the Pen uses that to draw a hard line:

| Layer      | Who    | Rule                                                                 |
| ---------- | ------ | -------------------------------------------------------------------- |
| Understand | Agent  | Explain any question — meaning, terms, consequences. Read-only.      |
| Fill       | Agent  | Write values that are attributed, revision-checked, and undoable.    |
| Decide     | Person | Review every agent entry, tick the declaration, submit. No tool can. |

## Test it in 10 minutes

1. **Get a WebMCP-capable browser.** Either:
   - Chrome 149 or later: open `chrome://flags/#enable-webmcp-testing`, set it
     to **Enabled**, relaunch; or
   - the ChatGPT desktop app's built-in browser (site tools work by default).
2. **Open https://holdthepen.vercel.app.** The status chip in the "Try it
   with an agent" box should read **7 agent tools registered**. If it says
   "unavailable", the flag did not take — enable it again and relaunch.
3. **Talk to an agent that can see the page** (the ChatGPT browser's "Site
   tools", or Chrome with a WebMCP-capable agent extension) and use the three
   prompts on the page. What you should see:

   | Prompt                                                                                    | Expected                                                                                                     |
   | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
   | "Explain the income question on this form before I answer it."                            | A plain-language explanation of _received_ vs _earned_ income. No field changes.                             |
   | "Fill in the household section for me: I'm Ada King, born 1990-12-10, two of us at home." | Three fields fill, each badged **Filled by the agent — not yet reviewed**; the review queue shows 3 entries. |
   | "Everything is filled in — get it ready for me to check."                                 | The agent reports which required fields are still missing. Nothing is submitted.                             |

4. **Try to break the line.** Type into a field yourself, then ask the agent
   to change it — it refuses (`CONFLICT_HUMAN_VALUE`). Ask it to submit — there
   is no tool for that; it can only prepare a review. Go to **Check and
   declare**: the submit button stays disabled, and says why, until every
   agent entry is accepted or corrected and the declaration is ticked.

**Troubleshooting.** Chip says unavailable → flag not enabled or an older
Chrome. Chip says "N registered, M failed" → open the browser console; the
registration manager logs the reason per tool. Nothing happens when the agent
"fills" → check the review queue on the right; every agent write lands there.

## What the agent can do

Seven tools, registered once on the page:

| Tool                        | Purpose                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `get_claim_state`           | Entry point: sections, empty/invalid fields, unreviewed agent entries, review stage, suggested next tools.         |
| `explain`                   | One question's meaning, a confusing term, or the consequences of each truthful answer. Never recommends an answer. |
| `review_agent_entries`      | Everything the agent has written, with review status.                                                              |
| `fill_field`                | Write one value. Refuses to overwrite the person's value or a field being edited.                                  |
| `clear_field`               | Undo one field.                                                                                                    |
| `navigate_to_section`       | Move the visible form and focus. Changes nothing.                                                                  |
| `prepare_submission_review` | Stage a review of the completed claim. **Does not submit.**                                                        |

Every failure returns `{ code, problem, cause, fix, retryable }` so the agent
can correct itself. Details: [docs/DESIGN.md](docs/DESIGN.md).

## What makes it accessible

- Every field state is a **text label** ("Filled by the agent — not yet
  reviewed"), exposed to assistive technology, never only a colour.
- Agent writes produce one polite live-region announcement naming the fields
  that changed — **never the values** (speech output should not read your
  income to the room).
- The review queue, approval page, and every control are keyboard-reachable
  with visible focus and 44 px targets; the submit control explains in text
  why it is disabled.

## Reuse the pattern

The mediation layer is independent of this form:

- `lib/claim/store.ts` — a plain-TypeScript store with per-field provenance,
  revision counters, and a review state machine. Tools read it at call time
  through `getSnapshot()`; React subscribes via `useSyncExternalStore`.
- `lib/webmcp/registration-manager.ts` — registers tools exactly once,
  reports rejected registrations as a visible degraded state, never
  unregisters.
- `lib/webmcp/tools.ts` — binds the seven tools to any store with the same
  interface; swap `lib/claim/schema.ts` for your own questions.
- `test/mock-model-context.ts` — a typed fake of `document.modelContext` that
  enforces the browser contracts (rejecting duplicate names, JSON-string
  arguments, cancellation events) so the whole loop runs under test.

## Honest limits

- The tool surface has no commit operation, so an agent cannot submit through
  WebMCP. An agent driving the browser generically could still press the
  visible button; the page cannot tell a human click from an automated one.
  A trustworthy human-only approval boundary is a platform primitive WebMCP
  does not yet provide — see the elicitation discussion in
  [issue #165](https://github.com/webmachinelearning/webmcp/issues/165) and
  the user-agent mediation requirements in
  [issue #277](https://github.com/webmachinelearning/webmcp/issues/277).
- `prepare_submission_review` stages and returns; the agent learns the
  person's decision later through `get_claim_state`. That is a stand-in for
  elicitation, not elicitation.
- The programme, rules, and submission are fictional. Question wording models
  real benefit forms. No data leaves the browser; drafts are saved only if you
  choose to, for the session.
- Verified in Chrome with the flag and in the ChatGPT desktop browser. The
  declarative form API and iframe tools are not used because the ChatGPT
  browser does not support them.

## Develop

```bash
npm ci
npm run dev        # http://localhost:3000
npm run check      # format, lint, typecheck, tests
npm run ci         # check + coverage + production build
```

Built with Next.js, TypeScript, and Tailwind. MIT licensed.
