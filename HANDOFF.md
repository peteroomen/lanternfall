# Lanternfall handoff

## User's agreed brief

Create a new mobile-friendly fantasy roguelike, separate from black-tide. Use a JRPG influence with a slime and mimic, a dark edge without being too dark, four floors and one boss. Classic turn-based click/tap movement, attacks and a Wait button. Include equipment, potions, scrolls, status effects and XP. It should also play on a modern MacBook. User delegated the art direction and name and authorized committing to personal GitHub for Vercel hosting.

## Current state

The full game is implemented in this checkout. It is a dependency-free static JavaScript application with original raster artwork, procedural canvas environments, responsive DOM controls, autosave and offline support. See README for controls, structure and verification.

The existing Sites project identity is in `.openai/hosting.json`. Reuse it; do not initialize a replacement Site. Source is committed to the Site's own Git remote when publishing. Keep `dist` tracked because it contains the authored source.

## GitHub and hosting

The user created `peteroomen/lanternfall` as a public repository, and the connected GitHub app has write access. The game source, PNG artwork, tests, CI workflow and Vercel configuration belong in that repository. Repository URL: https://github.com/peteroomen/lanternfall

The playable private publication is https://lanternfall.petertheoomen.chatgpt.site. The local `origin` remote is the separate Sites source repository. The `github` remote identifies the user's personal repository; the connector can publish commits and binary blobs there without local GitHub CLI authentication. Do not modify black-tide.

Vercel configuration is committed and ready for importing the repository. No Vercel publication has been performed through this session's tools.

## Validation and follow-up

- `node scripts/check.mjs` validates JavaScript syntax and assets.
- `node --test tests/*.test.mjs` passes 27 tests, including 800 procedural maps and complete runs.
- `node scripts/simulate.mjs 50` finishes all 100 runs: careful 50 wins, reckless 26 wins/24 deaths.
- Recent fixes: reciprocal line of sight, wall-aware enemy routes, safe exploration paths, trap placement away from room entrances, an enemy recovery turn, save validation, readable UI text, pointer cancellation and install icons.
- Real browser/device QA remains outstanding. Do not describe unit/harness tests as browser or physical-device testing. Prioritize touch selection, short screens, the backpack, first install/offline reload, interrupted save/resume, audio and an entire boss run when browser/device testing is available and requested.

Balance is deliberately approachable for a four-floor first release. The simulation player uses repeatable game actions with no modified HP, equipment or vision. The careful player's performance is not a promised human win rate.
