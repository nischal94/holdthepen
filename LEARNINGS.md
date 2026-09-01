# Learnings

Lessons from building Hold the Pen — one dated section per working session,
appended at session end (see HANDOFF.md). The spec records _what_ was decided;
this file records _what almost went wrong, what caught it, and what we'd repeat_.

**This file is history, not instructions.** Entries record what was true at
their date. Anything an agent must act on lives in an enforcement point that is
kept current — the spec, a test, a hook, a CI job, HANDOFF's quirks list. When a
lesson is superseded, the old entry stays and gains a one-line
`> Superseded <date>: …` note. Silent rewrites are forbidden.

## 2026-09-01 → 02 — Research, spec, review gauntlet, preflight deploy, test loop

Shipped: challenge brief, spec rev 3 (approved after a four-lens review —
strategy, design, engineering, developer experience — with two independent
reviewers, 33 logged decisions), rename to Hold the
Pen, Vercel production deploy verified, full test/CI scaffold green.

### 1. Read the spec repo's issues, not just its docs — two premises were wrong

The Chrome docs and the explainer suggested "accessibility through agents" was
an untouched spec goal with an open issue (#91). The issue tracker said the
opposite: #91 is a CLOSED challenge arguing WebMCP is _redundant_ with the
accessibility tree, and the feature we planned to build on —
`requestUserInteraction()` — appears zero times in the published spec. Both
facts changed the thesis (from "use elicitation" to "implement the missing
pattern in userland and say so"). Docs describe intent; issues describe
reality. Read both before designing.

### 2. The API surface is not stable across Chrome versions — code to the migration

`navigator.modelContext` → `document.modelContext` moved mid-2026; Chrome 150
keeps the old name as a deprecated alias. Most tutorials show the old one. The
getter with fallback lives in `lib/webmcp/get-model-context.ts` and has its own
tests for both locations. ChatGPT's in-app browser adds a second axis: no
declarative API, no iframe tools. Design to the intersection.

### 3. A React reducer cannot back once-registered tool callbacks

Two independent reviewers found the same
architecture bug in the spec: tools are registered once and never re-registered
(the unregister/re-register race is unprotected in the spec), so an `execute`
closing over reducer state reads the state at mount forever. The fix — a
framework-independent store read via `getSnapshot()`, React subscribing through
`useSyncExternalStore` — had to be decided before the first line of store code.
Test-plan row 1 (write, then read N dispatches later through the tool) is the
regression guard.

### 4. Two audits of the same plan converged where it mattered and split on cost

One audit priced the test/CI plan at ~5 h; the other at 18.5 h. Both agreed
on the foundations (lockfile, `npm ci`, SHA pins, least-privilege tokens,
Dependabot must not open PRs during the judging freeze, `dependency-review`
never fires on push-to-main = false green). Where they split, the deadline
decided. Adversarial review's best output here was inverting a weakness into
the thesis: "the agent can't submit" (false) became "the platform has no way to
prove a human clicked" (true, and a sharper gap).

### 5. `vercel project add` creates a framework-less project

The first deploy to the renamed project failed with "No Output Directory named
public" — `project add` defaults the framework to "Other". `vercel.json` with
`{"framework": "nextjs"}` fixed it; committed so it never recurs.

### 6. Most single-word product names are already someone's Vercel app

Nine of eleven candidates were live sites — two of them the _same concept_
(Countersign, CoSigned). Availability is a five-minute browser check per name;
do it before falling in love. Coined phrases win: `holdthepen` was free.

### 7. Verify a settings change in a fresh session, not by retrying

The local agent permission file was written mid-session and the next `git init`
still prompted — the settings watcher only watches directories that had a
settings file at session start. The restart proved it applied (first `git
status` ran without a prompt). Recording the change as "pending" until then was
the right call.

### 8. Every gate was observed failing before it counted

Prettier flagged 14 files, ESLint the empty-interface shim, vitest the missing
`@/` alias, then the isolation-less banner. None of the green results today is
decoration: each check has been seen red on real input this session.
