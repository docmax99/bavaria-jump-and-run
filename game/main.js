// Game loop & state machine
// States: MENU | PLAYING | LEVEL_COMPLETE | GAME_OVER

const CANVAS_W = 800;
const CANVAS_H = 480;

const STATE = {
  MENU:           'menu',
  PLAYING:        'playing',
  LEVEL_COMPLETE: 'level_complete',
  GAME_OVER:      'game_over',
};

const Game = (() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;

  function resize() {
    const scaleX = window.innerWidth  / CANVAS_W;
    const scaleY = window.innerHeight / CANVAS_H;
    const scale  = Math.min(scaleX, scaleY) * 0.97;
    canvas.style.width  = (CANVAS_W * scale) + 'px';
    canvas.style.height = (CANVAS_H * scale) + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  // ── State ─────────────────────────────────────────────────────────────
  let state      = STATE.MENU;
  let levelIndex = 0;
  let lives      = 3;
  let score      = 0;
  let level      = null;
  let player     = null;
  let camX       = 0;
  let camY       = 0;
  let tick       = 0;
  let stateTimer = 0;

  // ── Juice state ───────────────────────────────────────────────────────
  let shakeFrames    = 0;
  let shakeAmp       = 0;
  let hitPauseFrames = 0;
  let levelBannerAlpha = 0;
  const scorePopups  = [];
  let playerTrail    = [];
  let prevOnGround   = false;
  let prevVy         = 0;

  function triggerShake(frames, amp) {
    shakeFrames = Math.max(shakeFrames, frames);
    shakeAmp    = Math.max(shakeAmp, amp);
  }

  // ── HUD refs ──────────────────────────────────────────────────────────
  const hudLives = document.getElementById('hud-lives');
  const hudScore = document.getElementById('hud-score');
  const hudLevel = document.getElementById('hud-level');
  const hud      = document.getElementById('hud');

  function updateHUD() {
    hudLives.textContent = '❤️ ' + lives;
    hudScore.textContent = '🥨 ' + score;
    hudLevel.textContent = level ? level.name : '';
    hud.style.display = state === STATE.PLAYING ? 'flex' : 'none';
  }

  // ── Game flow ─────────────────────────────────────────────────────────
  function startGame() {
    Audio.resume();
    levelIndex = 0;
    lives      = 3;
    score      = 0;
    loadLevel(0);
    setState(STATE.PLAYING);
    Audio.startMusic();
  }

  function loadLevel(idx) {
    level  = Level.load(idx);
    player = Player.create(64, (Level.ROWS - 4) * TILE_SIZE);
    camX   = 0;
    camY   = 0;
    Particles.clear();
    playerTrail      = [];
    prevOnGround     = false;
    prevVy           = 0;
    levelBannerAlpha = 1.8;  // fades over ~90 frames
    scorePopups.length = 0;
    shakeFrames = 0;
    hitPauseFrames = 0;
  }

  function setState(s) {
    state      = s;
    stateTimer = 0;
    updateHUD();
  }

  function nextLevel() {
    if (levelIndex < LEVELS.length - 1) {
      levelIndex++;
      loadLevel(levelIndex);
      setState(STATE.PLAYING);
    } else {
      setState(STATE.MENU);
      Audio.stopMusic();
    }
  }

  // ── Camera ────────────────────────────────────────────────────────────
  function updateCamera() {
    const targetX = player.x + player.w / 2 - CANVAS_W * 0.4;
    const targetY = player.y + player.h / 2 - CANVAS_H * 0.6;
    camX += (targetX - camX) * 0.12;
    camY += (targetY - camY) * 0.12;
    camX = Math.max(0, Math.min(camX, level.width  - CANVAS_W));
    camY = Math.max(0, Math.min(camY, level.height - CANVAS_H));
  }

  // ── Update loop ───────────────────────────────────────────────────────
  function update() {
    tick++;
    stateTimer++;

    if (state === STATE.MENU) {
      if ((Input.enter() || clickedThisFrame) && stateTimer > 10) {
        clickedThisFrame = false;
        Input.clearEnter();
        startGame();
      }
      return;
    }

    if (state === STATE.LEVEL_COMPLETE || state === STATE.GAME_OVER) {
      if ((Input.enter() || clickedThisFrame) && stateTimer > 40) {
        clickedThisFrame = false;
        Input.clearEnter();
        if (state === STATE.LEVEL_COMPLETE) nextLevel();
        else { Audio.stopMusic(); setState(STATE.MENU); }
      }
      return;
    }

    // ESC → menu
    if (Input.isDown('Escape')) {
      Audio.stopMusic();
      setState(STATE.MENU);
      return;
    }

    // ── PLAYING ──────────────────────────────────────────────────────────

    // Hit pause — freeze simulation for a few frames on impact
    if (hitPauseFrames > 0) {
      hitPauseFrames--;
      updateCamera();
      Particles.update();
      return;
    }

    Level.updateMovingPlatforms(level, 1);
    Level.updateEnemies(level);
    Player.update(player, level, Input, 1);

    // ── Squash & stretch ──────────────────────────────────────────────────
    const justLanded = !prevOnGround && player.onGround;
    const justJumped = prevVy >= -2  && player.vy < -4;

    if (justLanded) {
      player.scaleX = 1.45;
      player.scaleY = 0.6;
      if (Math.abs(prevVy) > 4) triggerShake(4, 2);
      Particles.spawn(player.x + player.w / 2, player.y + player.h, 6, '#C8A860', 2.5, 18);
    } else if (justJumped) {
      player.scaleX = 0.75;
      player.scaleY = 1.35;
      Particles.spawn(player.x + player.w / 2, player.y + player.h, 4, '#CCCCCC', 1.5, 14);
    }
    // Lerp back to 1
    player.scaleX += (1 - player.scaleX) * 0.22;
    player.scaleY += (1 - player.scaleY) * 0.22;
    if (Math.abs(player.scaleX - 1) < 0.01) player.scaleX = 1;
    if (Math.abs(player.scaleY - 1) < 0.01) player.scaleY = 1;

    prevOnGround = player.onGround;
    prevVy       = player.vy;

    // ── Player dust trail ─────────────────────────────────────────────────
    if (Math.abs(player.vx) > 1.5 || !player.onGround) {
      playerTrail.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, a: 0.32 });
    }
    playerTrail.forEach(t => { t.a -= 0.055; });
    playerTrail = playerTrail.filter(t => t.a > 0);

    // ── Collectibles ──────────────────────────────────────────────────────
    const wasCollected = level.collectibles.map(c => c.collected);
    const { points, livesGained } = Player.checkCollectibles(player, level);
    score += points;
    lives += livesGained;
    level.collectibles.forEach((c, i) => {
      if (!wasCollected[i] && c.collected) {
        const col = c.type === 'pretzel' ? '#FFD700' : '#FF8888';
        Particles.spawn(c.x, c.y, 10, col, 3, 22);
        scorePopups.push({
          x: c.x, y: c.y - 10,
          text: c.type === 'pretzel' ? '+10' : '+♥',
          life: 55, maxLife: 55,
        });
      }
    });

    // ── Enemies ───────────────────────────────────────────────────────────
    const wasAlive = level.enemies.map(e => e.alive);
    const { hit } = Player.checkEnemies(player, level);
    level.enemies.forEach((e, i) => {
      if (wasAlive[i] && !e.alive) {
        Particles.spawn(e.x, e.y - 14, 12, '#CC2200', 4, 28);
        triggerShake(7, 4);
        hitPauseFrames = 5;
        score += 50;
        scorePopups.push({ x: e.x, y: e.y - 30, text: '+50', life: 55, maxLife: 55 });
      }
    });

    if (hit) {
      player.invincible = 90;
      lives--;
      Audio.sfxHit();
      player.vx = player.facing * -3;
      player.vy = -5;
      triggerShake(12, 6);
      hitPauseFrames = 4;
      Particles.spawn(player.x + player.w / 2, player.y + player.h / 2, 8, '#FF4444', 4, 20);
      if (lives <= 0) {
        Audio.sfxGameOver();
        Audio.stopMusic();
        setState(STATE.GAME_OVER);
        return;
      }
    }

    // Player died (fell in pit)
    if (player.dead) {
      lives--;
      Audio.sfxHit();
      if (lives <= 0) {
        Audio.sfxGameOver();
        Audio.stopMusic();
        setState(STATE.GAME_OVER);
      } else {
        player = Player.create(64, (Level.ROWS - 4) * TILE_SIZE);
        playerTrail = [];
        camX = 0;
      }
      return;
    }

    // Reached goal?
    if (player.x + player.w >= level.goalX) {
      score += 100 * (levelIndex + 1);
      Audio.sfxLevelComplete();
      setState(STATE.LEVEL_COMPLETE);
      return;
    }

    // ── Update score popups ───────────────────────────────────────────────
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      scorePopups[i].y -= 0.8;
      scorePopups[i].life--;
      if (scorePopups[i].life <= 0) scorePopups.splice(i, 1);
    }

    // Level banner fade
    if (levelBannerAlpha > 0) levelBannerAlpha -= 0.015;

    Particles.update();
    updateCamera();
    updateHUD();
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (state === STATE.MENU) {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      Renderer.drawBackground(ctx, 'village', 0, CANVAS_W, CANVAS_H);
      Renderer.drawMenu(ctx, CANVAS_W, CANVAS_H);
      return;
    }

    // Screen shake offset
    const sx = shakeFrames > 0 ? (Math.random() - 0.5) * shakeAmp * 2 : 0;
    const sy = shakeFrames > 0 ? (Math.random() - 0.5) * shakeAmp * 2 : 0;
    if (shakeFrames > 0) shakeFrames--;
    const dcamX = camX + sx;
    const dcamY = camY + sy;

    // Game scene
    Renderer.drawBackground(ctx, level.theme, dcamX, CANVAS_W, CANVAS_H);
    Renderer.drawTilemap(ctx, level, dcamX, dcamY, CANVAS_W, CANVAS_H);
    Renderer.drawGoal(ctx, level, dcamX, dcamY, tick);
    Renderer.drawCollectibles(ctx, level, dcamX, dcamY, tick);
    Renderer.drawEnemies(ctx, level, dcamX, dcamY, tick);
    Renderer.drawPlayerTrail(ctx, playerTrail, dcamX, dcamY);
    Renderer.drawPlayer(ctx, player, dcamX, dcamY, tick);
    Particles.draw(ctx, dcamX, dcamY);
    Renderer.drawScorePopups(ctx, scorePopups, dcamX, dcamY);

    if (levelBannerAlpha > 0) {
      Renderer.drawLevelBanner(ctx, level.name, Math.min(1, levelBannerAlpha), CANVAS_W, CANVAS_H);
    }

    if (state === STATE.LEVEL_COMPLETE) {
      const nextName = levelIndex + 1 < LEVELS.length ? LEVELS[levelIndex + 1].name : null;
      Renderer.drawLevelComplete(ctx, CANVAS_W, CANVAS_H, level.name, score, nextName);
    } else if (state === STATE.GAME_OVER) {
      Renderer.drawGameOver(ctx, CANVAS_W, CANVAS_H, score);
    } else {
      Renderer.drawPauseHint(ctx, CANVAS_W);
    }
  }

  // ── Click to start ────────────────────────────────────────────────────
  let clickedThisFrame = false;
  canvas.addEventListener('click', () => {
    Audio.resume();
    clickedThisFrame = true;
  });
  canvas.addEventListener('touchend', () => {
    Audio.resume();
    clickedThisFrame = true;
  }, { passive: true });

  // ── Main loop ─────────────────────────────────────────────────────────
  let lastTime = 0;
  function loop(timestamp) {
    if (timestamp - lastTime >= 14) {
      update();
      draw();
      lastTime = timestamp;
      clickedThisFrame = false;
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
