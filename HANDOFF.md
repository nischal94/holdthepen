# Handoff — Hold the Pen

The baton between sessions. **Protocol:**

1. **Session start:** read this file first, then whatever it points to. Do not
   re-derive project state from scratch.
2. **Session end:** rewrite this file to match reality — repo state, next task
   with acceptance criteria, kickoff prompt. Do this LAST, after the final
   commit. Append the session's lessons to LEARNINGS.md. Decisions belong in the
   spec (`docs/superpowers/specs/`), not here.
3. This file only _points_; git history is the archive of past handoffs.

**Staleness tripwire — run before trusting anything below:**

```
git log -1 --format=%h                 # latest commit
git log -1 --format=%h -- HANDOFF.md    # latest commit touching this file
```

If they differ, work happened after this handoff — reconstruct from `git log`
over that range, rewrite this file FIRST, then start the task. Also run
`gh pr list --state all --limit 5` (open PRs are invisible to the tripwire).

**Done-check (before saying "done"):** `git status --porcelain` clean,
`git status -sb` local == remote, tripwire current. Never let local `main`
accumulate unpushed commits.

**Hard clock:** submission closes **2026-09-03 13:00 PT (2026-09-04 01:30 IST)**.
After that, the repo, live site, and Devpost entry are FROZEN until winners are
announced (~2026-09-23). Fork to keep building.

---

## Current handoff — updated 2026-09-02 02:40 IST (Tasks 1–4 done: store, registration manager, seven tools; NEXT: Task 5 UI)

**Repo state:** local `main`, clean tree, **not yet on GitHub**. Live:
https://holdthepen.vercel.app (preflight build only; the claim UI is not
deployed yet). Spec rev 3 approved:
`docs/superpowers/specs/2026-09-01-agent-mediated-claim-design.md`; test plan
alongside; decision log and research in `docs-private/` (untracked).

**DONE (all under test, 73 tests green, coverage ≥94% on `lib/`):**

- Task 1 — preflight page + `Origin-Agent-Cluster: ?1`, verified on the
  production origin; test loop, SHA-pinned CI, hooks, SECURITY.md,
  `docs/REPO-SETTINGS.md`.
- Task 2 — `lib/claim/`: store (`getSnapshot/subscribe`, no React), schema
  (4 sections, 9 fields, one conditional), validator, per-field provenance +
  revision, review FSM. Stale-closure guard is test row 1.
- Task 3 — `lib/webmcp/registration-manager.ts`: registers once, allSettled,
  ready/degraded with reasons, never unregisters, one in-flight promise.
- Task 4 — `lib/webmcp/tools.ts`: the seven tools, error envelope, output
  cap, annotations; `evals/claim.eval.json` validated by `evals/evals.test.ts`.
- Public-tree hygiene audit: no former names, tool names, or quoted material
  in tracked files (grep in the untracked local notes file).

**NOT verified:** WebMCP registration in a real flagged Chrome (owner only).
CI has never run (no GitHub repo yet).

### NEXT — in this order

1. **Owner:** `gh repo create holdthepen --public --source=. --remote=origin --push`
   (full command in the kickoff), tick hour-0 items in `docs/REPO-SETTINGS.md`,
   confirm `ci` + `gitleaks` green.
2. **Owner:** open https://holdthepen.vercel.app in Chrome 149+ with the flag;
   report the banner text (expected "1 tool registered").
3. **Agent — Task 5 (spec §5, §11):** the UI. `ClaimProvider` (client) creating
   the store + registering the seven tools once via the manager;
   `useSyncExternalStore` hook; sections 1, 2, 4 first (3 is the cut lever);
   six named field states with text labels; review queue (rail / bottom
   sheet) with Accept / Correct / Clear; approval page with the declaration
   checkbox and submit **disabled until unreviewed = 0**; confirmation screen;
   debounced `aria-live` announcements that never speak values; homepage =
   judge kit + status chip. Replace the preflight page; drop `get_demo_status`.
   Acceptance: component tests for the six states, queue, disabled-submit,
   axe zero violations; `next build` green; deploy; owner verifies with the
   flag.
4. Task 6 — judge kit polish + replay fallback + two-path README.
5. Task 7 — evals + a11y pass. Task 8 — video, Devpost text, submission.

**Local tooling notes** live in an untracked file at the repo root.

### KICKOFF PROMPT for the next session

> Continue Hold the Pen in ~/projects/holdthepen. Read HANDOFF.md first and
> follow its protocol (tripwire + `gh pr list`). **State: preflight deployed
> and verified on the production origin; test loop green end to end; repo not
> yet on GitHub; WebMCP registration unverified in real Chrome.** Do NOT
> re-review the spec (rev 3 is approved). If the repo is still local, hand
> the owner: `gh repo create holdthepen --public --source=. --remote=origin
--description "You hold the pen. An agent-mediation layer for consequential
forms, built on WebMCP." --push`. Ask for the Chrome-flag banner text. Then
> start Task 2 per the NEXT section, stale-closure test first.
