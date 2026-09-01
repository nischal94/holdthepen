# Reviewable Actions

An agent-mediation layer for consequential forms, built on
[WebMCP](https://webmachinelearning.github.io/webmcp/) for the WebMCP
Challenge. An AI agent can read, explain, and fill a benefits-style claim
while the person keeps every decision: agent-supplied values stay attributed
and reviewable, and no WebMCP tool can commit the claim.

**Status: deploy-verification build.** The live page is a WebMCP preflight
that checks origin isolation, API presence, and tool registration, and
registers one demonstration tool. The full claim form ships next.

## Test in 2 minutes

1. Chrome 149+: enable `chrome://flags/#enable-webmcp-testing` and relaunch —
   or open the URL in the ChatGPT desktop app's browser (site tools on
   GPT-5.6 Sol/Terra).
2. Open the deployed URL. The status banner turns green when WebMCP is live.
3. Ask your agent: *"What does the demo status tool on this page say?"*

## Develop

```bash
npm install
npm run dev
```

License: MIT.
