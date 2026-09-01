# WebMCP Challenge — Context Brief

Captured 2026-09-01 from Devpost, Chrome docs, and the WebMCP explainer.
Source-of-truth: https://webmcp.devpost.com/rules (Official Rules govern over all else).

## Hard deadlines

| Event             | When                                                     |
| ----------------- | -------------------------------------------------------- |
| Submission closes | **Thu Sep 3, 2026, 1:00 PM PT** (= Fri Sep 4, 01:30 IST) |
| Judging           | Sep 4 (10:00 PT) – Sep 21 (17:00 PT)                     |
| Winners           | ~Sep 23, 2026, 2:00 PM PT                                |

After the deadline: do NOT touch the Devpost entry, the repo, or the live site
until winners are announced. Fork to keep building.

## Required deliverables (all mandatory)

1. Live URL working in ChatGPT in-app browser OR Chrome 149+ with the flag.
2. Public repo (GitHub/GitLab/Bitbucket) with an OSS license detected in the
   GitHub "About" sidebar (so: a real `LICENSE` file, not a mention in README).
3. Text description covering four points: WebMCP fit, better UX, what
   human+agent can now do that was hard/impossible before, how WebMCP was implemented.
4. Public YouTube demo video, **under 3 minutes, with audio narration**.
5. Login credentials if the app is authenticated.

Note: one Devpost FAQ answer says "since there's no video" — this contradicts the
rules and the other FAQ answer. The rules govern: THE VIDEO IS REQUIRED.

## Judging criteria (equally weighted)

- WebMCP Leverage — thorough, skillful, non-trivial working implementation.
- Execution — complete coherent product, not a proof of concept.
- Potential Impact — credible specific case, real problem, real audience.
- Creativity & Ambition — novel, differs from existing concepts.

Tie-break walks the criteria in the order above, so WebMCP Leverage breaks ties first.

## Judges

Andrew Galloni (Cloudflare) · Alex Nahas (creator of MCP-B, cited as prior art in
the spec) · Ilya Grigorik (Shopify) · Jude Gao (Vercel/Next.js core) ·
Justin Rushing (OpenAI, Browser Platform Lead) · Sarah Drasner (Chrome) ·
Sean Roberts (Netlify).

These people wrote the spec and the docs. Spec-literate work will be recognized.

## Environment (verified 2026-09-01)

- Chrome 152.0.7977.65 installed — needs 149+, OK.
- ChatGPT.app installed — its in-app browser supports WebMCP by default.
- node v22.20.0, bun 1.3.11, git 2.50.1.
- The Claude Code browser pane runs Chrome 148 and does NOT expose
  `document.modelContext`. It cannot be used to test WebMCP. Test in real
  Chrome 152 with `chrome://flags/#enable-webmcp-testing` = Enabled, or ChatGPT.app.

## API surface

Imperative — `document.modelContext`:

- `registerTool({name, description, inputSchema, execute, annotations}, {signal, exposedTo})`
- `getTools({fromOrigins})` → RegisteredTool[] (name, description, inputSchema, origin, window)
- `executeTool(tool, argsJsonString, {signal})`
- `toolchange` event on document.modelContext
- `execute(args, { signal })` — second arg carries the AbortSignal
- annotations: `readOnlyHint`, `untrustedContentHint`

Declarative — HTML form annotations:

- `toolname`, `tooldescription` on `<form>`; `toolparamdescription` on fields
- `toolautosubmit` to submit + navigate on invocation
- `SubmitEvent.agentInvoked` (boolean) and `SubmitEvent.respondWith(Promise)`
- window events `toolactivated` / `toolcancel`, both carrying `toolName`
- CSS pseudo-classes `:tool-form-active`, `:tool-submit-active`

Cross-origin: `allow="tools"` on the iframe (Permissions Policy, defaults to
`self`) PLUS `exposedTo: [origins]` on registerTool PLUS `fromOrigins: [origins]`
on getTools. All three are required for cross-origin tool federation.

Constraint: WebMCP is disabled in non-origin-isolated documents. A host sending
`Origin-Agent-Cluster: ?0` kills the API. Verify `window.originAgentCluster === true`
on the DEPLOYED url, not just localhost.

## Character budgets (from the security guide)

- 500 chars per tool description
- 150 chars per parameter description
- 30 chars per tool name and per parameter name
- 1.5K chars per individual tool output

## Best-practice rules worth following visibly

- One function per tool; no overlapping tools.
- Register/unregister tools by page state; static registration is the default.
- Name tools so execution vs. initiation is unambiguous (`create-event` vs
  `start-event-creation-process`).
- Positive descriptions ("this tool can X"), never negative ("don't use for Y").
- Accept raw user input; don't make the model do math or string transforms.
- Validate strictly in code, loosely in schema; return descriptive errors so the
  model can self-correct and retry.
- Update UI state after the function completes — agents read the UI to plan.

