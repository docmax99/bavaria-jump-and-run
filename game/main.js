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

  // Resize canvas to fit window while keeping aspect ratio
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
  let stateTimer = 0; // frames since last state change

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
    Level.updateMovingPlatforms(level, 1);
    Level.updateEnemies(level);

    Player.update(player, level, Input, 1);

    // Collectibles
    const { points, livesGained } = Player.checkCollectibles(player, level);
    score += points;
    lives += livesGained;

    // Enemies
    const { hit } = Player.checkEnemies(player, level);
    if (hit) {
      player.invincible = 90;
      lives--;
      Audio.sfxHit();
      player.vx = player.facing * -3;
      player.vy = -5;
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
        // Respawn
        player = Player.create(64, (Level.ROWS - 4) * TILE_SIZE);
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

    updateCamera();
    updateHUD();
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (state === STATE.MENU) {
      // Show a small background preview
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      Renderer.drawBackground(ctx, 'village', 0, CANVAS_W, CANVAS_H);
      Renderer.drawMenu(ctx, CANVAS_W, CANVAS_H);
      return;
    }

    // Game scene
    Renderer.drawBackground(ctx, level.theme, camX, CANVAS_W, CANVAS_H);
    Renderer.drawTilemap(ctx, level, camX, camY, CANVAS_W, CANVAS_H);
    Renderer.drawGoal(ctx, level, camX, camY, tick);
    Renderer.drawCollectibles(ctx, level, camX, camY, tick);
    Renderer.drawEnemies(ctx, level, camX, camY, tick);
    Renderer.drawPlayer(ctx, player, camX, camY, tick);

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
    // Cap at ~60fps, skip if tab is hidden
    if (timestamp - lastTime >= 14) {
      update();
      draw();
      lastTime = timestamp;
      // Consume click flag at end of frame
      clickedThisFrame = false;
    }
    requestAnimationFrame(loop);
  }

  // Start
  requestAnimationFrame(loop);
})();
