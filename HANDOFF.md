# Lanternfall handoff

## User's agreed brief

Create a new mobile-friendly fantasy roguelike, separate from black-tide. Use a JRPG influence with a slime and mimic, a dark edge without being too dark, four floors and one boss. Classic turn-based click/tap movement, attacks and a Wait button. Include equipment, potions, scrolls, status effects and XP. It should also play on a modern MacBook. User delegated the art direction and name and authorized committing to personal GitHub for Vercel hosting.

## Current state

The full game is implemented in this checkout. It is a dependency-free static JavaScript application with original raster artwork, procedural canvas environments, responsive DOM controls, autosave and offline support. See README for controls, structure and verification.

The existing Sites project identity is in `.openai/hosting.json`. Reuse it; do not initialize a replacement Site. Source is committed to the Site's own Git remote when publishing. Keep `dist` tracked because it contains the authored source.

## GitHub and hosting

The user created `peteroomen/lanternfall` as a public repository, and the connected GitHub app has write access. The game source, PNG/WebP artwork, tests, CI workflow and Vercel configuration belong in that repository. Repository URL: https://github.com/peteroomen/lanternfall

The playable private publication is https://lanternfall.petertheoomen.chatgpt.site. The local `origin` remote is the separate Sites source repository. The `github` remote identifies the user's personal repository; the connector can publish commits and binary blobs there without local GitHub CLI authentication. Do not modify black-tide.

The user explicitly approved deploying `main` as a public Vercel website. On 2026-09-06, the connected Vercel app created production deployment `dpl_wvusGJQLd6DKSSHUyaKCwNhgrMU3` from GitHub commit `7df16c44e6481658fcb7c88112f32a236a528784` (tree `746b8931193dd0a9f70ede9d635260d9361cee01`). All 28 source files were uploaded directly; automatic GitHub deployments are not linked.

- Production alias: https://lanternfall-peter-oomens-projects.vercel.app
- Immutable deployment: https://lanternfall-2e9k7iv12-peter-oomens-projects.vercel.app
- Build inspector: https://vercel.com/peter-oomens-projects/lanternfall/wvusGJQLd6DKSSHUyaKCwNhgrMU3
- Team: `peter-oomens-projects`, ID `team_ekatETkUxbs77AUhHpmffXEP`.
- Last observed Vercel status: `INITIALIZING`. Final build readiness and public loading remain unverified. The connected app returns HTTP 403 when inspecting this team and lists no accessible teams. Public fetch checks also failed in this environment. Reauthorize the Vercel connection for this team to inspect the existing deployment; do not create a duplicate simply to check status.
- Release CI passed: https://github.com/peteroomen/lanternfall/actions/runs/34006489521

The uploader enforces a 3 MiB per-file and 4 MiB total encoded-data limit. The title is full-resolution near-lossless WebP (quality 99), with a measured maximum color-channel difference of 1/255 from the original; original PNG artwork remains in Git history. The 28-file payload fits at approximately 3.99 MiB encoded.

## Validation and follow-up

- `node scripts/check.mjs` validates JavaScript syntax and assets.
- `node --test tests/*.test.mjs` passes 27 tests, including 800 procedural maps and complete runs.
- `node scripts/simulate.mjs 50` finishes all 100 runs: careful 50 wins, reckless 26 wins/24 deaths.
- Recent fixes: reciprocal line of sight, wall-aware enemy routes, safe exploration paths, trap placement away from room entrances, an enemy recovery turn, save validation, readable UI text, pointer cancellation and install icons.
- Real browser/device QA remains outstanding. Do not describe unit/harness tests as browser or physical-device testing. Prioritize touch selection, short screens, the backpack, first install/offline reload, interrupted save/resume, audio and an entire boss run when browser/device testing is available and requested.

Balance is deliberately approachable for a four-floor first release. The simulation player uses repeatable game actions with no modified HP, equipment or vision. The careful player's performance is not a promised human win rate.
