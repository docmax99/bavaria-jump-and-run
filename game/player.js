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
      onWall: 0,        // 1=right wall, -1=left wall, 0=none
      facing: 1,        // 1=right, -1=left
      coyoteFrames: 0,
      jumpBuffer: 0,
      jumpsLeft: 2,     // double jump counter
      wasJumping: false,
      frame: 0,         // animation frame counter
      animTimer: 0,
      invincible: 0,    // frames of invincibility after hit
      dead: false,
      scaleX: 1,        // squash & stretch
      scaleY: 1,
      speedTimer: 0,    // frames speed-boost active (~5s @ 60fps = 300)
      flyTimer: 0,      // frames fly active (~3s @ 60fps = 180)
    };
  }

  function update(player, level, input, dt) {
    const { map, gravity } = level;
    const TS = TILE_SIZE;

    // ── Power-up timers ───────────────────────────────────────────────────
    const speedActive = player.speedTimer > 0;
    const flyActive   = player.flyTimer   > 0;
    if (player.speedTimer > 0) player.speedTimer--;
    if (player.flyTimer   > 0) player.flyTimer--;

    // ── Horizontal input ──────────────────────────────────────────────────
    const friction = player.onIce ? 0.96 : level.friction;
    const accel    = speedActive ? 1.2 : (player.onIce ? 0.6 : 1.0);

    if (input.left())  { player.vx -= MOVE_SPEED * accel; player.facing = -1; }
    if (input.right()) { player.vx += MOVE_SPEED * accel; player.facing =  1; }

    // Clamp horizontal speed
    const maxVx = speedActive ? 14 : (player.onIce ? 6 : MOVE_SPEED);
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
    if (player.onGround) {
      player.coyoteFrames = COYOTE_TIME;
      player.jumpsLeft = 2;
    } else if (player.coyoteFrames > 0) {
      player.coyoteFrames--;
    }

    // Wall jump — kick away from wall before normal jump logic
    if (player.jumpBuffer > 0 && player.onWall !== 0 && !player.onGround) {
      player.vy = JUMP_FORCE;
      player.vx = -player.onWall * 5;
      player.facing = -player.onWall;
      player.jumpsLeft = 1;
      player.jumpBuffer = 0;
      player.wasJumping = true;
      Audio.sfxJump();
    }

    // Execute normal jump (ground or coyote)
    if (player.jumpBuffer > 0 && player.coyoteFrames > 0) {
      player.vy = JUMP_FORCE;
      player.coyoteFrames = 0;
      player.jumpBuffer = 0;
      player.jumpsLeft--;
      player.wasJumping = true;
      Audio.sfxJump();
    }

    // Double jump — in air with jumps remaining
    if (player.jumpBuffer > 0 && player.coyoteFrames === 0 && !player.onGround && player.jumpsLeft > 0) {
      player.vy = JUMP_FORCE * 0.85;
      player.jumpBuffer = 0;
      player.jumpsLeft--;
      player.wasJumping = true;
      Audio.sfxJump();
    }

    // Variable jump height — release early = lower jump
    if (player.wasJumping && !input.jump() && player.vy < -4) {
      player.vy *= 0.75;
    }

    // ── Gravity / Fly ─────────────────────────────────────────────────────
    if (flyActive) {
      // No gravity — player controls vertical with jump/down
      player.vy = 0;
      if (input.jump())                                                    player.vy = -4;
      if (input.isDown('ArrowDown') || input.isDown('KeyS')) player.vy =  4;
      player.onGround = false;
      player.jumpsLeft = 2; // refill jumps so landing works normally
    } else {
      player.vy += gravity;
      // Wall slide — slow fall when hugging a wall
      if (player.onWall !== 0 && !player.onGround && player.vy > 3) player.vy = 3;
      if (player.vy > 18) player.vy = 18; // terminal velocity
    }

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

    // Detect wall contact
    detectWall(player, map);

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

  function detectWall(p, map) {
    if (p.onGround) { p.onWall = 0; return; }
    const top = p.y + 4;
    const bot = p.y + p.h - 1;
    const rows = [top, (top + bot) / 2, bot];
    // Check right wall
    for (const py of rows) {
      if (Level.isSolid(tileAt(map, p.x + p.w, py))) { p.onWall = 1; return; }
    }
    // Check left wall
    for (const py of rows) {
      if (Level.isSolid(tileAt(map, p.x - 1, py))) { p.onWall = -1; return; }
    }
    p.onWall = 0;
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
    let speedBoost = false;
    let flyBoost = false;
    level.collectibles.forEach(c => {
      if (c.collected) return;
      const dx = (player.x + player.w/2) - c.x;
      const dy = (player.y + player.h/2) - c.y;
      if (Math.abs(dx) < 36 && Math.abs(dy) < 36) {
        c.collected = true;
        if (c.type === 'pretzel')    { points += 10; Audio.sfxCoin(); }
        else if (c.type === 'mug')   { livesGained++; Audio.sfxCoin(); }
        else if (c.type === 'speedboost') { speedBoost = true; Audio.sfxCoin(); }
        else if (c.type === 'fly')        { flyBoost   = true; Audio.sfxCoin(); }
      }
    });
    return { points, livesGained, speedBoost, flyBoost };
  }

  function checkEnemies(player, level) {
    if (player.invincible > 0) return { hit: false, killed: 0 };
    let killed = 0;
    let hit = false;

    level.enemies.forEach(e => {
      if (!e.alive) return;
      const EW = e.W || 26;
      const EH = e.H || 36;
      const ex = e.x - EW/2, ey = e.y - EH;

      const overlapX = player.x < ex + EW && player.x + player.w > ex;
      const overlapY = player.y < ey + EH && player.y + player.h > ey;

      if (overlapX && overlapY) {
        // Player falls onto enemy from above?
        const playerBottom = player.y + player.h;
        const enemyTop     = ey;
        if (player.vy > 0 && playerBottom - player.vy <= enemyTop + 4) {
          if (e.isBoss) {
            e.hp--;
            if (e.hp <= 0) e.alive = false;
          } else {
            e.alive = false;
          }
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
