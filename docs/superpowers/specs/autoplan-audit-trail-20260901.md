<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO | Mode: SELECTIVE EXPANSION | Mechanical | override | autoplan default | other modes |
| 2 | CEO | Premises P1–P5 confirmed | Gate (user) | — | user chose "Confirm all five" | hedge/reframe options |
| 3 | CEO | Reframe: product ("reusable mediation layer") not spec-essay | Auto | P3,P5 | both voices independently converged | keep thesis framing |
| 4 | CEO | Collapse 3 explainer tools → 1 `explain` | Auto | P4 (DRY) | both voices: semantic collisions hurt tie-breaker | keep 3 tools |
| 5 | CEO | Anchor fiction to one real form's wording (simulated rules) | Auto | P1 | both voices: impact credibility | pure fiction |
| 6 | CEO | Video designed first; lead with failure-catch story | Auto | P6 | both voices | video-last plan |
| 7 | CEO | Evals assert outcomes, not just expectedCall | Auto | P1 | Codex C9 + subagent S6 | call-only evals |
| 8 | CEO | Add judge-activation kit (above-fold steps, copyable prompts, in-page tool status) | Auto | P2 | Codex C10; in blast radius, <1d | omit |
| 9 | CEO | Add risk row: rival a11y entrants; moat = provenance/review depth | Auto | P1 | subagent S5 | none |
| T1 | CEO | submit_reviewed_claim tool: ADD (Codex) vs keep none (spec) | TASTE | — | one-voice disagreement with approved design | → final gate |
| T2 | CEO | Scope cut depth (sessionStorage, preflight breadth, 90s golden path) | TASTE | — | completeness (P1) vs 41h deadline | → final gate |
| 10 | Design | 3-region wireframe; agent chat out-of-page | Auto | P5 | both voices: no layout specified | leave to implementer |
| 11 | Design | Six named field states w/ text labels | Auto | P5,P1 | both voices: states unspecified | improvise |
| 12 | Design | Approval page: provenance list + checkbox + submit disabled until unreviewed=0 | Auto | P5 | arc breaks at approval; strongest visual | bare button |
| 13 | Design | Debounced batch announcements + status region | Auto | P1 | 20-field announce storm is hostile | per-write announce |
| 14 | Design | Literal UI copy written at design time | Auto | P5 | generic patterns → improvised copy under deadline | defer to build |
| 15 | Design | Resolved-ambiguities: accept keeps provenance; correct→human; queue survives nav; errors in form order | Auto | P5 | both voices' haunting ambiguities | leave open |
| 16 | Design | Mobile single-column; queue = bottom sheet; WCAG 2.2 AA measurables | Auto | P1 | Codex: responsive absent, a11y aspirational | aspirational |
| 17 | Design | Post-approval confirmation screen w/ claim reference | Auto | P1 | demo's final frame unspecified | end at staging |
| 18 | Eng | External claim store + useSyncExternalStore; tools read getSnapshot() | Auto | P5 | both voices: reducer closure = stale reads | reducer-only |
| 19 | Eng | Per-field revisions; conflict error on human/focused fields | Auto | P1 | silent overwrite is the failure the product exists to prevent | last-writer-wins |
| 20 | Eng | Staged-review FSM with revision check; mutations invalidate | Auto | P1 | stale stage = correctness bug in thesis flow | naive staging |
| 21 | Eng | Registration manager: allSettled + status FSM; no cleanup unregister | Auto | P5 | StrictMode/FastRefresh churn; silent tool loss | hook-only lifecycle |
| 22 | Eng | SSR guards + next build as gate; ambient types | Auto | P1 | prerender throws on Vercel build, not dev | discover at deploy |
| 23 | Eng | Input caps ~200 chars, strip control chars, untrustedContentHint everywhere | Auto | P1 | budget blowouts + injection surface | "where applicable" |
| 24 | Eng | Hour budget adopted (3/8/5/9/6/3/4/3); build sections 1,2,4 first; section 3 = cut lever | Auto | P3 | 41h unallocated = silent overrun | unbudgeted |
| 25 | Eng | Test plan artifact docs/superpowers/specs/test-plan-20260901.md (21 rows) | Auto | P1 | happy-path evals insufficient | call-only evals |

