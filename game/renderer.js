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

    // World boundary wall at right edge
    const wallX = level.width - camX;
    if (wallX < ctx.canvas.width + 80) {
      const wallH = level.height;
      const wallW = 24;
      // Stone wall gradient
      const wGrd = ctx.createLinearGradient(wallX, 0, wallX + wallW, 0);
      wGrd.addColorStop(0, '#6B4C2A');
      wGrd.addColorStop(0.4, '#8B6914');
      wGrd.addColorStop(1, '#3A2010');
      ctx.fillStyle = wGrd;
      ctx.fillRect(wallX, -camY, wallW, wallH);
      // Brick lines
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      for (let by2 = 0; by2 < wallH; by2 += TS) {
        ctx.beginPath();
        ctx.moveTo(wallX, by2 - camY);
        ctx.lineTo(wallX + wallW, by2 - camY);
        ctx.stroke();
      }
      // Gold edge highlight
      ctx.fillStyle = 'rgba(200,146,42,0.6)';
      ctx.fillRect(wallX, -camY, 3, wallH);
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
    ctx.translate(0, -8);

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

    ctx.translate(0, walkBob + airOffset);

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
    const gy = level.height - 2 * TS - camY;  // ground surface
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

  // ── Shared helper — ornate rectangular border ─────────────────────────
  function drawOrnateRect(ctx, x, y, bw, bh, color, lw) {
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    ctx.strokeRect(x, y, bw, bh);
    const s = 14;
    [[x, y, 1, 1], [x+bw, y, -1, 1], [x, y+bh, 1, -1], [x+bw, y+bh, -1, -1]].forEach(([cx, cy, dx, dy]) => {
      ctx.lineWidth = lw + 1;
      ctx.beginPath();
      ctx.moveTo(cx + dx * s, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * s);
      ctx.stroke();
    });
  }

  // ── Overlay screens ───────────────────────────────────────────────────
  function drawMenu(ctx, w, h) {
    // Dark vignette overlay
    const vgrd = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.8);
    vgrd.addColorStop(0,   'rgba(10,4,0,0.55)');
    vgrd.addColorStop(1,   'rgba(0,0,0,0.92)');
    ctx.fillStyle = vgrd;
    ctx.fillRect(0, 0, w, h);

    // Horizontal gold rule top
    const ruleGrd = ctx.createLinearGradient(0, 0, w, 0);
    ruleGrd.addColorStop(0,   'rgba(200,146,42,0)');
    ruleGrd.addColorStop(0.3, 'rgba(200,146,42,0.9)');
    ruleGrd.addColorStop(0.7, 'rgba(200,146,42,0.9)');
    ruleGrd.addColorStop(1,   'rgba(200,146,42,0)');
    ctx.fillStyle = ruleGrd;
    ctx.fillRect(0, h * 0.16, w, 1.5);

    // Subtitle label
    ctx.font = '11px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#C8922A';
    ctx.textAlign = 'center';
    ctx.fillText('✦  BAVARIAN ADVENTURE  ✦', w / 2, h * 0.22);

    // Main title
    ctx.save();
    ctx.font = '700 58px "Cinzel Decorative", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#6B3C10';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 4;
    ctx.strokeStyle = '#6B3C10';
    ctx.lineWidth = 3;
    ctx.strokeText('BAVARIA', w / 2, h * 0.34);
    const tgrd = ctx.createLinearGradient(0, h * 0.27, 0, h * 0.36);
    tgrd.addColorStop(0, '#FFE07A');
    tgrd.addColorStop(0.5, '#C8922A');
    tgrd.addColorStop(1, '#FFE07A');
    ctx.fillStyle = tgrd;
    ctx.fillText('BAVARIA', w / 2, h * 0.34);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.font = '400 22px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#DDB86A';
    ctx.fillText('JUMP  &  RUN', w / 2, h * 0.41);
    ctx.restore();

    // Gold rule below title
    ctx.fillStyle = ruleGrd;
    ctx.fillRect(0, h * 0.45, w, 1.5);

    ctx.fillStyle = '#C8922A';
    ctx.textAlign = 'center';
    ctx.font = '10px Georgia';
    ctx.fillText('◆  ◆  ◆', w / 2, h * 0.49);

    // Controls panel
    const bx = w/2 - 200, by = h * 0.51, bw2 = 400, bh2 = 144;
    const boxGrd = ctx.createLinearGradient(bx, by, bx, by + bh2);
    boxGrd.addColorStop(0, 'rgba(100,55,8,0.72)');
    boxGrd.addColorStop(1, 'rgba(20,8,1,0.78)');
    ctx.fillStyle = boxGrd;
    ctx.beginPath(); ctx.roundRect(bx, by, bw2, bh2, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(200,146,42,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, bw2, bh2, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,225,100,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx+1, by+1, bw2-2, bh2-2, 5); ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '700 13px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#FFE07A';
    ctx.fillText('STEUERUNG', w/2, by + 24);
    ctx.font = '14px "Crimson Text", Georgia, serif';
    ctx.fillStyle = 'rgba(255,224,122,0.8)';
    const lines = [
      '← → / A D  —  Bewegen',
      'Leertaste / ↑ / W  —  Springen',
      '🥨 Brezel = 10 Pkt   🍺 Maßkrug = Extra-Leben',
      'Auf Gegner springen  =  besiegen!',
    ];
    lines.forEach((l, i) => ctx.fillText(l, w/2, by + 50 + i * 26));

    // Pulsing start button
    const pulse = 0.97 + Math.sin(Date.now() * 0.004) * 0.03;
    ctx.save();
    ctx.translate(w / 2, h * 0.84);
    ctx.scale(pulse, pulse);
    const btnGrd = ctx.createLinearGradient(-120, -24, -120, 24);
    btnGrd.addColorStop(0, 'rgba(220,155,30,0.96)');
    btnGrd.addColorStop(1, 'rgba(100,55,8,0.96)');
    ctx.fillStyle = btnGrd;
    ctx.beginPath(); ctx.roundRect(-120, -24, 240, 48, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,225,100,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-120, -24, 240, 48, 6); ctx.stroke();
    ctx.shadowColor = 'rgba(200,140,20,0.6)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#1A0A01';
    ctx.font = '700 17px "Cinzel", Georgia, serif';
    ctx.fillText('▶  SPIEL STARTEN', 0, 6);
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.fillStyle = 'rgba(200,146,42,0.5)';
    ctx.font = '12px "Crimson Text", Georgia, serif';
    ctx.fillText('Enter oder Klick zum Starten', w / 2, h * 0.94);
    ctx.textAlign = 'left';
  }

  function drawLevelComplete(ctx, w, h, levelName, score, nextLevel) {
    const vgrd = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.75);
    vgrd.addColorStop(0, 'rgba(40,20,0,0.6)');
    vgrd.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = vgrd;
    ctx.fillRect(0, 0, w, h);

    // Confetti dots
    const confettiColors = ['#FFE07A','#C8922A','#FF8844','#88CC44','#44AAFF'];
    const t = Date.now() * 0.0008;
    for (let i = 0; i < 28; i++) {
      const cx = ((Math.sin(i * 2.4 + t) * 0.5 + 0.5) * w * 1.1) - w * 0.05;
      const cy = ((Math.cos(i * 1.7 + t * 0.7) * 0.5 + 0.5) * h * 0.9);
      const r  = 3 + Math.sin(i * 3.1 + t) * 2;
      ctx.fillStyle = confettiColors[i % confettiColors.length];
      ctx.globalAlpha = 0.35 + Math.sin(i + t) * 0.15;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const rGrd = ctx.createLinearGradient(0, 0, w, 0);
    rGrd.addColorStop(0,    'rgba(200,146,42,0)');
    rGrd.addColorStop(0.35, 'rgba(200,146,42,0.8)');
    rGrd.addColorStop(0.65, 'rgba(200,146,42,0.8)');
    rGrd.addColorStop(1,    'rgba(200,146,42,0)');
    ctx.fillStyle = rGrd; ctx.fillRect(0, h*0.18, w, 1.5);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 54px "Cinzel Decorative", Georgia, serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 3;
    ctx.strokeStyle = '#6B3C10'; ctx.lineWidth = 3;
    ctx.strokeText('GESCHAFFT!', w/2, h * 0.32);
    const tg = ctx.createLinearGradient(0, h*0.26, 0, h*0.34);
    tg.addColorStop(0, '#FFE07A'); tg.addColorStop(0.5, '#C8922A'); tg.addColorStop(1, '#FFE07A');
    ctx.fillStyle = tg;
    ctx.fillText('GESCHAFFT!', w/2, h * 0.32);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.font = '400 16px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#DDB86A';
    ctx.fillText(levelName.toUpperCase(), w/2, h * 0.41);
    ctx.restore();

    ctx.fillStyle = rGrd; ctx.fillRect(0, h*0.45, w, 1.5);

    // Score panel
    const bx = w/2 - 160, by = h*0.48, bw2 = 320, bh2 = 80;
    const bGrd = ctx.createLinearGradient(bx, by, bx, by+bh2);
    bGrd.addColorStop(0, 'rgba(100,55,8,0.75)'); bGrd.addColorStop(1, 'rgba(20,8,1,0.8)');
    ctx.fillStyle = bGrd;
    ctx.beginPath(); ctx.roundRect(bx, by, bw2, bh2, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(200,146,42,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, bw2, bh2, 6); ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '13px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#C8922A';
    ctx.fillText('PUNKTE', w/2, by + 28);
    ctx.font = '700 30px "Cinzel Decorative", Georgia, serif';
    ctx.fillStyle = '#FFE07A';
    ctx.fillText(score.toString(), w/2, by + 64);

    ctx.font = '700 18px "Cinzel", Georgia, serif';
    if (nextLevel) {
      ctx.fillStyle = '#FFE07A';
      ctx.fillText('Weiter: ' + nextLevel, w/2, h * 0.72);
    } else {
      ctx.font = '700 22px "Cinzel Decorative", Georgia, serif';
      const tg2 = ctx.createLinearGradient(0, h*0.68, 0, h*0.76);
      tg2.addColorStop(0, '#FFE07A'); tg2.addColorStop(1, '#C8922A');
      ctx.fillStyle = tg2;
      ctx.fillText('🏆  DU HAST GEWONNEN!', w/2, h * 0.72);
    }

    ctx.fillStyle = 'rgba(200,146,42,0.5)';
    ctx.font = '13px "Crimson Text", Georgia, serif';
    ctx.fillText('Enter oder Klick zum Fortfahren', w/2, h * 0.88);
    ctx.textAlign = 'left';
  }

  function drawGameOver(ctx, w, h, score) {
    const vgrd = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.8);
    vgrd.addColorStop(0, 'rgba(60,0,0,0.65)');
    vgrd.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = vgrd;
    ctx.fillRect(0, 0, w, h);

    // Crack lines
    ctx.strokeStyle = 'rgba(180,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const len = 100 + Math.sin(i * 1.7) * 40;
      ctx.beginPath();
      ctx.moveTo(w/2 + Math.cos(angle) * 30, h/2 + Math.sin(angle) * 20);
      ctx.lineTo(w/2 + Math.cos(angle) * len, h/2 + Math.sin(angle) * len * 0.7);
      ctx.stroke();
    }

    const rGrd = ctx.createLinearGradient(0, 0, w, 0);
    rGrd.addColorStop(0,    'rgba(180,30,30,0)');
    rGrd.addColorStop(0.35, 'rgba(180,30,30,0.7)');
    rGrd.addColorStop(0.65, 'rgba(180,30,30,0.7)');
    rGrd.addColorStop(1,    'rgba(180,30,30,0)');
    ctx.fillStyle = rGrd; ctx.fillRect(0, h*0.2, w, 1.5);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 60px "Cinzel Decorative", Georgia, serif';
    ctx.shadowColor = 'rgba(200,0,0,0.8)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 4;
    ctx.strokeStyle = '#5A0000'; ctx.lineWidth = 4;
    ctx.strokeText('GAME OVER', w/2, h * 0.36);
    const tg = ctx.createLinearGradient(0, h*0.28, 0, h*0.38);
    tg.addColorStop(0, '#FF8888'); tg.addColorStop(0.5, '#CC2200'); tg.addColorStop(1, '#FF6666');
    ctx.fillStyle = tg;
    ctx.fillText('GAME OVER', w/2, h * 0.36);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.restore();

    ctx.fillStyle = rGrd; ctx.fillRect(0, h*0.41, w, 1.5);

    // Score panel
    const bx = w/2 - 150, by = h*0.45, bw2 = 300, bh2 = 76;
    const bGrd = ctx.createLinearGradient(bx, by, bx, by+bh2);
    bGrd.addColorStop(0, 'rgba(60,8,8,0.8)'); bGrd.addColorStop(1, 'rgba(10,2,2,0.85)');
    ctx.fillStyle = bGrd;
    ctx.beginPath(); ctx.roundRect(bx, by, bw2, bh2, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(180,30,30,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, bw2, bh2, 6); ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '13px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#CC5555';
    ctx.fillText('ENDPUNKTE', w/2, by + 26);
    ctx.font = '700 30px "Cinzel Decorative", Georgia, serif';
    ctx.fillStyle = '#FF8888';
    ctx.fillText(score.toString(), w/2, by + 62);

    ctx.font = '700 16px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#FFE07A';
    ctx.fillText('Nochmal versuchen?', w/2, h * 0.72);

    ctx.fillStyle = 'rgba(180,80,80,0.6)';
    ctx.font = '13px "Crimson Text", Georgia, serif';
    ctx.fillText('Enter oder Klick zum Fortfahren', w/2, h * 0.84);
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
