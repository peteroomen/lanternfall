# Lanternfall

A four-floor, turn-based fantasy roguelike for phones and desktop browsers. Carry a lantern through a ruined kingdom, collect better equipment, and recover the stolen dawn from the Lantern Warden.

## Play

[Play Lanternfall](https://lanternfall-eta.vercel.app/)

- Tap or click explored ground to move. Tap an adjacent enemy to attack.
- Wait advances one turn. Nothing happens while you think or browse your pack.
- Red tiles warn where an attack will land. Dodge, then attack during the enemy's recovery.
- Open chests for weapons, armour and consumables. Some chests bite.
- Each level grants a choice of permanent attack, defence or health for that run.
- Find the stairs on floors one through three. Defeat the Warden on floor four, then activate the beacon.
- Your current run saves on the same device and browser after each action. Death ends that run.

Keyboard: WASD or arrows to move; Q/R/Z/C for diagonals; Space or period to wait; E to explore; B for inventory; M for map; 1 to heal; Escape to pause. Browser shortcuts retain their usual behavior.

## Included

- Four seeded procedural floors, each with nine connected rooms and optional loops.
- Seven enemy types: slime, duskwing, sporekin, hollow knight, wisp, mimic and boss.
- A two-phase boss with marked cross/ring attacks and summoned slimes.
- Weapons, armour, healing and status potions, offensive/escape scrolls, and food.
- Poison, burning, slow, freeze, courage and ward effects.
- XP, level-up choices, treasure, traps, moonwells, fog of war and a bestiary.
- Tap-to-travel and automatic exploration that stop when danger appears.
- Original generated character/treasure artwork and title illustration; procedural canvas terrain, lighting, particles and effects.
- Optional synthesized audio, reduced-motion support, responsive layout and PWA install metadata.
- Device-local autosave, seeded replay and a service worker for offline files after a successful first download.

## Run locally

Requires Node.js 22 or newer. There are no npm dependencies and no API keys.

```sh
npm run dev
npm run build
npm test
npm run test:balance -- 50
```

The development server defaults to port 4173. Open its localhost URL in a browser. Add `?seed=37` to reproduce a dungeon; integer seeds from 0 to 4294967295 are accepted. Serving over HTTPS or localhost is necessary for service-worker support. Do not open the HTML directly with `file://`.

## Deploy on Vercel

The production deployment is live and verified on 2026-09-06: [play](https://lanternfall-eta.vercel.app/) · [build inspector](https://vercel.com/peter-oomens-projects/lanternfall/wvusGJQLd6DKSSHUyaKCwNhgrMU3). Vercel reports `READY`, and the public page loads without a Vercel login. The uploaded source is commit `7df16c44e6481658fcb7c88112f32a236a528784`, whose GitHub checks passed.

This first release was uploaded directly. Automatic deployment on GitHub pushes requires connecting `peteroomen/lanternfall` to the existing Vercel project. Use **Other** as the framework. The included `vercel.json` sets `npm run build` and the `dist` output directory. There are no runtime services, environment variables, database migrations or server functions to provision. Deploy from the repository root.

The `dist` directory is the authored application source and must remain tracked. It is not disposable generated output. `.openai/hosting.json` retains the identity of its private Sites publication; Vercel does not use it.

## Structure

| Path | Responsibility |
| --- | --- |
| `dist/game/engine.js` | Deterministic state, generation, turn resolution, enemy AI, pathfinding and save validation |
| `dist/game/catalog.js` | Floors, enemy definitions, items, statuses and level choices |
| `dist/game/app.js` | DOM interface, input, automatic movement, menus and local saves |
| `dist/game/renderer.js` | Canvas drawing, camera, sprite atlas, effects and pointer coordinates |
| `dist/game/audio.js` | Optional Web Audio sound effects |
| `dist/style.css` | Phone/desktop layout and visual styling |
| `dist/sw.js` | Offline asset installation and retrieval |
| `tests/` | Game-rule, generation, full-run, save/resume and offline-file tests |
| `scripts/simulate.mjs` | Repeatable players that use normal game actions without extra resources |

Save format: `lanternfall.run.v1` in localStorage. Runs remain tied to a browser origin; a Sites run will not automatically transfer to Vercel. Invalid or incompatible saves are rejected without preventing a fresh run.

## Verification

The current automated suite contains 27 passing tests. It covers 200 seeds across all four floors (800 generated maps), reciprocal visibility, reachable exits, collision-free spawns, combat timing, status effects, mimics, equipment, level choices, death/victory, deterministic continuation, corrupt saves, import/asset references and offline navigation.

The final 100-run batch on seeds 0–49 produced:

| Player | Wins | Deaths | Unfinished | Mean turns |
| --- | ---: | ---: | ---: | ---: |
| Careful: equipment, supplies, dodging | 50 | 0 | 0 | 627 |
| Reckless: ignores equipment, supplies and warnings | 26 | 24 | 0 | 553 |

These are deterministic automated-player results, not estimates of human difficulty. A production Chrome browser smoke check on 2026-09-06 verified title/dungeon artwork, starting a run, Wait, keyboard movement, the backpack, click-to-move and save/resume after reload. No game-origin console errors appeared during that check.

Physical phone/Mac testing, touch interaction, screen-reader behavior, audio, installation and a complete browser playthrough remain unverified. The offline tests exercise the service-worker code in a JavaScript harness, rather than an actual browser cache.

There is no account, multiplayer, cloud save, shop or permanent progression between runs. Gold is a run score. Additional floors, classes and content can build on the existing engine.
