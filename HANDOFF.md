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

## Current handoff — updated 2026-09-02 01:30 IST (test loop verified end to end; NEXT: push to GitHub, Chrome-flag check, then Task 2)

**Repo state:** local `main`, 6 commits, clean tree, **not yet on GitHub**.
Live: https://holdthepen.vercel.app (preflight build, Vercel CLI deploys,
project `holdthepen`). Spec rev 3 approved after a 4-phase dual-voice
a four-lens review: `docs/superpowers/specs/2026-09-01-agent-mediated-claim-design.md`
(+ audit trail, test plan, rev-2 snapshot alongside).

**What is DONE:** preflight page + origin-isolation header, verified on the
production origin (isolation `true`, header `?1`, honest degraded state) ·
test loop green — format, lint, typecheck, 17 tests, coverage over the `lib/`
trip-wire, `next build` with static prerender · typed WebMCP fake with
prove-it-can-fail tests · executable eval validator · SHA-pinned `ci.yml` +
`gitleaks.yml` · hooks installed (pre-commit lint-staged, pre-push check) ·
`SECURITY.md`, `docs/REPO-SETTINGS.md` (GitHub-side checklist, judging-freeze
rule).

**What is NOT verified:** WebMCP tool registration in a real flagged Chrome
(only the owner can check — the agent's browser is Chrome 148 with no
`document.modelContext`). CI has never run (no GitHub repo yet).

### NEXT — in this order

1. **Owner:** create the public repo and push (command in the kickoff), then
   tick the hour-0 items in `docs/REPO-SETTINGS.md`. Confirm `ci` and
   `gitleaks` go green on GitHub — first proof CI works from a bare VM.
2. **Owner:** open https://holdthepen.vercel.app in Chrome 149+ with
   `chrome://flags/#enable-webmcp-testing` enabled. Expected banner:
   "✅ WebMCP is live on this page — 1 tool registered". Report the text.
   This closes failure mode F7 (the last open one in the spec).
3. **Agent — Task 2 (spec §11):** `lib/claim/` store — `getSnapshot/dispatch/
subscribe`, per-field provenance + revision, review FSM
   (idle → staged → invalidated | approved). **Stale-closure test first**
   (test-plan row 1), then rows 3, 5, 9–12. No React in `lib/claim/`.
   Acceptance: tests observed failing then passing; `./node_modules/.bin/vitest run`
   green; coverage trip-wire holds.
4. Then Task 3 (registration manager) → Task 4 (7 tools + error envelope) per §11.

**Environment quirks (verified 2026-09-02):** `npm`/`npx` are sfw-shimmed
inside the agent sandbox and fail — run `./node_modules/.bin/<tool>` directly;
installs are run by the owner. Every node process prints "failed to copy trust
settings" to stderr — noise, filter it. `.git/` and `.github/workflows/` writes
need the sandbox disabled. Agent commits use `SKIP_SIMPLE_GIT_HOOKS=1` after
running the same checks by hand. Local agent permissions allow git

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
