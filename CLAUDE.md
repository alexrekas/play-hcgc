# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project intent

Play HCGC simulates a full 18-hole round at Herndon Centennial Golf Course. Users tap on per-hole SVG diagrams to aim and record shots; the engine computes strokes-gained per shot and a WHS handicap index across rounds. See `SETUP.md` for Firebase + local-dev setup.

## Commands

```bash
npm run dev      # next dev — http://localhost:3000
npm run build    # next build
npm run lint     # eslint
npx tsc --noEmit # type-check only; run before pushing
```

There are no tests in this codebase. Verify changes by running `tsc --noEmit` and exercising the affected flow in `npm run dev`.

## Architecture

### State, top to bottom

1. **Auth** (`lib/authContext.tsx`) — wraps Firebase Auth's `onAuthStateChanged`. Provides `{ user, loading }`. Guest mode (no `user`) is a first-class path; only signed-in users persist rounds.
2. **Profile** (`lib/profileContext.tsx`) — hydrates a `UserProfile` doc from Firestore for signed-in users, backfilling missing `bag`/`dexterity` fields on read. For guests, exposes a `gender` default of `"male"` (used only for club-yardage averages — not stored).
3. **Game** (`store/gameStore.ts`) — Zustand store persisted to `localStorage` under the key `hcgc-game`. Holds the active `Round` (18 `HoleScore` entries, each with `shots: ShotResult[]`). Survives reload and back/forward; only cleared by `resetGame()` or starting a new round.
4. **Theme** (`lib/themeContext.tsx`) — light/dark via a class on `<html>`, persisted under `hcgc-theme`. CSS variables defined in `app/globals.css`; Tailwind utility classes like `bg-card`/`text-app`/`text-muted` map to those variables (see `globals.css` for the full token list).

### The two-step shot flow

`app/hole/[n]/page.tsx` drives gameplay. The state machine has four modes (`mode`): `input`, `pending`, `putts`, `completed`.

1. **input** — `HoleDiagram` is interactive. Single tap sets `target` (aim point); the page computes live `targetDist`/`aimAngleDeg` via `targetToShot()` — the inverse of `shotEngine.computeNewPosition()`. The relationship is exact: tapping at `(x, y)` and then finalizing produces a recorded ball position at the same `(x, y)`.
2. **Hit Shot** → enters **pending**, defaulting `landing := target`. Map taps now move `landing` (not `target`); aim line dims, landing marker shows in solid orange.
3. **Lie picker** — player chooses the result lie (Fairway, Rough, …). `finalizeShot()` recomputes aim+distance from `currentPos → landing` (so the player's re-tap wins) and calls `buildShotResult()` → `addShot()`.
4. **putts** — appears only when `currentLie === "green"`. Recording putts completes the hole.

`HoleDiagram` is **controlled** for aim — parent owns `target`/`landing` and routes touches via `onTargetChange`. The diagram itself owns zoom state (`scale`, `center`) and exposes pinch-to-zoom + a 3-button stack (in / out / reset). Coordinates use `svg.getScreenCTM().inverse()` so taps remain accurate at any zoom.

### Coordinate conventions

There are three coordinate systems and getting them mixed up will produce wrong shot positions.

| Space | x range | y range | Notes |
|---|---|---|---|
| Engine normalized | 0..1 | 0..1, **0 = tee, 1 = green** | Used in `ShotResult.posX/posY`, `HoleSvgLayout.tee/green`, and all `target`/`landing` props |
| SVG canvas | 0..240 | 0..480, **0 = top (green), 480 = bottom (tee)** | Inverted y vs. engine; conversion is `sy = (1 - y) * CANVAS_H` |
| Screen pixels | viewport-relative | viewport-relative | Map via `svg.getScreenCTM().inverse()` — handles zoom/letterbox transparently |

`shotEngine.computeNewPosition()` projects with `canvasAspect = 2.5` (yards forward per unit lateral). This is a heuristic; lateral taps far from the centerline produce inflated distances. Not a bug — a pre-existing approximation; only worth touching if you also have actual per-hole tee→green dimensions.

### Per-hole artwork

`public/hole-layouts/hole1.svg` … `hole18.svg`. Each is registered in `data/holeSvgLayouts.ts` with normalized `tee` and `green` coords. `HoleDiagram` embeds the SVG as an `<image>` and positions the ball + shot trail using those coords. The `scripts/extract-hole-layouts.mjs` script regenerates the registry by parsing the SVGs for blue tee markers (`#06c`) and the red flag (`#ec1c24`) — re-run it whenever the artwork is refreshed.

### Persistence layout

Three Firestore collections, all gated by `firestore.rules` to the owning user:

- `users/{uid}` — `UserProfile` (display name, gender, dexterity, bag, per-club averages)
- `rounds/{roundId}` — `Round` (completed rounds; `completed: false` rounds live only in the Zustand store)
- `handicaps/{uid}` — `HandicapRecord` (rounds copy + computed index; rewritten by `refreshHandicap()` after every saved round)

Querying `rounds` requires the composite index in `firestore.indexes.json` (userId ASC + completed ASC + date DESC). The Firebase client uses `initializeFirestore(..., { ignoreUndefinedProperties: true })` (see `lib/firebase.ts`) because optional fields on `Round`/`ShotResult` would otherwise crash `setDoc`.

### Strokes gained & handicap

- `lib/strokesGained.ts` — Mark Broadie-style expected-strokes baseline tables for tee/fairway/rough/sand/recovery/green, piecewise-linear interpolation, on-green table is in **feet** (not yards).
- `lib/handicap.ts` — World Handicap System (WHS). Needs ≥3 completed rounds; uses best-N differentials by total-round count, then 0.96× factor. `differential = (gross - rating) * 113 / slope`.

### Course data

`data/course.ts` is the single source of truth for hole pars, yardages, ratings, slopes. Tee names: `"diamond" | "black" | "blue" | "white"` (red tees were removed — don't reintroduce them anywhere). All UI tee pickers iterate over `TEE_NAMES` arrays that must stay in sync with `TeeName`.

## Things easy to get wrong

- **Don't put `bg-card` or other overlay backgrounds at partial opacity** when they sit over the hole SVG — the SVG's hard-coded `#e5e7eb` background bleeds through and kills contrast in dark mode. Use solid `bg-card` + `border-2 border-app`.
- **Don't add fields to `Round`/`ShotResult` without considering `ignoreUndefinedProperties`** — the Firestore client tolerates `undefined`, but only because `initializeFirestore` is configured that way. If you switch to plain `getFirestore`, undefined fields will throw.
- **Don't break the `targetToShot` ↔ `computeNewPosition` round-trip.** Both must use the same `canvasAspect` (currently 2.5) or the recorded ball position will drift from where the player tapped.
- **Don't auto-load gender for guests.** The guest landing path skips the gender picker — gender is only collected during signup. `profileContext` defaults guests to `"male"` for club-average math.
- The Claude Code preview workflow (`.claude/launch.json` + `mcp__Claude_Preview__*` tools) uses `cmd /c "cd /d C:\Users\aprek\hcgc-app && npm run dev"` because the harness cwd is the parent `PlayHCGC/`. Don't change that unless you also move launch.json.
