# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build step required. Open `index.html` directly in a browser:

```bash
open index.html
```

Or serve locally to avoid any browser file:// restrictions:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

There are no dependencies, no package.json, no transpilation.

## Architecture

**Pure vanilla JS — no modules, no bundler.** All files are loaded as classic scripts via `<script src="...">` tags in `index.html`. Globals are shared freely across files. Load order matters and is fixed in `index.html`:

```
input.js → audio.js → level.js → player.js → renderer.js → main.js
```

### Data flow

`main.js` owns the game loop (`requestAnimationFrame`) and state machine (`MENU → PLAYING → LEVEL_COMPLETE / GAME_OVER`). Each frame:

1. `Input` (input.js) — reads keyboard/touch state (polling, not event-driven)
2. `Level.updateMovingPlatforms` / `Level.updateEnemies` — mutate level state in-place
3. `Player.update(player, level, Input)` — applies physics, AABB tile collision, then resolves moving platform overlap
4. `Player.checkCollectibles` / `Player.checkEnemies` — returns deltas; main.js applies them to `lives`/`score`
5. Camera smoothly tracks player (lerp factor 0.12)
6. `Renderer.*` calls draw everything onto the canvas

### Key conventions

- **Tile IDs:** 0=air, 1=grass-top, 2=stone, 3=wood-passthrough, 4=snow, 5=ice (slippery). `Level.isSolid()`, `isPassthrough()`, `isIce()` are the canonical checks.
- **Passthrough platforms** (type 3) only block downward movement — upward movement passes through. Ice tiles (type 5) set `player.onIce = true` which raises friction to 0.96 and reduces acceleration.
- **AABB collision** is axis-separated: X resolved first, then Y. Three sample points per axis edge prevent corner-clipping.
- **Coyote time** (8 frames) and **jump buffering** (8 frames) are tracked on the player object.
- **Moving platforms** are stored in `level.movingPlatforms[]` — not in the tilemap. Collision with them is checked separately after tile resolution.
- **Audio** uses Web Audio API only — no audio files. `Audio.startMusic()` triggers the Oompah loop scheduler; it must be called after a user gesture (browser autoplay policy). `Audio.resume()` is called on every click/touchend in `main.js`.
- **Levels** are defined as 2D arrays in `level.js`. `Level.load(index)` returns a fresh level object with cloned collectibles/enemies so the arrays can be mutated during play.
- All drawing is pure Canvas 2D paths — no images, no sprites. `Renderer` functions take screen-space coordinates (already offset by camX/camY).
