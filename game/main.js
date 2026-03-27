// Game loop & state machine
// States: MENU | PLAYING | LEVEL_COMPLETE | GAME_OVER | GAME_COMPLETE

const CANVAS_W = 800;
const CANVAS_H = 480;

const STATE = {
  MENU:           'menu',
  PLAYING:        'playing',
  PAUSED:         'paused',
  LEVEL_COMPLETE: 'level_complete',
  GAME_OVER:      'game_over',
  GAME_COMPLETE:  'game_complete',
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
  let state            = STATE.MENU;
  let levelIndex       = 0;
  let lives            = 3;
  let score            = 0;
  let highscore        = parseInt(localStorage.getItem('bavaria_highscore') || '0');
  let isNewHighscore   = false;
  let selectedSkin     = parseInt(localStorage.getItem('bavaria_skin') || '0');
  let skinCooldown     = 0;
  let leaderboardData  = [];
  let nameInputVisible = false;

  function checkHighscore() {
    if (score > highscore) {
      highscore = score;
      localStorage.setItem('bavaria_highscore', highscore);
      isNewHighscore = true;
    }
  }
  let level      = null;
  let player     = null;
  let camX       = 0;
  let camY       = 0;
  let tick       = 0;
  let stateTimer = 0;

  // ── Fade system ───────────────────────────────────────────────────────
  let fadeAlpha    = 0;
  let fadingOut    = false;
  let fadingIn     = false;
  let fadeCallback = null;

  function startFade(callback) {
    fadingOut    = true;
    fadingIn     = false;
    fadeAlpha    = 0;
    fadeCallback = callback;
  }

  // ── Level statistics ──────────────────────────────────────────────────
  let levelStartTime  = 0;
  let levelItemsCount = 0;
  let levelKillCount  = 0;
  let levelStats      = null; // stored at level complete

  // ── Tutorial hints ────────────────────────────────────────────────────
  const TUTORIAL_HINTS = [
    { triggerX: 120,  text: '← → Bewegen',           shown: false },
    { triggerX: 380,  text: 'Leertaste: Springen',    shown: false },
    { triggerX: 700,  text: 'Doppelsprung möglich!',  shown: false },
    { triggerX: 1000, text: 'Auf Gegner springen!',   shown: false },
    { triggerX: 1200, text: 'Z / J: Schwert-Angriff!', shown: false },
    { triggerX: 1400, text: 'Sammle Brezeln!',        shown: false },
  ];
  let tutorialHints = TUTORIAL_HINTS.map(h => ({ ...h }));

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
    hud.style.display = (state === STATE.PLAYING || state === STATE.PAUSED) ? 'flex' : 'none';
  }

  // ── Game flow ─────────────────────────────────────────────────────────
  function startGame() {
    Audio.resume();
    levelIndex     = 0;
    lives          = 3;
    score          = 0;
    isNewHighscore = false;
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
    tutorialHints = TUTORIAL_HINTS.map(h => ({ ...h }));
    levelStartTime  = Date.now();
    levelItemsCount = 0;
    levelKillCount  = 0;
    levelStats      = null;
  }

  function setState(s) {
    state      = s;
    stateTimer = 0;
    updateHUD();
  }

  // ── Leaderboard / Name input ───────────────────────────────────────────
  function showNameInput() {
    if (score <= 0) { goToMenu(); return; }
    nameInputVisible = true;
    const overlay = document.getElementById('name-overlay');
    const input   = document.getElementById('name-input');
    document.getElementById('name-score-display').textContent = 'Punkte: ' + score;
    overlay.style.display = 'flex';
    input.value = '';
    setTimeout(() => input.focus(), 80);
  }

  function hideNameInput() {
    nameInputVisible = false;
    document.getElementById('name-overlay').style.display = 'none';
  }

  async function submitName(skip) {
    const raw  = document.getElementById('name-input').value;
    const name = skip ? 'Anonym' : (raw.trim() || 'Anonym');
    hideNameInput();
    if (!skip) await Leaderboard.submit(name, score, selectedSkin);
    await goToMenu();
  }

  async function goToMenu() {
    Audio.stopMusic();
    setState(STATE.MENU);
    leaderboardData = await Leaderboard.fetchTop10();
  }

  // Wire up overlay buttons
  document.getElementById('name-submit').addEventListener('click', () => submitName(false));
  document.getElementById('name-skip').addEventListener('click',   () => submitName(true));
  document.getElementById('name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitName(false); }
  });

  function nextLevel() {
    startFade(() => {
      if (levelIndex < LEVELS.length - 1) {
        levelIndex++;
        loadLevel(levelIndex);
        setState(STATE.PLAYING);
      } else {
        checkHighscore();
        setState(STATE.GAME_COMPLETE);
        Audio.stopMusic();
      }
    });
  }

  // ── Pause ─────────────────────────────────────────────────────────────
  let pauseKeyWasDown      = false;
  let fullscreenKeyWasDown = false;

  function showPauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    document.getElementById('music-vol-slider').value = Audio.getMusicVolume();
    document.getElementById('sfx-vol-slider').value   = Audio.getSfxVolume();
    overlay.style.display = 'flex';
    hud.style.display = 'none';
  }

  function hidePauseOverlay() {
    document.getElementById('pause-overlay').style.display = 'none';
  }

  function togglePause() {
    if (state === STATE.PLAYING) {
      state = STATE.PAUSED;
      showPauseOverlay();
    } else if (state === STATE.PAUSED) {
      state = STATE.PLAYING;
      hidePauseOverlay();
      updateHUD();
    }
  }

  document.getElementById('music-vol-slider').addEventListener('input', e => {
    Audio.setMusicVolume(parseFloat(e.target.value));
  });
  document.getElementById('sfx-vol-slider').addEventListener('input', e => {
    Audio.setSfxVolume(parseFloat(e.target.value));
  });

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
      // Skin cycling with left/right (debounced)
      if (skinCooldown > 0) skinCooldown--;
      if (skinCooldown === 0) {
        const skinCount = Renderer.SKINS.length;
        if (Input.left())  { selectedSkin = (selectedSkin - 1 + skinCount) % skinCount; skinCooldown = 12; localStorage.setItem('bavaria_skin', selectedSkin); }
        if (Input.right()) { selectedSkin = (selectedSkin + 1)              % skinCount; skinCooldown = 12; localStorage.setItem('bavaria_skin', selectedSkin); }
      }
      if ((Input.enter() || clickedThisFrame) && stateTimer > 10) {
        clickedThisFrame = false;
        Input.clearEnter();
        startGame();
      }
      return;
    }

    // Fade system update
    if (fadingOut) {
      fadeAlpha += 0.06;
      if (fadeAlpha >= 1) {
        fadeAlpha = 1;
        fadingOut = false;
        fadingIn  = true;
        if (fadeCallback) { fadeCallback(); fadeCallback = null; }
      }
    } else if (fadingIn) {
      fadeAlpha -= 0.06;
      if (fadeAlpha <= 0) { fadeAlpha = 0; fadingIn = false; }
    }

    // F key toggle fullscreen (edge-detect)
    const fDown = Input.isDown('KeyF');
    if (fDown && !fullscreenKeyWasDown) {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.getElementById('game-container').requestFullscreen().catch(() => {});
    }
    fullscreenKeyWasDown = fDown;

    // P key toggle pause (edge-detect)
    const pDown = Input.isDown('KeyP');
    if (pDown && !pauseKeyWasDown) {
      if (state === STATE.PLAYING || state === STATE.PAUSED) togglePause();
    }
    pauseKeyWasDown = pDown;

    // Paused: only handle resume / menu keys
    if (state === STATE.PAUSED) {
      if (Input.isDown('Escape')) togglePause();
      if (Input.isDown('KeyM'))   { hidePauseOverlay(); Audio.stopMusic(); setState(STATE.MENU); }
      return;
    }

    if (state === STATE.LEVEL_COMPLETE || state === STATE.GAME_OVER || state === STATE.GAME_COMPLETE) {
      if (nameInputVisible) return;
      if ((Input.enter() || clickedThisFrame) && stateTimer > 40) {
        clickedThisFrame = false;
        Input.clearEnter();
        if (state === STATE.LEVEL_COMPLETE) nextLevel();
        else showNameInput();
      }
      return;
    }

    // ESC → pause
    if (Input.isDown('Escape')) {
      togglePause();
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
    Level.updateEnemies(level, player);
    Level.updateProjectiles(level);
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

    // ── Tutorial hints (Level 1 only) ─────────────────────────────────────
    if (levelIndex === 0) {
      tutorialHints.forEach(hint => {
        if (!hint.shown && player.x >= hint.triggerX) {
          hint.shown = true;
          scorePopups.push({ x: player.x, y: player.y - 60, text: hint.text, life: 140, maxLife: 140, isTutorial: true });
        }
      });
    }

    // ── Checkpoints ───────────────────────────────────────────────────────
    level.checkpoints.forEach(cp => {
      if (!cp.activated && player.x + player.w >= cp.x) {
        cp.activated = true;
        scorePopups.push({ x: cp.x - 16, y: (Level.ROWS - 6) * TILE_SIZE, text: 'Checkpoint!', life: 100, maxLife: 100 });
        Audio.sfxCoin();
        Particles.spawn(cp.x, (Level.ROWS - 2) * TILE_SIZE, 14, '#FFD700', 3.5, 28);
      }
    });

    // ── Collectibles ──────────────────────────────────────────────────────
    const wasCollected = level.collectibles.map(c => c.collected);
    const { points, livesGained, speedBoost, flyBoost } = Player.checkCollectibles(player, level);
    score += points;
    lives += livesGained;
    if (speedBoost) {
      player.speedTimer = 300;
      scorePopups.push({ x: player.x + 12, y: player.y - 10, text: 'SPEED!', life: 70, maxLife: 70 });
      Particles.spawn(player.x + player.w / 2, player.y + player.h / 2, 14, '#FFE020', 4, 28);
    }
    if (flyBoost) {
      player.flyTimer = 180;
      scorePopups.push({ x: player.x + 12, y: player.y - 10, text: 'FLY!', life: 70, maxLife: 70 });
      Particles.spawn(player.x + player.w / 2, player.y + player.h / 2, 14, '#AAEEFF', 4, 28);
    }
    level.collectibles.forEach((c, i) => {
      if (!wasCollected[i] && c.collected) {
        levelItemsCount++;
        const col = c.type === 'pretzel'   ? '#FFD700'
                  : c.type === 'mug'        ? '#FF8888'
                  : c.type === 'speedboost' ? '#FFE020'
                  :                           '#AAEEFF';
        Particles.spawn(c.x, c.y, 10, col, 3, 22);
        if (c.type === 'pretzel') {
          scorePopups.push({ x: c.x, y: c.y - 10, text: '+10', life: 55, maxLife: 55 });
        } else if (c.type === 'mug') {
          scorePopups.push({ x: c.x, y: c.y - 10, text: '+♥', life: 55, maxLife: 55 });
        }
      }
    });

    // ── Enemies ───────────────────────────────────────────────────────────
    const wasAlive = level.enemies.map(e => e.alive);
    const { hit } = Player.checkEnemies(player, level);
    level.enemies.forEach((e, i) => {
      if (wasAlive[i] && !e.alive) {
        levelKillCount++;
        const isBoss = !!e.isBoss;
        const pts    = isBoss ? 500 : 50;
        Particles.spawn(e.x, e.y - 14, isBoss ? 30 : 12, isBoss ? '#FFD700' : '#CC2200', isBoss ? 6 : 4, isBoss ? 50 : 28);
        triggerShake(isBoss ? 18 : 7, isBoss ? 10 : 4);
        hitPauseFrames = isBoss ? 12 : 5;
        score += pts;
        scorePopups.push({ x: e.x, y: e.y - 30, text: '+' + pts, life: 55, maxLife: 55 });
      }
    });

    // ── Sword attack hits ─────────────────────────────────────────────────
    if (player.attackTimer > 0) {
      const swordBox = Player.getAttackHitbox(player);
      if (swordBox) {
        level.enemies.forEach(e => {
          if (!e.alive) return;
          if (e.lastSwordHitId === player.attackId) return; // already hit this swing
          const EW = e.W || 26, EH = e.H || 36;
          const ex = e.x - EW / 2, ey = e.y - EH;
          if (swordBox.x < ex + EW && swordBox.x + swordBox.w > ex &&
              swordBox.y < ey + EH && swordBox.y + swordBox.h > ey) {
            e.lastSwordHitId = player.attackId;
            const dmg = player.comboCount === 3 ? 2 : 1;
            const prevAlive = e.alive;
            if (e.isBoss) {
              e.hp -= dmg;
              if (e.hp <= 0) e.alive = false;
            } else if (e.type === 'turtle') {
              if (e.retreated) { e.alive = false; }
              else { e.hp--; if (e.hp <= 0) { e.alive = false; } else { e.retreated = true; e.retreatTimer = 90; } }
            } else {
              e.alive = false;
            }
            if (!e.alive) {
              levelKillCount++;
              const isBoss = !!e.isBoss;
              const pts = isBoss ? 500 : 50;
              Particles.spawn(e.x, e.y - 14, isBoss ? 30 : 12,
                              isBoss ? '#FFD700' : '#FF6600', isBoss ? 6 : 4, isBoss ? 50 : 28);
              triggerShake(isBoss ? 18 : 5, isBoss ? 10 : 3);
              hitPauseFrames = isBoss ? 12 : 3;
              score += pts;
              scorePopups.push({ x: e.x, y: e.y - 30, text: '+' + pts, life: 55, maxLife: 55 });
              Audio.sfxEnemyDie();
            } else {
              // Hit but survived
              Particles.spawn(e.x, e.y - 14, 6, '#FF9944', 3, 18);
              Audio.sfxSwordHit();
            }
            if (player.comboCount === 3) {
              scorePopups.push({ x: player.x + 12, y: player.y - 52,
                                 text: 'COMBO!', life: 75, maxLife: 75 });
              Particles.spawn(player.x + player.w / 2, player.y, 18, '#FFD700', 5, 30);
              triggerShake(6, 4);
            }
          }
        });
      }
    }

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
        checkHighscore();
        setState(STATE.GAME_OVER);
        return;
      }
    }

    // ── Boss projectile collision ──────────────────────────────────────
    if (player.invincible === 0) {
      for (const proj of level.projectiles) {
        if (!proj.alive) continue;
        if (proj.x > player.x && proj.x < player.x + player.w &&
            proj.y > player.y && proj.y < player.y + player.h) {
          proj.alive = false;
          player.invincible = 90;
          lives--;
          Audio.sfxHit();
          player.vx = proj.vx > 0 ? 3 : -3;
          player.vy = -5;
          triggerShake(10, 5);
          hitPauseFrames = 4;
          Particles.spawn(player.x + player.w / 2, player.y + player.h / 2, 8, '#FF8800', 4, 20);
          if (lives <= 0) {
            Audio.sfxGameOver();
            Audio.stopMusic();
            checkHighscore();
            setState(STATE.GAME_OVER);
            return;
          }
          break;
        }
      }
    }

    // Player died (fell in pit)
    if (player.dead) {
      lives--;
      Audio.sfxHit();
      if (lives <= 0) {
        Audio.sfxGameOver();
        Audio.stopMusic();
        checkHighscore();
        setState(STATE.GAME_OVER);
      } else {
        const lastCp = level.checkpoints.filter(cp => cp.activated).pop();
        const spawnX = lastCp ? lastCp.x - 16 : 64;
        player = Player.create(spawnX, (Level.ROWS - 4) * TILE_SIZE);
        playerTrail = [];
        camX = Math.max(0, Math.min(spawnX - CANVAS_W / 2, level.width - CANVAS_W));
      }
      return;
    }

    // Reached goal?
    if (player.x + player.w >= level.goalX) {
      // Gate: must defeat boss first on boss level
      const bossAlive = level.enemies.some(e => e.isBoss && e.alive);
      if (bossAlive) {
        if (!level._bossHintShown) {
          level._bossHintShown = true;
          scorePopups.push({ x: player.x, y: player.y - 40, text: 'Besiege den Endgegner!', life: 120, maxLife: 120 });
        }
        return;
      }
      score += 100 * (levelIndex + 1);
      Audio.sfxLevelComplete();
      levelStats = {
        time:  Math.floor((Date.now() - levelStartTime) / 1000),
        items: levelItemsCount,
        kills: levelKillCount,
      };
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
      Renderer.drawMenu(ctx, CANVAS_W, CANVAS_H, highscore, selectedSkin, leaderboardData);
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
    Renderer.drawCheckpoints(ctx, level, dcamX, dcamY, tick);
    Renderer.drawGoal(ctx, level, dcamX, dcamY, tick);
    Renderer.drawCollectibles(ctx, level, dcamX, dcamY, tick);
    Renderer.drawEnemies(ctx, level, dcamX, dcamY, tick);
    Renderer.drawProjectiles(ctx, level, dcamX, dcamY);
    Renderer.drawPlayerTrail(ctx, playerTrail, dcamX, dcamY);
    Renderer.drawPlayer(ctx, player, dcamX, dcamY, tick, selectedSkin);
    Renderer.drawComboIndicator(ctx, player, dcamX, dcamY);
    Particles.draw(ctx, dcamX, dcamY);
    Renderer.drawScorePopups(ctx, scorePopups, dcamX, dcamY);

    if (levelBannerAlpha > 0) {
      Renderer.drawLevelBanner(ctx, level.name, Math.min(1, levelBannerAlpha), CANVAS_W, CANVAS_H);
    }

    // Boss HP bar (level 7)
    if (level && level.index === 6) {
      const boss = level.enemies.find(e => e.isBoss);
      if (boss) Renderer.drawBossHpBar(ctx, boss, CANVAS_W, CANVAS_H);
    }

    // Power-up HUD
    if (player) Renderer.drawPowerUpHUD(ctx, player, CANVAS_W);

    if (state === STATE.LEVEL_COMPLETE) {
      const nextName = levelIndex + 1 < LEVELS.length ? LEVELS[levelIndex + 1].name : null;
      Renderer.drawLevelComplete(ctx, CANVAS_W, CANVAS_H, level.name, score, nextName, highscore, isNewHighscore, levelStats);
    } else if (state === STATE.GAME_OVER) {
      Renderer.drawGameOver(ctx, CANVAS_W, CANVAS_H, score, highscore, isNewHighscore);
    } else if (state === STATE.GAME_COMPLETE) {
      Renderer.drawGameComplete(ctx, CANVAS_W, CANVAS_H, score, highscore, isNewHighscore);
    }

    // Fade overlay (level transitions)
    if (fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
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

  // Fetch leaderboard for the initial menu view
  Leaderboard.fetchTop10().then(data => { leaderboardData = data; });
})();
