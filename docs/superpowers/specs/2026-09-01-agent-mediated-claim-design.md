<!-- /autoplan restore point: docs/superpowers/specs/.autoplan-restore-20260901.md -->
# Design — Reviewable Actions: an agent-mediation layer for consequential forms

Date: 2026-09-01 (rev 3 — APPROVED after /autoplan 4-phase dual-voice review)
Deadline: 2026-09-03 13:00 PT (2026-09-04 01:30 IST)
Status: APPROVED — build order in §11

## 1. What this is

**The product**: a reusable mediation layer for consequential WebMCP workflows —
provenance, explanation, correction, and human approval — demonstrated on the
form category where stakes are self-evident: a benefits claim.

**The product claim**: "WebMCP can make complex, consequential forms easier to
understand and complete while preserving visible attribution, correction, and
review — and here is the pattern any form operator can copy."

The spec-gap commentary (elicitation #165, mediation requirements #277, the
missing human-presence primitive) lives in ONE README section, not the thesis.
We do not claim to have solved human-only submission: the page constrains its
WebMCP contract; it cannot prove a human clicked. We do not claim WebMCP
replaces assistive technology (#91, closed, settled). We do not claim "generally
accessible" — this is an **accessible-by-design prototype**; we report observed
keyboard-only and screen-reader results on the golden path, nothing broader.

## 2. The demo domain

**Wendell County Household Support Allowance** — fictional agency, fictional
programme. Question wording and confusion points are **anchored to one real
form's** patterns (UK Universal Credit-style income timing, capital thresholds,
carer definitions) with rules simulated; the README and Devpost text name the
real form and state exactly which friction is reproduced and what is fictional.

**Four sections, one document** (URL never changes mid-claim):
1. Household  2. Income  3. Disability / caring (— designated cut lever)
4. Declaration & review

Content beats: ≥1 conditional branch, ≥1 confusing term (income *received* vs
*earned*), ≥1 validation-failure path, the full fill → conflict → review →
correct → approve arc.

### The three-way split (unchanged, the spine)

| Layer | Actor | Rule |
|---|---|---|
| Understand | Agent | Read-only, unlimited |
| Fill | Agent | Visible, attributed, revision-checked, undoable |
| Decide | Human, in the visible UI | No WebMCP tool commits the claim |

## 3. Tool surface — 7 tools

Imperative API only; top-level document only (ChatGPT browser: no declarative,
no iframes). Names ASCII `[A-Za-z0-9_.-]`, ≤30 chars. Every description ≤500
chars; params ≤150; outputs ≤1.5K with "…and N more" caps. Every tool that
echoes user/agent text sets `untrustedContentHint: true`. All registrations via
one manager (§4). Descriptions of tools 2–7 end with "Call get_claim_state
first."

| # | Tool | RO | Contract |
|---|---|---|---|
| 1 | `get_claim_state` | ✓ | Entry point. Sections, completion, empty fields, agent-filled-unreviewed list, staged-review status, `next_suggested_tools`. |
| 2 | `explain` | ✓ | One tool, `{question_id, intent?}`, intent ∈ meaning\|term\|consequences. What the question actually asks; confusable concepts; how each truthful answer affects the (simulated) workflow. Never recommends an answer. |
| 3 | `review_agent_entries` | ✓ | Every agent-supplied value + source + review status, capped. |
| 4 | `fill_field` | ✗ | One field. Rejected if field is focused, dirty, or human-answered non-empty (conflict error names the remedy). Commits only if per-field revision unchanged since read. Marks agent+unreviewed. Returns validator verdict. Same-value fill is idempotent. |
| 5 | `clear_field` | ✗ | Undo one field. Error (not failure) on empty field. |
| 6 | `navigate_to_section` | ✗ | Moves visible form + focus. Does NOT invalidate a staged review. |
| 7 | `prepare_submission_review` | ✗ | Description opens "Does NOT submit." Stages review, returns summary of what would be sent + commitments, or missing fields in form order. Idempotent per claim revision; any mutation invalidates the stage. |

**No commit tool — by decision, twice reviewed.** Approval is a UI-only
ceremony (§5). The error contract for EVERY failure:
`{code, problem, cause, fix, retryable}` — descriptive enough for the model to
self-correct.