## Evals format (Chrome's experimental eval tooling)

```json
{
  "messages": [{ "role": "user", "content": "I'd like a small pizza." }],
  "expectedCall": [
    { "functionName": "set_pizza_size", "arguments": { "size": "Small" } }
  ]
}
```

Supports nested `ordered` / `unordered` blocks for multi-tool journeys.
Failure modes to test: wrong tool, wrong order, wrong arguments, wrong output,
mid-chain failure (a step fails but the chain completes anyway).

## Prior art — what already exists (do NOT rebuild these)

OpenAI Showcase (10 apps): Codex Modeling Studio (3D modeling), Margin Editor
(notes), Crossword Desk, Fieldwork//12 (music sequencing), WanderNote (trip
itinerary), Webroom (photo editing), Sunday Table (meal planning), Cubecade (3D
puzzle), Paperie (greeting cards), Verdant Market (groceries/cart).

Chrome demo repo: analytics-dashboard, coffee-shop, doors, explainer,
french-bistro, hotel-chain, leather-bag, order-tracking, page-agent, pizza-maker,
react-flightsearch, real-estate-map, shared, smart-home, sport-shop-angular,
ticket-booking, webmcp-maze.

Shopify ships WebMCP tools FREE on every Liquid storefront and Hydrogen preview:
search_catalog, browse_store, get_product, show_variant, get_cart, update_cart,
cancel_cart, proceed_to_checkout, manage_orders, search_shop_policies_and_faqs.
=> Any e-commerce/cart idea competes against a zero-effort baseline built by a judge.

Cloudflare ships a no-code edge injection (HTMLRewriter adds a bridge script)
that gives any site tool packs without touching the origin.
=> "Add WebMCP to an existing site" is also a solved, commoditized idea.

## Spec goals (the language judges think in)

