# Design

Hold the Pen is a benefits-style claim form that an AI agent can read,
explain, and fill through [WebMCP](https://webmachinelearning.github.io/webmcp/)
tools, while the person keeps every decision. This document describes the
pattern so a form operator can reuse it.

## The three-way split

| Layer      | Who    | Rule                                                                                   |
| ---------- | ------ | -------------------------------------------------------------------------------------- |
| Understand | Agent  | Read-only, unlimited: explain any question in plain language.                          |
| Fill       | Agent  | Writes into visible fields. Every write is attributed, revision-checked, and undoable. |
| Decide     | Person | Approval is a control on the page. No WebMCP tool can commit the claim.                |

## Tools

Seven tools, registered once on the top-level document with the imperative
API (`document.modelContext.registerTool`). Names, descriptions, and schemas
live in [`lib/webmcp/tool-schemas.ts`](../lib/webmcp/tool-schemas.ts).

| Tool                        | Read-only | What it does                                                                                                             |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `get_claim_state`           | yes       | Entry point. Sections, empty/invalid fields, agent-filled entries awaiting review, review stage, `next_suggested_tools`. |
| `explain`                   | yes       | One question's meaning, a confusing term, or the consequences of each truthful answer. Never recommends an answer.       |
| `review_agent_entries`      | yes       | Every value an agent wrote, with its review status.                                                                      |
| `fill_field`                | no        | Writes one value. Refuses to overwrite a value the person typed or a field they are editing.                             |
| `clear_field`               | no        | Empties one field.                                                                                                       |
| `navigate_to_section`       | no        | Moves the visible form and focus. Changes nothing in the claim.                                                          |
| `prepare_submission_review` | no        | Stages a review of the completed claim. Does not submit.                                                                 |

Every failure returns the same envelope so the agent can self-correct:

```json
{
  "code": "CONFLICT_HUMAN_VALUE",
  "problem": "…",
  "cause": "…",
  "fix": "…",
  "retryable": false
}
```

Outputs are capped at 1500 characters. Tools that echo user- or agent-supplied
text set `untrustedContentHint`.

## Provenance and review

Each field records its value, who wrote it (`human` or `agent`), whether the
person has reviewed it, and a revision counter.

- An agent write marks the field **filled by agent, not yet reviewed**. The
  label is text, exposed to assistive technology, not only a colour.
- The person can **accept** (provenance stays `agent`, reviewed becomes true),
  **correct** (provenance becomes `human`), or **clear**.
- An agent write is rejected if the field holds a human value, is being edited,
  or changed since the agent last read it.
- A staged review is pinned to the claim's revision. Any later change
  invalidates it. Approval requires a current stage, zero unreviewed agent
  entries, and the person ticking the declaration.

## Architecture

```
ClaimProvider (client)
 ├─ claimStore        plain TypeScript: getSnapshot / dispatch / subscribe
 ├─ registrationManager registers the seven tools once; ready or degraded
 └─ tool execute()  ── reads ──▶ claimStore.getSnapshot()
        │ useSyncExternalStore
 FormSections · ReviewQueue · ApprovalPage
```

Why a store outside React: tools are registered once for the life of the
page. A callback closing over React state would read the state at mount
forever. Reading `getSnapshot()` at call time keeps tools and UI in agreement.

Why registration never repeats: unregistering and re-registering a tool with a
changed schema is a race in the current draft spec, and an agent that sees a
tool vanish cannot tell "unavailable" from "gone". Tools stay registered and
return a descriptive error instead.

## Accessibility

- Agent writes trigger one debounced `aria-live` announcement naming the
  fields that changed and that they need review. Values are never announced
  (speech output should not disclose income to a room).
- Six field states, each with a text label: empty, entered by you, filled by
  agent (not reviewed), filled by agent (reviewed), corrected by you, invalid.
- The review queue and the approval page are keyboard-reachable; the submit
  control is disabled until every agent entry is reviewed and the declaration
  is ticked.

## Honest limits

- **No human-presence proof.** The tool surface has no commit operation, so
  an agent cannot submit through WebMCP. An agent using ordinary browser
  automation could still activate the visible control; the page cannot tell a
  human click from an automated one. A trustworthy human-only approval
  boundary is a platform primitive WebMCP does not yet have (see the elicitation
  discussion in [issue #165](https://github.com/webmachinelearning/webmcp/issues/165)
  and the mediation requirements in
  [issue #277](https://github.com/webmachinelearning/webmcp/issues/277)).
- **Staging is not elicitation.** `prepare_submission_review` stages and
  returns; the agent learns the person's decision later via `get_claim_state`.
- **Browser support.** Chrome 149+ with `chrome://flags/#enable-webmcp-testing`,
  or the ChatGPT desktop browser. The declarative form API and iframe-registered
  tools are not used because the ChatGPT browser does not support them.
- **Simulated.** The programme, rules, and submission are fictional. Question
  wording models real benefit forms; no data leaves the browser.
