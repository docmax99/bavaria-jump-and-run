// Renderer — all canvas draw calls
const Renderer = (() => {
  const TS = TILE_SIZE;

  // ── Colour palettes per theme ─────────────────────────────────────────
  const THEMES = {
    village: {
      skyTop:    '#87CEEB',
      skyBot:    '#E0F4FF',
      mountain1: '#8B7355',
      mountain2: '#A09080',
      ground:    '#228B22',
      tileColors: { 1:'#228B22', 2:'#8B6914', 3:'#C8A060', 4:'#DDEEFF', 5:'#AADDFF' },
    },
    forest: {
      skyTop:    '#FF7F50',
      skyBot:    '#FFA07A',
      mountain1: '#556B2F',
      mountain2: '#6B8E23',
      ground:    '#2E5C2E',
      tileColors: { 1:'#2E5C2E', 2:'#7B5C2E', 3:'#B8864E', 4:'#DDEEFF', 5:'#AADDFF' },
    },
    mountain: {
      skyTop:    '#1E3A6E',
      skyBot:    '#5C89C8',
      mountain1: '#A0A0A0',
      mountain2: '#C8C8C8',
      ground:    '#E8E8FF',
      tileColors: { 1:'#DDEEFF', 2:'#888899', 3:'#B8864E', 4:'#E8F4FF', 5:'#C8F0FF' },
    },
  };

  // ── Background ───────────────────────────────────────────────────────
  function drawBackground(ctx, theme, camX, canvasW, canvasH) {
    const t = THEMES[theme];

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
    grad.addColorStop(0, t.skyTop);
    grad.addColorStop(1, t.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Far mountains (parallax 0.15)
    drawMountainRange(ctx, camX * 0.15, canvasW, canvasH, t.mountain2, 0.55, 80);
    // Near mountains (parallax 0.35)
    drawMountainRange(ctx, camX * 0.35, canvasW, canvasH, t.mountain1, 0.68, 60);

    // Trees (parallax 0.6)
    if (theme !== 'mountain') drawTrees(ctx, camX * 0.6, canvasW, canvasH, theme);

    // Clouds (parallax 0.1)
    drawClouds(ctx, camX * 0.1, canvasW, canvasH);
  }

  function drawMountainRange(ctx, offsetX, w, h, color, yFrac, peakH) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const baseY = h * yFrac;
    ctx.moveTo(0, h);
    const step = 120;
    const count = Math.ceil(w / step) + 4;
    const startC = Math.floor(offsetX / step) - 1;
    ctx.lineTo(0, baseY + peakH);
    for (let i = startC; i < startC + count; i++) {
      const x = i * step - (offsetX % step);
      ctx.lineTo(x + step * 0.35, baseY - peakH * (0.6 + (Math.sin(i * 1.7) * 0.4)));
      ctx.lineTo(x + step * 0.7, baseY + peakH * 0.3);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  function drawTrees(ctx, offsetX, w, h, theme) {
    const color = theme === 'forest' ? '#1A4A1A' : '#2A5A2A';
    const baseY = h * 0.75;
    const step = 70;
    const count = Math.ceil(w / step) + 4;
    const startC = Math.floor(offsetX / step) - 1;
    for (let i = startC; i < startC + count; i++) {
      const x = i * step - (offsetX % step) + (Math.sin(i * 2.3) * 15);
      const th = 50 + Math.abs(Math.sin(i * 1.1)) * 30;
      drawTree(ctx, x, baseY, th, color);
    }
  }

  function drawTree(ctx, x, y, height, color) {
    ctx.fillStyle = '#5D4E37';
    ctx.fillRect(x - 4, y - height * 0.3, 8, height * 0.3);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - height);
    ctx.lineTo(x - height * 0.35, y - height * 0.3);
    ctx.lineTo(x + height * 0.35, y - height * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - height * 0.75);
    ctx.lineTo(x - height * 0.42, y - height * 0.1);
    ctx.lineTo(x + height * 0.42, y - height * 0.1);
    ctx.closePath();
    ctx.fill();
  }

  function drawClouds(ctx, offsetX, w, h) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const clouds = [
      [0.08, 0.12, 60, 20],
      [0.28, 0.08, 80, 25],
      [0.52, 0.15, 50, 18],
      [0.72, 0.1,  70, 22],
      [1.05, 0.13, 55, 19],
      [1.4,  0.07, 90, 28],
      [1.7,  0.16, 45, 15],
    ];
    clouds.forEach(([xFrac, yFrac, cw, ch]) => {
      const cx = ((xFrac * 2400 - offsetX) % (w + 200) + w + 200) % (w + 200) - 100;
      const cy = yFrac * h;
      drawCloud(ctx, cx, cy, cw, ch);
    });
  }

  function drawCloud(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.ellipse(x,         y,     w * 0.5, h * 0.6, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w*0.3, y-h*0.2, w*0.35, h*0.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x - w*0.3, y-h*0.1, w*0.3, h*0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Tilemap ───────────────────────────────────────────────────────────
  function drawTilemap(ctx, level, camX, camY, canvasW, canvasH) {
    const { map, theme } = level;
    const colors = THEMES[theme].tileColors;
    const startCol = Math.max(0, Math.floor(camX / TS));
    const endCol   = Math.min(map[0].length - 1, Math.ceil((camX + canvasW) / TS));
    const startRow = Math.max(0, Math.floor(camY / TS));
    const endRow   = Math.min(map.length - 1, Math.ceil((camY + canvasH) / TS));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const tile = map[r][c];
        if (tile === 0) continue;
        const sx = c * TS - camX;
        const sy = r * TS - camY;
        drawTile(ctx, tile, sx, sy, colors, theme);
      }
    }

    // Moving platforms
    level.movingPlatforms.forEach(mp => {
      const sx = mp.x - camX;
      const sy = mp.y - camY;
      drawMovingPlatform(ctx, sx, sy, mp.w * TS);
    });
  }

  function drawTile(ctx, type, x, y, colors, theme) {
    const c = colors[type] || '#888';
    ctx.fillStyle = c;
    ctx.fillRect(x, y, TS, TS);
    // Bevel — top/left highlight, bottom/right shadow
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, TS, 2);
    ctx.fillRect(x, y, 2, TS);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x, y + TS - 2, TS, 2);
    ctx.fillRect(x + TS - 2, y, 2, TS);

    if (type === 1) {
      // Grass top
      ctx.fillStyle = '#33BB33';
      ctx.fillRect(x, y, TS, 6);
      // Detail lines
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x, y + 6, TS, 2);
    } else if (type === 2) {
      // Stone — brick pattern
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TS - 1, TS - 1);
      ctx.strokeRect(x + TS/2, y + 0.5, 0, TS/2 - 1);
      ctx.strokeRect(x + 0.5, y + TS/2, TS/2 - 1, 0);
    } else if (type === 3) {
      // Wood platform
      ctx.fillStyle = '#A07040';
      ctx.fillRect(x, y, TS, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x + 4, y + 2, TS - 8, 3);
      ctx.fillStyle = '#7A5530';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x + 6 + i * 10, y + 1, 2, 8);
      }
    } else if (type === 4) {
      // Snow
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, TS, 8);
      ctx.fillStyle = 'rgba(200,230,255,0.5)';
      ctx.fillRect(x + 4, y + 2, TS - 8, 4);
    } else if (type === 5) {
      // Ice
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(x, y, TS, TS);
      // Shine lines
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + TS - 10, y + 10);
      ctx.moveTo(x + 8, y + TS - 8); ctx.lineTo(x + TS - 4, y + TS - 14);
      ctx.stroke();
    }
  }

  function drawMovingPlatform(ctx, x, y, w) {
    ctx.fillStyle = '#C8A060';
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = '#A07040';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 4, y + 1, w - 8, 2);
  }

  // ── Collectibles ──────────────────────────────────────────────────────
  function drawCollectibles(ctx, level, camX, camY, tick) {
    level.collectibles.forEach(c => {
      if (c.collected) return;
      const sx = c.x - camX;
      const sy = c.y - camY + Math.sin(tick * 0.05 + c.x) * 3;
      if (sx < -40 || sx > ctx.canvas.width + 40) return;
      // Glow pulse
      const glowR   = 20 + Math.sin(tick * 0.05 + c.x) * 4;
      const glowCol = c.type === 'pretzel' ? '200,150,50' : '255,200,50';
      const grd     = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
      grd.addColorStop(0, `rgba(${glowCol},0.5)`);
      grd.addColorStop(1, `rgba(${glowCol},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
      ctx.fill();
      if (c.type === 'pretzel') drawPretzel(ctx, sx, sy);
      else drawMug(ctx, sx, sy, tick);
    });
  }

  function drawPretzel(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    // Brown body
    ctx.strokeStyle = '#7B3F00';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Left loop
    ctx.arc(-6, -5, 7, Math.PI * 0.2, Math.PI * 1.6);
    // Right loop
    ctx.arc(6, -5, 7, Math.PI * 1.4, Math.PI * 0.8, true);
    ctx.stroke();
    // Bottom twist
    ctx.beginPath();
    ctx.moveTo(-7, 2); ctx.lineTo(-3, 6); ctx.lineTo(3, 6); ctx.lineTo(7, 2);
    ctx.stroke();
    // Salt dots
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(-8, -8, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -12, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -8, 2, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawMug(ctx, x, y, tick) {
    ctx.save();
    ctx.translate(x, y);
    // Mug body
    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.roundRect(-10, -14, 20, 22, 3);
    ctx.fill();
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Handle
    ctx.beginPath();
    ctx.arc(12, -4, 7, -Math.PI*0.4, Math.PI*0.4);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#8B6914';
    ctx.stroke();
    // Foam
    const foam = Math.sin(tick * 0.08) * 1;
    ctx.fillStyle = '#FFFAF0';
    ctx.beginPath();
    ctx.ellipse(0, -14, 11, 5 + foam, 0, 0, Math.PI * 2);
    ctx.fill();
    // Beer color
    ctx.fillStyle = '#DAA520';
    ctx.fillRect(-9, -10, 18, 15);
    ctx.restore();
  }

  // ── Enemies ───────────────────────────────────────────────────────────
  function drawEnemies(ctx, level, camX, camY, tick) {
    level.enemies.forEach(e => {
      if (!e.alive) return;
      const sx = e.x - camX;
      const sy = e.y - camY;
      if (sx < -60 || sx > ctx.canvas.width + 60) return;
      drawWiesnFigure(ctx, sx, sy, e.vx < 0 ? -1 : 1, tick);
    });
  }

  function drawWiesnFigure(ctx, x, y, facing, tick) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);

    const walk = Math.sin(tick * 0.18) * 10;

    // Body — Dirndl/Lederhosen
    ctx.fillStyle = '#8B0000'; // red dirndl
    ctx.fillRect(-8, -22, 16, 16);

    // Apron
    ctx.fillStyle = '#F0E68C';
    ctx.fillRect(-5, -20, 10, 12);

    // Head
    ctx.fillStyle = '#F4C2A0';
    ctx.beginPath();
    ctx.arc(0, -28, 8, 0, Math.PI * 2);
    ctx.fill();

    // Hat (Bavarian)
    ctx.fillStyle = '#228B22';
    ctx.fillRect(-9, -38, 18, 6);
    ctx.fillRect(-6, -42, 12, 6);
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(-3, -39, 6, 2); // hat band

    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(-3, -30, 2, 2);
    ctx.fillRect(1,  -30, 2, 2);

    // Legs
    ctx.fillStyle = '#4B3A1E';
    ctx.fillRect(-7, -6, 6, 14);  // left leg
    ctx.fillRect(1,  -6, 6, 14);  // right leg

    ctx.restore();
  }

  // ── Player ────────────────────────────────────────────────────────────
  function drawPlayer(ctx, player, camX, camY, tick) {
    const sx = player.x - camX;
    const sy = player.y - camY;

    // Invincibility flicker
    if (player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0) return;

    ctx.save();
    ctx.translate(sx + player.w / 2, sy + player.h);
    ctx.scale(player.facing * (player.scaleX || 1), player.scaleY || 1);

    const airOffset = player.onGround ? 0 : -4;
    const walkBob   = player.onGround && Math.abs(player.vx) > 0.5 ? Math.sin(tick * 0.2) * 2 : 0;
    const legSwing  = player.onGround && Math.abs(player.vx) > 0.5 ? Math.sin(tick * 0.2) * 12 : 0;

    // Shadow
    if (player.onGround) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(0, walkBob + airOffset - player.h);

    // Shoes
    ctx.fillStyle = '#3B2800';
    ctx.fillRect(-10, -5, 9, 5);
    ctx.fillRect(2, -5, 9, 5);

    // Legs (Lederhosen)
    const lLeg = player.onGround ? legSwing : 0;
    const rLeg = player.onGround ? -legSwing : 0;

    ctx.fillStyle = '#8B6914';
    // Left leg
    ctx.save();
    ctx.translate(-5, -14);
    ctx.rotate(lLeg * Math.PI / 180);
    ctx.fillRect(-4, 0, 8, 12);
    ctx.restore();
    // Right leg
    ctx.save();
    ctx.translate(5, -14);
    ctx.rotate(rLeg * Math.PI / 180);
    ctx.fillRect(-4, 0, 8, 12);
    ctx.restore();

    // Body — Lederhosen bib
    ctx.fillStyle = '#A0780A';
    ctx.fillRect(-9, -28, 18, 16);
    // Suspenders
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-6, -28, 3, 14);
    ctx.fillRect(3,  -28, 3, 14);

    // Shirt sleeves
    ctx.fillStyle = '#E8E8D8';
    ctx.fillRect(-13, -28, 7, 10);
    ctx.fillRect(6,   -28, 7, 10);

    // Head
    ctx.fillStyle = '#F4C2A0';
    ctx.beginPath();
    ctx.arc(0, -36, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#5C3A1E';
    ctx.fillRect(-9, -45, 18, 10);
    ctx.beginPath();
    ctx.arc(0, -44, 9, Math.PI, 0);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#FFF';
    ctx.fillRect(-5, -39, 4, 4);
    ctx.fillRect(1,  -39, 4, 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(-4, -38, 2, 2);
    ctx.fillRect(2,  -38, 2, 2);

    // Smile
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -34, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Hat — Bavarian
    ctx.fillStyle = '#2E5A2E';
    ctx.fillRect(-11, -53, 22, 7);
    ctx.fillRect(-8,  -59, 16, 8);
    ctx.fillStyle = '#CC5500';
    ctx.fillRect(-8, -52, 16, 2); // hat band
    // Feather
    ctx.fillStyle = '#F0F0F0';
    ctx.beginPath();
    ctx.ellipse(9, -57, 3, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Jump pose — arms up
    if (!player.onGround) {
      ctx.fillStyle = '#E8E8D8';
      ctx.save(); ctx.translate(-13, -30); ctx.rotate(-0.6); ctx.fillRect(-3, -8, 6, 10); ctx.restore();
      ctx.save(); ctx.translate(13, -30);  ctx.rotate(0.6);  ctx.fillRect(-3, -8, 6, 10); ctx.restore();
    }

    ctx.restore();
  }

  // ── Goal flag ─────────────────────────────────────────────────────────
  function drawGoal(ctx, level, camX, camY, tick) {
    const gx = level.goalX - camX;
    const gy = level.height - 6 * TS - camY;
    if (gx < -100 || gx > ctx.canvas.width + 100) return;

    // Pole
    ctx.fillStyle = '#888';
    ctx.fillRect(gx - 2, gy - TS * 4, 4, TS * 4);

    // Flag
    const wave = Math.sin(tick * 0.08) * 5;
    ctx.fillStyle = '#0055AA';
    ctx.beginPath();
    ctx.moveTo(gx + 2, gy - TS * 4);
    ctx.lineTo(gx + 34, gy - TS * 4 + 8 + wave);
    ctx.lineTo(gx + 2, gy - TS * 4 + 20);
    ctx.closePath();
    ctx.fill();
    // White diamond on flag
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(gx + 14, gy - TS * 4 + 7 + wave * 0.5);
    ctx.lineTo(gx + 20, gy - TS * 4 + 11 + wave * 0.5);
    ctx.lineTo(gx + 14, gy - TS * 4 + 15 + wave * 0.5);
    ctx.lineTo(gx + 8,  gy - TS * 4 + 11 + wave * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  // ── Overlay screens ───────────────────────────────────────────────────
  function drawMenu(ctx, w, h) {
    // Semi-dark overlay
    ctx.fillStyle = 'rgba(10, 20, 40, 0.88)';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#8B0000';
    ctx.shadowBlur = 12;
    ctx.fillText('Bavaria', w / 2, h * 0.3);
    ctx.font = 'bold 32px Georgia, serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Jump & Run', w / 2, h * 0.3 + 44);
    ctx.shadowBlur = 0;

    // Mountain silhouette decoration
    ctx.fillStyle = '#556B2F';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    for (let x = 0; x <= w; x += 60) {
      ctx.lineTo(x, h * 0.55 - 30 - Math.abs(Math.sin(x * 0.035)) * 50);
    }
    ctx.lineTo(w, h * 0.55); ctx.closePath(); ctx.fill();

    // Controls info
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(w/2 - 180, h * 0.56, 360, 130);
    ctx.fillStyle = '#DDD';
    ctx.font = '16px Georgia, serif';
    ctx.fillText('🎮 Steuerung', w / 2, h * 0.56 + 26);
    ctx.font = '14px Georgia, serif';
    ctx.fillStyle = '#BBB';
    ctx.fillText('← → / A D: Bewegen', w / 2, h * 0.56 + 52);
    ctx.fillText('Space / ↑ / W: Springen', w / 2, h * 0.56 + 72);
    ctx.fillText('🥨 = 10 Punkte   🍺 = Extra-Leben', w / 2, h * 0.56 + 96);
    ctx.fillText('Auf Gegner springen = besiegen!', w / 2, h * 0.56 + 116);

    // Start button
    const pulse = 0.95 + Math.sin(Date.now() * 0.004) * 0.05;
    ctx.save();
    ctx.translate(w / 2, h * 0.82);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.roundRect(-100, -22, 200, 44, 22); ctx.fill();
    ctx.fillStyle = '#5C3A00';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('▶  Spiel Starten', 0, 7);
    ctx.restore();

    ctx.fillStyle = '#888';
    ctx.font = '13px Georgia, serif';
    ctx.fillText('Drücke Enter oder Klicke zum Starten', w / 2, h * 0.93);
    ctx.textAlign = 'left';
  }

  function drawLevelComplete(ctx, w, h, levelName, score, nextLevel) {
    ctx.fillStyle = 'rgba(0, 60, 0, 0.82)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Level Geschafft!', w / 2, h * 0.35);

    ctx.fillStyle = '#FFF';
    ctx.font = '22px Georgia, serif';
    ctx.fillText(levelName, w / 2, h * 0.45);

    ctx.font = '18px Georgia, serif';
    ctx.fillStyle = '#DDD';
    ctx.fillText(`Punkte: ${score}`, w / 2, h * 0.55);

    if (nextLevel) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '20px Georgia, serif';
      ctx.fillText('Weiter → ' + nextLevel, w / 2, h * 0.68);
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.font = '22px Georgia, serif';
      ctx.fillText('🏆 Du hast gewonnen!', w / 2, h * 0.68);
    }

    ctx.fillStyle = '#AAA';
    ctx.font = '16px Georgia, serif';
    ctx.fillText('Enter / Klick zum Fortfahren', w / 2, h * 0.8);
    ctx.textAlign = 'left';
  }

  function drawGameOver(ctx, w, h, score) {
    ctx.fillStyle = 'rgba(80, 0, 0, 0.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', w / 2, h * 0.38);

    ctx.fillStyle = '#FFF';
    ctx.font = '24px Georgia, serif';
    ctx.fillText(`Punkte: ${score}`, w / 2, h * 0.52);

    ctx.fillStyle = '#FFD700';
    ctx.font = '20px Georgia, serif';
    ctx.fillText('Nochmal versuchen?', w / 2, h * 0.65);

    ctx.fillStyle = '#AAA';
    ctx.font = '16px Georgia, serif';
    ctx.fillText('Enter / Klick zum Fortfahren', w / 2, h * 0.78);
    ctx.textAlign = 'left';
  }

  function drawPauseHint(ctx, w) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = '13px Georgia, serif';
    ctx.fillText('ESC = Menü', 10, 20);
  }

  // ── Player trail ──────────────────────────────────────────────────────
  function drawPlayerTrail(ctx, trail, camX, camY) {
    for (const t of trail) {
      ctx.globalAlpha = t.a * 0.55;
      ctx.fillStyle   = '#E8D8A0';
      ctx.beginPath();
      ctx.ellipse(t.x - camX, t.y - camY, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Score popups ──────────────────────────────────────────────────────
  function drawScorePopups(ctx, popups, camX, camY) {
    ctx.font      = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    for (const p of popups) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle   = p.text.startsWith('+♥') ? '#FF8888' : '#FFD700';
      ctx.fillText(p.text, p.x - camX, p.y - camY);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign   = 'left';
  }

  // ── Level banner ──────────────────────────────────────────────────────
  function drawLevelBanner(ctx, name, alpha, w, h) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, h * 0.38, w, 64);
    ctx.fillStyle   = '#FFD700';
    ctx.font        = 'bold 28px Georgia, serif';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#8B0000';
    ctx.shadowBlur  = 8;
    ctx.fillText(name, w / 2, h * 0.38 + 42);
    ctx.shadowBlur  = 0;
    ctx.textAlign   = 'left';
    ctx.restore();
  }

  return {
    drawBackground,
    drawTilemap,
    drawCollectibles,
    drawEnemies,
    drawPlayer,
    drawGoal,
    drawMenu,
    drawLevelComplete,
    drawGameOver,
    drawPauseHint,
    drawPlayerTrail,
    drawScorePopups,
    drawLevelBanner,
  };
})();