- Enable human-in-the-loop workflows (visibility, history, control)
- Simplify AI agent integration (vs brittle DOM scraping)
- Prevent web content disintermediation (front-ends adapted, not replaced)
- Code reuse (turn existing client-side code into tools)
- **Improve accessibility through agents** (spec goal, Issue #91) — absent from
  every showcase app. This is a genuine gap.

Explicit non-goals: headless scenarios, fully autonomous workflows, replacing
backend MCP, replacing human interfaces.

## Spec open questions (where ambition lives)

Multimodal tool I/O (#41/#86/#81) · cross-document tool response on navigation
(#135) · `native-agent` exposure keyword · streaming tool I/O (#82) · native
schema validation (#92) · **Skills integration — higher-level skills coordinating
multiple tools (#161)** · output schema (#9) · **user prompting/elicitation,
`requestUserInteraction()` (#165, #50)** · tool progress reporting ·
service-worker WebMCP for sites the user doesn't have open.

## Key URLs

Spec: https://github.com/webmachinelearning/webmcp
Chrome docs: https://developer.chrome.com/docs/ai/webmcp
/imperative-api · /declarative-api · /secure-tools · /best-practices · /evals
DevTools: https://developer.chrome.com/docs/devtools/application/webmcp
Types: npm `webmcp-types` · React hook: npm `use-webmcp-tool` (Apache-2.0, by Chrome)
Showcase: https://developers.openai.com/showcase?view=webmcp-apps
Demos: https://github.com/GoogleChromeLabs/webmcp-tools/tree/main/demos
Inspector extension: "Model Context Tool Inspector" (manual tool calls + schema check)

## Credits status

- Netlify 3,000 credits — form closed Sep 1, 12:00 PT.
- Render $50 — https://credits-portal-mmdm.onrender.com/claim/openai-hackathon (500 claims)
- Vercel $30 — https://credits.vercel.sh/redeem code OAIWEBMH-9E2F-MUT4 (first 1000)

---

# Addendum — verified 2026-09-01 (spec repo, published spec, research pass)

## CORRECTIONS to the notes above

1. **Issue #91 is CLOSED, and argues the OPPOSITE of what this brief first said.**
   #91 "Redundancy with the accessibility tree" argues WebMCP is redundant with the
   a11y tree and should not exist as a parallel system (29 comments). The WG closed
   it; #277 states "#91 settled that question" — the layers are separate. Do NOT
   frame our work as "WebMCP replaces/duplicates assistive tech." That is the losing
   side of a settled question, argued in front of the people who settled it.

2. **`requestUserInteraction()` DOES NOT EXIST in the published spec.**
   Searched the full spec text (67,614 chars) at
   https://webmachinelearning.github.io/webmcp/ — zero occurrences of
   requestUserInteraction, ModelContextClient, elicit, outputSchema, progress.
   Issue #165 links to a DEAD anchor for it. Elicitation is aspirational.
   => We cannot USE elicitation. We implement the pattern in USERLAND and document
   the missing primitive. That is the submission's thesis, not a workaround.

3. **Declarative API is NOT usable if judges test in ChatGPT.**
   learn.chatgpt.com/docs/webmcp: ChatGPT's in-app browser does not support the
   declarative (HTML attribute) API, and does not support iframe-registered tools.
   Chrome supports both. SAFE INTERSECTION = imperative API only, top-level page only.
   This overrides any "use both APIs to show thoroughness" instinct.

4. **Chrome API surface is NOT stable 149–153.** The getter moved from
   `navigator.modelContext` to `document.modelContext` (~2026-05-27). Chrome 150
   deprecated `navigator.` but kept it as a working alias, to be removed.
   Most tutorials/older training data show `navigator.`.
   ALWAYS: `const mc = document.modelContext ?? navigator.modelContext;`

5. **Origin trial vs flag.** The Official Rules instruct judges to enable
   `chrome://flags/#enable-webmcp-testing` on Chrome 149+, or use ChatGPT's in-app
   browser. So a token is NOT required for judging. A token would additionally serve
   flagless visitors; register one if quick, but NEVER depend on it. Note tokens are
   origin-bound: a *.vercel.app preview URL is a different origin from production.

## Normative spec constraints (from index.bs / published spec)

- Tool name: length 1–128, ASCII alphanumeric + `_` + `-` + `.` ONLY.
  (Chrome's "30 chars" is a soft budget for agent comprehension, not the spec limit.)
- The spec's own intro names **assistive technologies** as tool invokers, alongside
  agents and browser agents. Strongest warrant for the accessibility framing.
- Event spelling differs: spec says `toolcanceled` (one L), Chrome docs say
  `toolcancel`. Issue #146 open. LISTEN FOR BOTH.
- `toolchange` timing vs other task sources is explicitly NON-DETERMINISTIC.
- Unregister-then-quick-reregister with a changed schema is an UNPROTECTED RACE:
  old inputArguments can be applied to the new schema. Do not re-register per step.
- `registerTool()` returns a Promise that REJECTS on duplicate/empty name, empty
  description, non-function execute, or non-serializable inputSchema. Unawaited =
  unhandled rejection + tool silently absent. ALWAYS await + .catch().
- Prefer `registerTool()` over `provideContext()` (#101, closed via PR #132:
  provideContext cleared existing tools, letting third-party scripts clobber yours).

## ChatGPT in-app browser specifics (learn.chatgpt.com/docs/webmcp)

- Model-gated: GPT-5.6 Sol / Terra support site tools; **Luna has WebMCP disabled**.
  Undetectable from the page.
- Discovery is manual — the user clicks "Site tools" in the address bar.
- Each invocation gets a safety review; consequential actions get extra confirmation.
- Users can disable site tools entirely (Settings → Browser → Permissions), so a
  correct implementation can still appear dead.

## Architecture consequences (multi-sourced)

- **ONE DOCUMENT, NO ROUTE-PER-STEP.** Judge Sarah Drasner's issue #255 documents
  agents failing to re-find tools after a navigation or server roundtrip, with a
  demo repo (sdras/webmcp-server-interaction-demo). Corroborated by the React hook's
  unmount-unregisters behaviour. An 8-step form MUST be a single document with
  stable, once-registered tools.
- **Never unregister to signal unavailability** (#262): the agent only sees the tool
  vanish and cannot tell missing-permission from outage. Keep it registered; return
  a descriptive error from execute().
- **use-webmcp-tool unmounts = unregisters.** Register in a persistent client layout,
  not a page component. Hoist `execute` with useCallback to avoid re-registration
  churn (internals unverified — read node_modules after install).
- **5–12 sharply described tools beat 30.** No hard cap found, but large flat tool
  lists degrade model selection accuracy (the problem #255 exists to solve).
- `executeTool()` takes JSON-ENCODED ARGUMENT TEXT, not a JS object (#278, open).
  `inputSchema` may come back as a serialized string.

## Live W3C context (why this topic is hot right now)

- 2026-08-20 WG resolution: initiate wide review with the i18n and a11y groups.
- #272 FAST accessibility self-review checklist — OPEN, blank, seeking input.
- #277 "Define accessibility requirements for WebMCP user-agent UI" — filed days ago.
  Requirement 2 = inspect tool/origin/arguments/consequence before a consequential
  action commits, then approve or reject, citing **WCAG 2.2 error-prevention for
  legal/financial data**. That is our submit flow, verbatim.
  Requirement 5 = users must be able to tell WHICH VALUES AN AGENT SUPPLIED, without
  visual comparison — an explicitly OPEN layering question. That is our differentiator.
  Requirement 4 = status/progress/failure/cancellation/undo perceivable WITHOUT
  relying only on colour, animation, or visual focus.
  The issue explicitly notes `toolautosubmit` SKIPS the review state, and that author
  styling + script events "are not a substitute" for real mediation.
- #255 (by sdras — a hackathon JUDGE): tool collections / progressive disclosure.
- The spec's Accessibility considerations section is currently EMPTY.
