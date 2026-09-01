# Repository settings checklist

GitHub-side settings that cannot live in the repo. Tick when done.

## At repo creation (hour 0)

- [ ] Repository is **public**; MIT `LICENSE` detected in the About box.
- [ ] Settings → Code security: **Secret scanning** ON, **Push protection** ON.
- [ ] Settings → Code security: **Private vulnerability reporting** ON.
- [ ] Settings → Code security: **Dependabot alerts** ON; **Dependabot security updates OFF** (no automatic PRs — see freeze below).
- [ ] Settings → General: **Automatically delete head branches** ON.
- [ ] No `dependabot.yml` in the repo (deliberate: no version-update PRs).

## At hour ~30 (golden path working)

- [ ] Branch protection on `main`: require status check `ci`; allow the repo
      owner to bypass (solo sprint); do NOT require PR reviews (solo owner
      cannot approve their own PR).

## Judging freeze (after 2026-09-03 13:00 PT until winners announced)

Devpost forbids edits to the submission, repo, and live site during judging.

- [ ] Confirm Dependabot security updates are OFF (no PRs can open).
- [ ] Do not merge, push, or redeploy. Fork to keep building.
- [ ] Vercel: no new production deployments.
