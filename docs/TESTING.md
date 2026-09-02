# Testing

```bash
npm ci            # reproducible install
npm run check     # format, lint, typecheck, tests
npm run ci        # check + coverage + production build (what CI runs)
npm run test:watch
```

## What is automated

**Unit and component tests** (vitest, jsdom, Testing Library):

- **Claim store**: provenance, per-field revisions, conflict rules (an agent
  never overwrites a person's value or a field being edited), validation
  errors the agent can act on, the review state machine (any change
  invalidates a staged review; approval is impossible with unreviewed agent
  entries or an unticked declaration), hydration.
- **Stale-closure guard**: a callback created once must see writes made many
  updates later. This is the test that protects the "tools read the store at
  call time" rule.
- **Registration manager**: registers once, reports a rejected registration
  as a visible degraded state, never unregisters, shares one in-flight
  registration between concurrent callers.
- **The seven tools**: error envelope on every failure, output cap, exactly
  seven names and no commit tool, read-only and untrusted-content annotations.
- **WebMCP fake**: `test/mock-model-context.ts` enforces the browser
  contracts real code gets wrong: `registerTool` rejects duplicate or invalid
  names, `executeTool` takes a JSON string, cancellation fires the signal and
  both `toolcancel` and `toolcanceled` event spellings.
- **Accessibility**: axe runs inside component tests; zero violations is a
  failing condition.
- **Eval fixtures**: `evals/*.eval.json` (direct, ambiguous, and mid-chain
  prompts) are validated by a test: every expected call must name a real tool
  and only its declared arguments.

Coverage is reported in CI with a 70% floor on `lib/` as a regression
trip-wire. The quality claim is the named assertions above, not the number.

**CI** (`.github/workflows/ci.yml`, `gitleaks.yml`): the same `npm run ci` a
developer runs locally, plus secret scanning. Actions are pinned to commit
SHAs; the token has read-only permissions.

## What is manual, and why

Continuous-integration browsers do not expose `document.modelContext`, so the
agent loop itself is verified by hand on the deployed site:

| Check                                                                                                                                                  | Where                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Origin isolation and API presence on the live origin                                                                                                   | Chrome 149+ with `chrome://flags/#enable-webmcp-testing` |
| Tool registration succeeds (status turns green)                                                                                                        | same                                                     |
| Golden path: explain → fill → conflict → review → approve                                                                                              | Chrome + flag, and the ChatGPT desktop browser           |
| Keyboard-only walk-through and one screen reader                                                                                                       | same                                                     |
| Layout at 320px wide and at 200% zoom: no page-level horizontal scroll, section nav is one horizontally scrollable row, review queue as a bottom sheet | any browser, device toolbar or zoom                      |

jsdom checks ARIA wiring (roles, names, `aria-describedby`, live-region text)
but cannot verify real announcement timing, focus order under CSS, or colour
contrast. Those are covered by the manual pass.