Elicitation stand-in: after `prepare_submission_review` returns, the tool call
ENDS; the agent observes the human's decision via `get_claim_state` in a later
turn. README documents this as the missing primitive (#165).

## 4. Architecture

```
            ┌─────────────────────────────┐
            │ app/layout.tsx (server)     │
            └──────────┬──────────────────┘
            ┌──────────▼──────────────────┐
            │ ClaimProvider ("use client")│
            │  ├─ claimStore (plain TS)   │← getSnapshot/dispatch/subscribe
            │  │   fields·provenance·     │  per-field revisions·review FSM
            │  ├─ registrationManager     │← allSettled, status FSM,
            │  │   (document.modelContext │  register once, never churn
            │  │    ?? navigator.…)       │
            │  └─ tool execute() ──reads──► claimStore.getSnapshot()
            └──────────┬──────────────────┘
                       │ useSyncExternalStore
       ┌───────────────┼────────────────────┐
┌──────▼─────┐  ┌──────▼──────┐  ┌──────────▼─────────┐
│ FormSection│  │ ReviewQueue │  │ ApprovalPage       │
│ (×4, one   │  │ (rail /     │  │ checkbox + submit  │
│  document) │  │  bottom     │  │ disabled until     │
│            │  │  sheet)     │  │ unreviewed = 0     │
└────────────┘  └─────────────┘  └────────────────────┘
```

- **claimStore** is framework-independent TS: `getSnapshot()`, `dispatch()`,
  `subscribe()`. Tool callbacks read the snapshot — never a React closure.
  React renders via `useSyncExternalStore`. (Kills the stale-closure bug.)
- **Field record**: value, provenance (`human`|`agent`), reviewed flag,
  revision counter, validation state. Six named UI states: empty, human,
  agent-unreviewed, agent-accepted, agent-corrected, invalid — each with a
  text label. Accept ⇒ "agent-filled, reviewed" (provenance persists).
  Correct ⇒ provenance flips to human.
- **Review FSM**: idle → staged(reviewId, claimRevision) → invalidated |
  approved. Every dispatch invalidates; approval atomically re-checks
  revision + zero-unreviewed + checkbox.
- **registrationManager**: registers all 7 once with `Promise.allSettled`;
  status ∈ unsupported | registering | ready | degraded(reason); reconciles
  via `getTools()`; NEVER unregisters in React cleanup or retries via
  unregister/re-register. `AbortSignal` honored in execute; listeners for both
  `toolcancel` and `toolcanceled` (#146).
- SSR: document/navigator touched only inside client effects; `next build`
  is a preflight gate. `Origin-Agent-Cluster: ?1` set affirmatively; no
  Permissions-Policy header.
- Inputs: ~200-char per-field caps, control chars stripped, enforced in
  execute with the error envelope.
- Persistence: memory-first; explicit "Save draft on this device"
  (sessionStorage, provenance+review flags re-hydrated); visible "Clear claim
  data". No localStorage.
- Stack: Next.js App Router, TypeScript, Tailwind, Vercel.

## 5. The experience

**Homepage = judge kit + preflight (one page):**
1. Above the fold: live status chip ("7 agent tools registered" / degraded
   reason + fix), 3-step activation (copyable
   `chrome://flags/#enable-webmcp-testing`, "Chrome will restart", expected
   output per step), three copyable demo prompts, and **"Watch the agent flow"**
   — a deterministic, clearly-labeled replay (fill → conflict → review →
   approve) for flagless visitors: "recorded demonstration, not a live agent".
2. Claim header: what this claim decides, privacy/storage status, progress.
3. The form (three regions: form column; persistent review-queue rail —
   bottom sheet on mobile — with live unreviewed count; sticky section
   progress). Agent conversation is explicitly out-of-page.
4. Per-question "what this actually asks" disclosure — same content `explain`
   returns, visible without an agent.
5. **Approval page**: full-width list of every field + provenance, required
   "I have reviewed these answers" checkbox, submit **disabled until
   unreviewed = 0** (the thesis as a visual), then confirmation screen with
   claim reference. Any edit after staging revokes and returns to the form.

**Accessibility (measured, not aspired):** WCAG 2.2 AA contrast; 44×44 targets;
visible focus; logical tab order; error-summary receives focus; field-error
association; heading structure; 200% zoom/reflow; 320px layout. Announcements:
debounced batch ("6 fields filled by agent, 6 need review"), never values
(bystander privacy), plus a persistent status region. Focus ownership defined
for navigate/correct/clear/validation-failure/staging. Golden path tested
keyboard-only and with one screen reader; results reported as observed.

UI copy (badges, queue rows, announcements, errors) is written at design time,
not improvised — literal strings live in one `copy.ts`.

## 6. Verification

Order: (1) hello-world + homepage-preflight deployed to Vercel; (2) user
verifies on the PRODUCTION origin in Chrome 152 + flag: chip green,
`originAgentCluster === true`, `typeof document.modelContext === "object"`;
(3) only then feature work. Two scheduled manual agent windows (Chrome + flag;
ChatGPT desktop — noting Sol/Terra only, Luna disabled). TTHW stopwatch test
before submission (target ≤3:30 post-flag).

Full matrix: [test-plan-20260901.md](test-plan-20260901.md) — 21 rows including
the stale-closure guard, StrictMode double-mount, registration rejection,
outcome assertions (no silent overwrite; attribution persists until Accept;
approval impossible with unreviewed fields), cancellation, SSR build gate,
output budgets, provenance re-hydration. Every unit test observed failing once
before it counts. Eval JSONs (expectedCall, direct + ambiguous + mid-chain)
ship in the repo.

## 7. Threat model

Mitigated: agent overwrites human input (revisions + conflict errors); agent
commits claim (no tool exists); silent edits (announcements + persistent
badges); value disclosure via speech (never announced); data lingering
(memory-first, explicit save/clear); injection/budget blowout (caps, strip,
untrustedContentHint).
Documented out of scope: agent actuating the visible submit button via generic
automation (the missing platform primitive — README names it); prompt injection
inside the agent.

## 8. Deliverables

1. Live Vercel URL (production origin, not preview).
2. Public repo, MIT LICENSE (About-box detectable). No conversation.md,
   scripts/, .DS_Store, .impeccable/ — curated .gitignore before first push.
3. **Two-path README**: "Judge: test this in 10 minutes" (activation, prompts,
   expected results, troubleshooting, fallback) and "Reuse this mediation
   pattern" (store shape, registration manager, three-way split, adaptation
   checklist) + one spec-feedback section (#165, #277, missing primitive) +
   simulated-vs-real statement.
4. Devpost text: the four required points, naming the real form anchored.
5. **Video ≤3 min, scripted FIRST**: opens with the failure beat — agent fills
   a field wrong / hits the conflict error, human catches it via the review
   queue in seconds — then approval-disabled-until-reviewed, then the replay
   fallback exists for judges. Recorded with ≥4h margin.

## 9. NOT in scope

Real auth/backend/multi-user; Skills #161; collections #255; progress
reporting; output schemas; declarative API; cross-origin federation;
cryptographic human presence; localStorage. Named in README spec feedback.
Section 3 of the form is the sanctioned cut lever — nothing else gets cut
silently.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Agent picks wrong tool | 7 non-overlapping tools; entry-point pattern; evals |
| Rival entrants build the a11y angle | Moat = provenance/review depth; queue is the first thing shown everywhere |
| Judge tests flagless | Homepage kit + replay fallback |
| ChatGPT model gating (Luna) | README + testing instructions; Chrome is primary |
| Hour overrun | Budget: preflight/deploy 3h · store 8h · WebMCP manager 5h · UI/a11y 9h · tests 6h · README/Devpost 3h · video 4h · contingency 3h. Build sections 1,2,4 first. |
| False green on deploy | Preflight asserts runtime effects on production origin, day 1 |

## 11. Build order (approved)

1. Deploy verification: scaffold + homepage-preflight + 1 trivial tool → Vercel → user check (closes F7)
2. claimStore + revisions + review FSM (stale-closure test first)
3. registrationManager
4. 7 tools + error envelope
5. Sections 1, 2, 4 + six field states + review queue + approval page
6. Judge kit polish + replay fallback + two-path README
7. Evals + outcome assertions + a11y pass (keyboard, screen reader, zoom)
8. Video · Devpost text · TTHW stopwatch · submission

---
*Review provenance: /autoplan, 4 phases × dual voices (Claude opus subagents +
raw codex exec), 33 decisions — full audit trail in
[autoplan-audit-trail-20260901.md](autoplan-audit-trail-20260901.md); rev 2
snapshot in [.autoplan-restore-20260901.md](.autoplan-restore-20260901.md);
test plan in [test-plan-20260901.md](test-plan-20260901.md). U1 accepted
(replay fallback); T1 kept (no commit tool); T2 middle cut.*