## Phase 3 artifacts (autoplan)

### Architecture (revised per eng consensus)

```
            ┌─────────────────────────────┐
            │ app/layout.tsx (server)     │
            └──────────┬──────────────────┘
                       │
            ┌──────────▼──────────────────┐
            │ ClaimProvider ("use client")│
            │  ├─ claimStore (plain TS)   │← getSnapshot/dispatch/subscribe
            │  │   fields·provenance·     │  revisions·reviewFSM
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

### Failure modes registry

| # | Failure | Detection | Handling | Critical gap? |
|---|---|---|---|---|
| F1 | Tool execute reads stale state | test #1 | external store | closed by design |
| F2 | Agent silently overwrites human input | test #5 | revision check + conflict error | closed |
| F3 | Registration promise rejects silently | test #2 + preflight | allSettled + degraded status banner | closed |
| F4 | SSR prerender touches document | test #15 | client-only provider + build gate | closed |
| F5 | Stale staged review approved | tests #9-11 | review FSM + revision | closed |
| F6 | API absent (flagless judge, Luna model) | test #18 | banner + hand-usable form + judge kit | closed |
| F7 | Deployed origin not isolated | test #19 | OAC:?1 header + preflight page, day 1 | open until deploy |
| F8 | Announcement storm on batch fill | design #13 | debounced batch announcements | closed |
| F9 | Output exceeds 1.5K budget | test #17 | caps + "…and N more" | closed |
| F10 | Cancellation mid-fill leaves half state | test #14 | AbortSignal + per-field atomic commits | closed |
| F11 | Agent behaves badly anyway (wrong tool order) | eval #21 + manual windows | descriptive errors enable self-correction | accepted risk |

### NOT in scope (deferred, with rationale)
Real auth/backend/multi-user; Skills #161; collections #255; progress reporting;
output schemas; declarative API; cross-origin federation; cryptographic human
presence — all named in README spec-feedback instead (CEO P3: outside blast
radius or impossible in 41h). localStorage (privacy). Section 3 of the form is
the designated cut lever, not silent scope.

### What already exists (leverage map)
registration lifecycle → use-webmcp-tool patterns (referenced, but custom
manager per F3); typings → webmcp-types; store → useSyncExternalStore
(React built-in); eval format → Chrome expectedCall; deploy → Vercel defaults
(no OAC:?0). Form content: original (anchored to one real form's wording).
| 26 | DX | Homepage = judge kit + preflight (status chip, flag string, 3 prompts) | Auto | P5 | both voices: TTHW 5-8min unacceptable | separate /preflight only |
| 27 | DX | Error envelope {code,problem,cause,fix,retryable} on every failure | Auto | P1 | both voices: contract, not aspiration | ad-hoc messages |
| 28 | DX | explain(question_id,intent?) single tool — normative | Auto | P4 | reconciles decision 4 into tool surface | 3 tools |
| 29 | DX | get_claim_state = entry point + next_suggested_tools | Auto | P5 | cold-agent progressive disclosure | flat 7 tools |
| 30 | DX | navigate_to_section rename; "Does NOT submit." leads stager desc | Auto | P5 | LLM guessability | keep goto_section |
| 31 | DX | Two-path README: judge 10-min / reuse pattern | Auto | P1 | both voices | thesis-first README |
| 32 | DX | TTHW stopwatch test pre-submission | Auto | P1 | measurable, catches false green | assume |
| U1 | DX | Scripted "replay agent flow" fallback for flagless judges | USER CHALLENGE | — | BOTH voices demand it; ~3-4h vs 3h contingency | → final gate |
