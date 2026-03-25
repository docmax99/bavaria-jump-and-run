// Player — physics, jump, collision
const Player = (() => {
  const W = 24, H = 32;
  const JUMP_FORCE   = -11;
  const MOVE_SPEED   = 3.5;
  const COYOTE_TIME  = 8;  // frames of grace after leaving edge
  const JUMP_BUFFER  = 8;  // frames to buffer a jump press

  function create(x, y) {
    return {
      x, y, w: W, h: H,
      vx: 0, vy: 0,
      onGround: false,
      onIce: false,
      facing: 1,        // 1=right, -1=left
      coyoteFrames: 0,
      jumpBuffer: 0,
      wasJumping: false,
      frame: 0,         // animation frame counter
      animTimer: 0,
      invincible: 0,    // frames of invincibility after hit
      dead: false,
    };
  }

  function update(player, level, input, dt) {
    const { map, gravity } = level;
    const TS = TILE_SIZE;

    // ── Horizontal input ──────────────────────────────────────────────────
    const friction = player.onIce ? 0.96 : level.friction;
    const accel    = player.onIce ? 0.6  : 1.0;

    if (input.left())  { player.vx -= MOVE_SPEED * accel; player.facing = -1; }
    if (input.right()) { player.vx += MOVE_SPEED * accel; player.facing =  1; }

    // Clamp horizontal speed
    const maxVx = player.onIce ? 6 : MOVE_SPEED;
    player.vx = Math.max(-maxVx, Math.min(maxVx, player.vx));

    // Apply friction
    if (!input.left() && !input.right()) player.vx *= friction;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;

    // ── Jump buffer ───────────────────────────────────────────────────────
    if (input.jump()) {
      if (!player.wasJumping) player.jumpBuffer = JUMP_BUFFER;
    } else {
      player.wasJumping = false;
    }
    if (player.jumpBuffer > 0) player.jumpBuffer--;

    // Coyote time
    if (player.onGround) player.coyoteFrames = COYOTE_TIME;
    else if (player.coyoteFrames > 0) player.coyoteFrames--;

    // Execute jump
    if (player.jumpBuffer > 0 && player.coyoteFrames > 0) {
      player.vy = JUMP_FORCE;
      player.coyoteFrames = 0;
      player.jumpBuffer = 0;
      player.wasJumping = true;
      Audio.sfxJump();
    }

    // Variable jump height — release early = lower jump
    if (player.wasJumping && !input.jump() && player.vy < -4) {
      player.vy *= 0.75;
    }

    // ── Gravity ───────────────────────────────────────────────────────────
    player.vy += gravity;
    if (player.vy > 18) player.vy = 18; // terminal velocity

    // ── Move X then collide ───────────────────────────────────────────────
    player.x += player.vx;
    resolveX(player, map);

    // ── Move Y then collide ───────────────────────────────────────────────
    player.onGround = false;
    player.onIce    = false;
    player.y += player.vy;
    resolveY(player, map, level);

    // Moving platforms
    resolveMovingPlatforms(player, level);

    // ── World bounds ──────────────────────────────────────────────────────
    if (player.x < 0) { player.x = 0; player.vx = 0; }
    if (player.x + player.w > level.width) { player.x = level.width - player.w; player.vx = 0; }

    // Fell into pit?
    if (player.y > level.height + 64) player.dead = true;

    // Invincibility countdown
    if (player.invincible > 0) player.invincible--;

    // Animation
    player.animTimer++;
    if (Math.abs(player.vx) > 0.5 && player.onGround) {
      if (player.animTimer % 8 === 0) player.frame = (player.frame + 1) % 4;
    } else if (!player.onGround) {
      player.frame = 4; // jump frame
    } else {
      player.frame = 0;
    }
  }

  // ── AABB tile collision helpers ───────────────────────────────────────
  function tileAt(map, px, py) {
    const col = Math.floor(px / TILE_SIZE);
    const row = Math.floor(py / TILE_SIZE);
    return Level.getTile(map, row, col);
  }

  function resolveX(p, map) {
    const left  = p.x;
    const right = p.x + p.w - 1;
    const top   = p.y + 4;
    const bot   = p.y + p.h - 1;

    const rows = [top, (top + bot) / 2, bot];

    if (p.vx > 0) {
      for (const py of rows) {
        const t = tileAt(map, right, py);
        if (Level.isSolid(t)) {
          p.x = Math.floor(right / TILE_SIZE) * TILE_SIZE - p.w;
          p.vx = 0;
          break;
        }
      }
    } else if (p.vx < 0) {
      for (const py of rows) {
        const t = tileAt(map, left, py);
        if (Level.isSolid(t)) {
          p.x = (Math.floor(left / TILE_SIZE) + 1) * TILE_SIZE;
          p.vx = 0;
          break;
        }
      }
    }
  }

  function resolveY(p, map, level) {
    const left   = p.x + 2;
    const right  = p.x + p.w - 3;
    const top    = p.y;
    const bottom = p.y + p.h;

    const cols = [left, (left + right) / 2, right];

    if (p.vy > 0) {
      // Falling — check solid & passthrough
      for (const px of cols) {
        const t = tileAt(map, px, bottom);
        if (Level.isSolid(t) || Level.isPassthrough(t)) {
          p.y = Math.floor(bottom / TILE_SIZE) * TILE_SIZE - p.h;
          p.vy = 0;
          p.onGround = true;
          if (Level.isIce(t)) p.onIce = true;
          break;
        }
      }
      // Check ice separately for friction flag
      if (p.onGround && !p.onIce) {
        for (const px of cols) {
          const t = tileAt(map, px, bottom);
          if (Level.isIce(t)) { p.onIce = true; break; }
        }
      }
    } else if (p.vy < 0) {
      // Rising — only solid blocks stop upward movement
      for (const px of cols) {
        const t = tileAt(map, px, top);
        if (Level.isSolid(t)) {
          p.y = (Math.floor(top / TILE_SIZE) + 1) * TILE_SIZE;
          p.vy = 0;
          break;
        }
      }
    }
  }

  function resolveMovingPlatforms(p, level) {
    for (const mp of level.movingPlatforms) {
      const mpX = mp.x;
      const mpY = mp.y;
      const mpW = mp.w * TILE_SIZE;
      const mpH = TILE_SIZE / 2;

      const overlap =
        p.x < mpX + mpW &&
        p.x + p.w > mpX &&
        p.y + p.h > mpY &&
        p.y + p.h < mpY + mpH + 8 &&
        p.vy >= 0;

      if (overlap) {
        p.y = mpY - p.h;
        p.vy = 0;
        p.onGround = true;
        p.x += mp.speed * mp.dir;
      }
    }
  }

  // ── Collectible + enemy interaction ──────────────────────────────────
  function checkCollectibles(player, level) {
    let points = 0;
    let livesGained = 0;
    level.collectibles.forEach(c => {
      if (c.collected) return;
      const dx = (player.x + player.w/2) - c.x;
      const dy = (player.y + player.h/2) - c.y;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        c.collected = true;
        if (c.type === 'pretzel') { points += 10; Audio.sfxCoin(); }
        else { livesGained++; Audio.sfxCoin(); }
      }
    });
    return { points, livesGained };
  }

  function checkEnemies(player, level) {
    if (player.invincible > 0) return { hit: false, killed: 0 };
    let killed = 0;
    let hit = false;

    level.enemies.forEach(e => {
      if (!e.alive) return;
      const EW = 28, EH = 28;
      const ex = e.x - EW/2, ey = e.y - EH;

      const overlapX = player.x < ex + EW && player.x + player.w > ex;
      const overlapY = player.y < ey + EH && player.y + player.h > ey;

      if (overlapX && overlapY) {
        // Player falls onto enemy from above?
        const playerBottom = player.y + player.h;
        const enemyTop     = ey;
        if (player.vy > 0 && playerBottom - player.vy <= enemyTop + 4) {
          e.alive = false;
          player.vy = JUMP_FORCE * 0.7;
          killed++;
          Audio.sfxEnemyDie();
        } else {
          hit = true;
        }
      }
    });
    return { hit, killed };
  }

  return { create, update, checkCollectibles, checkEnemies, W, H };
})();
