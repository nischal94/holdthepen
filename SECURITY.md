# Security

Hold the Pen is a hackathon prototype. It runs entirely in the browser: no
backend, no database, no authentication, no runtime secrets. Claim data lives
in memory and, only if the person opts in, in `sessionStorage` on their own
device.

## Reporting

Use GitHub's private vulnerability reporting on this repository. Please do not
open public issues for security reports.

## Scope notes

- The WebMCP tool surface deliberately exposes no operation that commits a
  claim. This constrains the declared interface; it is not a proof of human
  presence, and an agent using generic browser automation could still activate
  the visible submit control. See the README's spec-feedback section.
- Tool outputs that echo user or agent text set `untrustedContentHint: true`.
  Defenses inside the agent (prompt injection) are the agent's responsibility.
