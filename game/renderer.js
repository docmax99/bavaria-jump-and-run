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
    castle: {
      skyTop:    '#1A1228',
      skyBot:    '#3A2860',
      mountain1: '#2A1E3E',
      mountain2: '#4A3870',
      ground:    '#4A3870',
      tileColors: { 1:'#4A3870', 2:'#5A4888', 3:'#C8A060', 4:'#DDEEFF', 5:'#AADDFF', 6:'#3E2E5A' },
    },
  };

  // ── Skins ─────────────────────────────────────────────────────────────
  const SKINS = [
    { name: 'Hans',    hat: '#2E5A2E', hatBand: '#CC5500', lederhosen: '#8B6914', bib: '#A0780A', shirt: '#E8E8D8', hair: '#5C3A1E', shoes: '#3B2800' },
    { name: 'Liesl',   hat: '#AA2020', hatBand: '#FFB0B0', lederhosen: '#C05070', bib: '#D06080', shirt: '#FFFFFF', hair: '#C8A000', shoes: '#4A2010' },
    { name: 'Söder König', hat: '#1A3A8A', hatBand: '#FFD700', lederhosen: '#1A3A8A', bib: '#2A4AAA', shirt: '#FFD700', hair: '#111111', shoes: '#111111', weisswurst: true },
    { name: 'Forst',   hat: '#1A1A1A', hatBand: '#446644', lederhosen: '#2A4A2A', bib: '#3A5A3A', shirt: '#CCCCCC', hair: '#222222', shoes: '#111111' },
  ];

  function drawMiniPlayer(ctx, skin, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    // Shoes
    ctx.fillStyle = skin.shoes;
    ctx.fillRect(-8, 0, 6, 4);
    ctx.fillRect(2,  0, 6, 4);
    // Legs
    ctx.fillStyle = skin.lederhosen;
    ctx.fillRect(-7, -10, 5, 10);
    ctx.fillRect(2,  -10, 5, 10);
    // Body bib
    ctx.fillStyle = skin.bib;
    ctx.fillRect(-7, -22, 14, 14);
    // Suspenders
    ctx.fillStyle = skin.lederhosen;
    ctx.fillRect(-5, -22, 2, 12);
    ctx.fillRect(3,  -22, 2, 12);
    // Shirt
    ctx.fillStyle = skin.shirt;
    ctx.fillRect(-10, -22, 4, 9);
    ctx.fillRect(6,   -22, 4, 9);
    // Weißwurst sword mini (Söder König only)
    if (skin.weisswurst) {
      ctx.save();
      ctx.translate(11, -17);
      ctx.rotate(-0.3);
      ctx.fillStyle = '#F5F0E0';
      ctx.beginPath(); ctx.roundRect(-2, -18, 4, 18, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(180,160,120,0.5)';
      ctx.lineWidth = 0.7;
      for (let i = -14; i < 0; i += 4) {
        ctx.beginPath(); ctx.arc(0, i, 2, 0.3, Math.PI - 0.3); ctx.stroke();
      }
      ctx.fillStyle = '#E0D8C0';
      ctx.beginPath(); ctx.ellipse(0, -18, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Head
    ctx.fillStyle = '#F4C2A0';
    ctx.beginPath(); ctx.arc(0, -29, 7, 0, Math.PI * 2); ctx.fill();
    // Hair
    ctx.fillStyle = skin.hair;
    ctx.beginPath(); ctx.arc(0, -30, 7, Math.PI, 0); ctx.fill();
    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(-3, -31, 2, 2);
    ctx.fillRect(1,  -31, 2, 2);
    // Hat brim
    ctx.fillStyle = skin.hat;
    ctx.fillRect(-9, -38, 18, 5);
    ctx.fillRect(-6, -44, 12, 7);
    // Hat band
    ctx.fillStyle = skin.hatBand;
    ctx.fillRect(-6, -37, 12, 2);
    ctx.restore();
  }

  // ── Background ───────────────────────────────────────────────────────
  function drawBackground(ctx, theme, camX, canvasW, canvasH) {
    const t = THEMES[theme];

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
    grad.addColorStop(0, t.skyTop);
    grad.addColorStop(1, t.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Stars for night themes
    if (theme === 'mountain' || theme === 'castle') {
      drawStars(ctx, camX * 0.02, canvasW, canvasH, theme);
    }

    // Far mountains (parallax 0.15)
    drawMountainRange(ctx, camX * 0.15, canvasW, canvasH, t.mountain2, 0.55, 80);
    // Near mountains (parallax 0.35)
    drawMountainRange(ctx, camX * 0.35, canvasW, canvasH, t.mountain1, 0.68, 60);
    // Mountain atmospheric haze at base
    if (theme === 'mountain') {
      const haze = ctx.createLinearGradient(0, canvasH * 0.55, 0, canvasH * 0.72);
      haze.addColorStop(0, 'rgba(100,140,210,0)');
      haze.addColorStop(1, 'rgba(80,120,200,0.22)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, canvasH * 0.55, canvasW, canvasH * 0.17);
    }

    // Trees / castle walls (parallax 0.55-0.6)
    if (theme === 'castle')        drawCastleWalls(ctx, camX * 0.4, canvasW, canvasH);
    else if (theme !== 'mountain') {
      drawTrees(ctx, camX * 0.55, canvasW, canvasH, theme); // far tree layer
      drawTrees(ctx, camX * 0.7,  canvasW, canvasH, theme); // near tree layer (darker, taller)
    }

    // Clouds (parallax 0.1)
    drawClouds(ctx, camX * 0.1, canvasW, canvasH, theme);
  }

  function drawStars(ctx, offsetX, w, h, theme) {
    const starColor = theme === 'castle' ? 'rgba(200,180,255,' : 'rgba(255,255,220,';
    // Deterministic positions using seed
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137.5 + offsetX * 0.3) % (w + 100) + w + 100) % (w + 100) - 50;
      const sy = (Math.sin(i * 2.6) * 0.5 + 0.5) * h * 0.45;
      const size = 0.5 + (Math.abs(Math.sin(i * 3.1)) * 1.2);
      const twinkle = 0.5 + Math.abs(Math.sin(i * 0.7 + offsetX * 0.001)) * 0.5;
      ctx.fillStyle = starColor + twinkle * 0.9 + ')';
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }
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

  function drawClouds(ctx, offsetX, w, h, theme) {
    const alpha = (theme === 'mountain' || theme === 'castle') ? 0.45 : 0.75;
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
      // Cloud shadow (slightly below, darker)
      ctx.fillStyle = `rgba(180,190,210,${alpha * 0.35})`;
      drawCloud(ctx, cx + 4, cy + 5, cw, ch * 0.7);
      // Cloud body
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      drawCloud(ctx, cx, cy, cw, ch);
    });
  }

  function drawCastleWalls(ctx, offsetX, w, h) {
    const baseY = h * 0.78;
    const step = 160;
    const count = Math.ceil(w / step) + 4;
    const startC = Math.floor(offsetX / step) - 1;
    ctx.fillStyle = '#2A1E40';
    for (let i = startC; i < startC + count; i++) {
      const x = i * step - (offsetX % step);
      const towerH = 70 + (Math.abs(Math.sin(i * 1.3)) * 30);
      // Tower body
      ctx.fillRect(x, baseY - towerH, 40, towerH);
      // Battlements
      for (let b = 0; b < 4; b++) {
        ctx.fillRect(x + b * 11, baseY - towerH - 14, 7, 14);
      }
      // Arch window
      ctx.fillStyle = '#1A0E2E';
      ctx.beginPath();
      ctx.arc(x + 20, baseY - towerH * 0.5, 7, Math.PI, 0);
      ctx.fillRect(x + 13, baseY - towerH * 0.5, 14, 10);
      ctx.fill();
      ctx.fillStyle = '#2A1E40';
    }
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

    // Collect visible tiles grouped by type (interleaved x,y pairs)
    const byType = {};
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const tile = map[r][c];
        if (tile === 0) continue;
        if (!byType[tile]) byType[tile] = [];
        byType[tile].push(c * TS - camX, r * TS - camY);
      }
    }

    // Pass 1: base fill per type (1 fillStyle change per type instead of per tile)
    for (const type of Object.keys(byType)) {
      ctx.fillStyle = colors[+type] || '#888';
      ctx.beginPath();
      const pos = byType[type];
      for (let i = 0; i < pos.length; i += 2) ctx.rect(pos[i], pos[i + 1], TS, TS);
      ctx.fill();
    }

    // Pass 2: shared bevel highlights (batched for ALL tiles at once)
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    for (const pos of Object.values(byType)) {
      for (let i = 0; i < pos.length; i += 2) {
        ctx.rect(pos[i], pos[i + 1], TS, 2);
        ctx.rect(pos[i], pos[i + 1], 2, TS);
      }
    }
    ctx.fill();

    // Pass 3: shared bevel shadows
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    for (const pos of Object.values(byType)) {
      for (let i = 0; i < pos.length; i += 2) {
        ctx.rect(pos[i], pos[i + 1] + TS - 2, TS, 2);
        ctx.rect(pos[i + 0] + TS - 2, pos[i + 1], 2, TS);
      }
    }
    ctx.fill();

    // Pass 4: type-specific details (batched per type)
    // Grass (1) — bright top strip + grass blades
    if (byType[1]) {
      const pos = byType[1];
      // Bright green top layer
      ctx.fillStyle = '#44CC44';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) ctx.rect(pos[i], pos[i + 1], TS, 7);
      ctx.fill();
      // Lighter highlight along very top
      ctx.fillStyle = 'rgba(100,255,80,0.35)';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) ctx.rect(pos[i], pos[i + 1], TS, 3);
      ctx.fill();
      // Grass blade strokes
      ctx.strokeStyle = '#22AA22';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) {
        const bx = pos[i], by = pos[i + 1];
        for (let b = 4; b < TS - 2; b += 6) {
          const lean = Math.sin(b * 0.7) * 2;
          ctx.moveTo(bx + b, by + 6);
          ctx.lineTo(bx + b + lean, by + 1);
        }
      }
      ctx.stroke();
      // Dark shadow band below grass
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) ctx.rect(pos[i], pos[i + 1] + 7, TS, 3);
      ctx.fill();
    }
    // Stone (2) — mortar lines + slight texture
    if (byType[2]) {
      const pos = byType[2];
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) {
        const x = pos[i], y = pos[i + 1];
        // Horizontal mortar
        ctx.moveTo(x,      y + TS / 2); ctx.lineTo(x + TS,  y + TS / 2);
        // Vertical — offset every other row for brickwork feel
        const col = Math.round(x / TS);
        const off = (col % 2 === 0) ? 0 : TS / 2;
        ctx.moveTo(x + off, y);          ctx.lineTo(x + off, y + TS / 2);
      }
      ctx.stroke();
      // Pebble detail
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) {
        const x = pos[i], y = pos[i + 1];
        ctx.rect(x + 4,       y + 4,       TS / 2 - 6, TS / 2 - 6);
        ctx.rect(x + TS / 2 + 3, y + TS / 2 + 3, TS / 2 - 6, TS / 2 - 6);
      }
      ctx.fill();
    }
    // Wood (3)
    if (byType[3]) {
      const pos = byType[3];
      ctx.fillStyle = '#A07040';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) ctx.rect(pos[i], pos[i + 1], TS, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) ctx.rect(pos[i] + 4, pos[i + 1] + 2, TS - 8, 3);
      ctx.fill();
      ctx.fillStyle = '#7A5530';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) {
        for (let j = 0; j < 3; j++) ctx.rect(pos[i] + 6 + j * 10, pos[i + 1] + 1, 2, 8);
      }
      ctx.fill();
    }
    // Snow (4)
    if (byType[4]) {
      const pos = byType[4];
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) ctx.rect(pos[i], pos[i + 1], TS, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(200,230,255,0.5)';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) ctx.rect(pos[i] + 4, pos[i + 1] + 2, TS - 8, 4);
      ctx.fill();
    }
    // Ice (5)
    if (byType[5]) {
      const pos = byType[5];
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) ctx.rect(pos[i], pos[i + 1], TS, TS);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) {
        const x = pos[i], y = pos[i + 1];
        ctx.moveTo(x + 4, y + 4);       ctx.lineTo(x + TS - 10, y + 10);
        ctx.moveTo(x + 8, y + TS - 8);  ctx.lineTo(x + TS - 4,  y + TS - 14);
      }
      ctx.stroke();
    }
    // Castle (6)
    if (byType[6]) {
      const pos = byType[6];
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) {
        const x = pos[i], y = pos[i + 1];
        ctx.rect(x + 0.5, y + 0.5, TS - 1, TS - 1);
        ctx.moveTo(x + TS / 3, y + 0.5);      ctx.lineTo(x + TS / 3,     y + TS / 2 - 1);
        ctx.moveTo(x + 0.5,    y + TS / 2);   ctx.lineTo(x + 2 * TS / 3, y + TS / 2);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      for (let i = 0; i < pos.length; i += 2) ctx.rect(pos[i], pos[i + 1], TS, 2);
      ctx.fill();
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
      ctx.beginPath();
      for (let by2 = 0; by2 < wallH; by2 += TS) {
        ctx.moveTo(wallX, by2 - camY);
        ctx.lineTo(wallX + wallW, by2 - camY);
      }
      ctx.stroke();
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
      const sx       = c.x - camX;
      if (sx < -40 || sx > ctx.canvas.width + 40) return;
      const sinVal   = Math.sin(tick * 0.05 + c.x);
      const sy       = c.y - camY + sinVal * 3;
      // Glow pulse
      const glowR    = 20 + sinVal * 4;
      const glowCol = c.type === 'pretzel'    ? '200,150,50'
                    : c.type === 'mug'         ? '255,200,50'
                    : c.type === 'speedboost'  ? '255,220,0'
                    :                            '100,220,255'; // fly
      const grd     = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
      grd.addColorStop(0, `rgba(${glowCol},0.6)`);
      grd.addColorStop(1, `rgba(${glowCol},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
      ctx.fill();
      if (c.type === 'pretzel')   drawPretzel(ctx, sx, sy);
      else if (c.type === 'mug')  drawMug(ctx, sx, sy, tick);
      else if (c.type === 'speedboost') drawSpeedBoostIcon(ctx, sx, sy, tick);
      else drawFlyIcon(ctx, sx, sy, tick);
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

  function drawSpeedBoostIcon(ctx, x, y, tick) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = 1 + Math.sin(tick * 0.12) * 0.12;
    ctx.scale(pulse, pulse);
    // Lightning bolt
    ctx.fillStyle = '#FFE020';
    ctx.beginPath();
    ctx.moveTo(4, -14); ctx.lineTo(-3, -2); ctx.lineTo(3, -2);
    ctx.lineTo(-4, 14); ctx.lineTo(3, 2);   ctx.lineTo(-3, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FF8800';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawFlyIcon(ctx, x, y, tick) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(tick * 0.1) * 2;
    ctx.translate(0, bob);
    ctx.fillStyle = '#AAEEFF';
    // Left wing
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(-16, -12, -20, 2); ctx.quadraticCurveTo(-11, 7, 0, 0);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(16, -12, 20, 2); ctx.quadraticCurveTo(11, 7, 0, 0);
    ctx.fill();
    // Body
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Enemies ───────────────────────────────────────────────────────────
  function drawEnemies(ctx, level, camX, camY, tick) {
    level.enemies.forEach(e => {
      if (!e.alive) return;
      const sx = e.x - camX;
      const sy = e.y - camY;
      if (sx < -80 || sx > ctx.canvas.width + 80) return;
      if (e.isBoss)         drawBoss(ctx, sx, sy, e, tick);
      else if (e.type === 'bat')    drawBat(ctx, sx, sy, e, tick);
      else if (e.type === 'turtle') drawTurtle(ctx, sx, sy, e, tick);
      else                  drawWiesnFigure(ctx, sx, sy, e.vx < 0 ? -1 : 1, tick);
    });
  }

  function drawBat(ctx, x, y, e, tick) {
    ctx.save();
    ctx.translate(x, y);
    const facing = e.vx < 0 ? -1 : 1;
    ctx.scale(facing, 1);
    // Body
    ctx.fillStyle = '#2A0A3A';
    ctx.beginPath();
    ctx.ellipse(0, -14, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings (flap with tick)
    const flap = Math.sin(tick * 0.25) * 10;
    ctx.fillStyle = '#4A1A5E';
    // Left wing
    ctx.beginPath();
    ctx.moveTo(-2, -14);
    ctx.quadraticCurveTo(-22, -20 + flap, -28, -8 + flap);
    ctx.quadraticCurveTo(-14, -12, -2, -14);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(2, -14);
    ctx.quadraticCurveTo(22, -20 + flap, 28, -8 + flap);
    ctx.quadraticCurveTo(14, -12, 2, -14);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#FF2020';
    ctx.fillRect(-4, -17, 3, 3);
    ctx.fillRect(1,  -17, 3, 3);
    // Ears
    ctx.fillStyle = '#2A0A3A';
    ctx.beginPath();
    ctx.moveTo(-6, -20); ctx.lineTo(-10, -28); ctx.lineTo(-2, -21); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6,  -20); ctx.lineTo(10,  -28); ctx.lineTo(2,  -21); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawTurtle(ctx, x, y, e, tick) {
    ctx.save();
    ctx.translate(x, y);
    const facing = e.vx < 0 ? -1 : 1;
    ctx.scale(facing, 1);
    if (e.retreated) {
      // Shell only — pulled in
      ctx.fillStyle = '#2E6B2E';
      ctx.beginPath(); ctx.ellipse(0, -12, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.2;
      // Shell pattern
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -2);  ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, -12); ctx.lineTo(14, -12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(9, -4);  ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, -20); ctx.lineTo(-9, -4);  ctx.stroke();
    } else {
      // Legs
      ctx.fillStyle = '#3A7A3A';
      ctx.fillRect(-14, -8, 6, 10);
      ctx.fillRect(8,   -8, 6, 10);
      // Shell
      ctx.fillStyle = '#2E6B2E';
      ctx.beginPath(); ctx.ellipse(0, -16, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -6);  ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-13, -16); ctx.lineTo(13, -16); ctx.stroke();
      // Head
      ctx.fillStyle = '#5A9A5A';
      ctx.beginPath(); ctx.ellipse(14, -18, 7, 6, 0.3, 0, Math.PI * 2); ctx.fill();
      // Eye
      ctx.fillStyle = '#111';
      ctx.fillRect(17, -21, 2, 2);
    }
    ctx.restore();
  }

  function drawBoss(ctx, x, y, boss, tick) {
    ctx.save();
    ctx.translate(x, y);
    const facing = boss.vx < 0 ? -1 : 1;
    ctx.scale(facing, 1);

    // Legs — armoured, wide
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(-20, -20, 15, 22);
    ctx.fillRect(5,   -20, 15, 22);

    // Body — dark plate armour
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(-24, -52, 48, 34);
    // Armour highlight strips
    ctx.fillStyle = '#3A3A5E';
    ctx.fillRect(-22, -50, 8, 30);
    ctx.fillRect(14,  -50, 8, 30);
    // Red shoulder pads
    ctx.fillStyle = '#880000';
    ctx.fillRect(-28, -52, 10, 8);
    ctx.fillRect(18,  -52, 10, 8);
    // Belly gem (flashes in phase 2)
    ctx.fillStyle = boss.hp <= 1 ? '#FF4400' : '#CC0000';
    ctx.beginPath(); ctx.arc(0, -38, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5; ctx.stroke();

    // Head
    ctx.fillStyle = '#F0B090';
    ctx.beginPath(); ctx.arc(0, -58, 11, 0, Math.PI * 2); ctx.fill();
    // Angry eyes (glow red in phase 2)
    ctx.fillStyle = boss.hp <= 1 ? '#FF0000' : '#220000';
    ctx.fillRect(-5, -62, 3, 3);
    ctx.fillRect(2,  -62, 3, 3);
    // Grin
    ctx.strokeStyle = '#220000';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-4, -54); ctx.lineTo(4, -54); ctx.stroke();

    // Horned helmet
    ctx.fillStyle = '#111128';
    ctx.fillRect(-13, -72, 26, 16);
    // Horns
    ctx.beginPath();
    ctx.moveTo(-11, -72); ctx.lineTo(-18, -88); ctx.lineTo(-6, -74);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(11,  -72); ctx.lineTo(18,  -88); ctx.lineTo(6,  -74);
    ctx.closePath(); ctx.fill();
    // Visor slit
    ctx.fillStyle = '#CC0000';
    ctx.fillRect(-9, -68, 18, 3);

    ctx.restore();
  }

  function drawWiesnFigure(ctx, x, y, facing, tick) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    ctx.translate(0, -8);

    const walk     = Math.sin(tick * 0.2) * 12;  // leg swing angle (degrees)
    const armSwing = Math.sin(tick * 0.2) * 0.45;
    const bob      = Math.abs(Math.sin(tick * 0.2)) * 1.5; // vertical body bob

    ctx.translate(0, -bob);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0, bob + 14, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();

    // Legs with swing
    ctx.fillStyle = '#4B3A1E';
    ctx.save(); ctx.translate(-4, -6); ctx.rotate(walk * Math.PI / 180);
    ctx.fillRect(-3, 0, 6, 13); ctx.restore();
    ctx.save(); ctx.translate(4,  -6); ctx.rotate(-walk * Math.PI / 180);
    ctx.fillRect(-3, 0, 6, 13); ctx.restore();
    // Shoes
    ctx.fillStyle = '#2A1E0E';
    ctx.save(); ctx.translate(-4, -6); ctx.rotate(walk * Math.PI / 180);
    ctx.fillRect(-4, 11, 8, 4); ctx.restore();
    ctx.save(); ctx.translate(4,  -6); ctx.rotate(-walk * Math.PI / 180);
    ctx.fillRect(-4, 11, 8, 4); ctx.restore();

    // Body — red Dirndl
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(-8, -22, 16, 16);
    // Apron
    ctx.fillStyle = '#F0E68C';
    ctx.fillRect(-5, -20, 10, 12);
    // White blouse sleeves (animated arm swing)
    ctx.fillStyle = '#F5F5F5';
    ctx.save(); ctx.translate(-10, -20); ctx.rotate(-armSwing);
    ctx.fillRect(-3, -7, 6, 9); ctx.restore();
    ctx.save(); ctx.translate(10,  -20); ctx.rotate(armSwing);
    ctx.fillRect(-3, -7, 6, 9); ctx.restore();
    // Dirndl bodice trim
    ctx.fillStyle = '#AA0000';
    ctx.fillRect(-8, -22, 16, 4);

    // Head
    ctx.fillStyle = '#F4C2A0';
    ctx.beginPath();
    ctx.arc(0, -28, 8, 0, Math.PI * 2);
    ctx.fill();

    // Hair (braids)
    ctx.fillStyle = '#8B5E1A';
    ctx.beginPath(); ctx.arc(0, -32, 8, Math.PI, 0); ctx.fill();
    ctx.fillRect(-8, -34, 4, 8);  // left braid
    ctx.fillRect(4,  -34, 4, 8);  // right braid

    // Hat (Bavarian)
    ctx.fillStyle = '#228B22';
    ctx.fillRect(-9, -38, 18, 6);
    ctx.fillRect(-6, -42, 12, 6);
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(-5, -38, 10, 2); // hat band
    // Feather
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(7, -41, 2, 6, -0.3, 0, Math.PI * 2); ctx.fill();

    // Eyes
    ctx.fillStyle = '#FFF';
    ctx.fillRect(-4, -31, 3, 3);
    ctx.fillRect(1,  -31, 3, 3);
    ctx.fillStyle = '#222';
    ctx.fillRect(-3, -30, 2, 2);
    ctx.fillRect(2,  -30, 2, 2);
    // Rosy cheeks
    ctx.fillStyle = 'rgba(240,100,100,0.3)';
    ctx.beginPath(); ctx.arc(-5, -27, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5,  -27, 3, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  // ── Player ────────────────────────────────────────────────────────────
  function drawPlayer(ctx, player, camX, camY, tick, skinIndex) {
    const sx = player.x - camX;
    const sy = player.y - camY;
    const skin = SKINS[skinIndex] || SKINS[0];

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
    ctx.fillStyle = skin.shoes;
    ctx.fillRect(-10, -5, 9, 5);
    ctx.fillRect(2, -5, 9, 5);

    // Legs (Lederhosen)
    const lLeg = player.onGround ? legSwing : 0;
    const rLeg = player.onGround ? -legSwing : 0;

    ctx.fillStyle = skin.lederhosen;
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
    ctx.fillStyle = skin.bib;
    ctx.fillRect(-9, -28, 18, 16);
    // Suspenders
    ctx.fillStyle = skin.lederhosen;
    ctx.fillRect(-6, -28, 3, 14);
    ctx.fillRect(3,  -28, 3, 14);

    // Shirt sleeves
    ctx.fillStyle = skin.shirt;
    ctx.fillRect(-13, -28, 7, 10);
    ctx.fillRect(6,   -28, 7, 10);

    // Weißwurst sword (Söder König only)
    if (skin.weisswurst) {
      ctx.save();
      ctx.translate(14, -22);
      ctx.rotate(-0.3);
      // Wurst body (white sausage — off-white)
      ctx.fillStyle = '#F5F0E0';
      ctx.beginPath();
      ctx.roundRect(-3, -28, 6, 28, 3);
      ctx.fill();
      // Wurst skin texture lines
      ctx.strokeStyle = 'rgba(180,160,120,0.5)';
      ctx.lineWidth = 1;
      for (let i = -22; i < 0; i += 6) {
        ctx.beginPath();
        ctx.arc(0, i, 3, 0.3, Math.PI - 0.3);
        ctx.stroke();
      }
      // Wurst end nubs
      ctx.fillStyle = '#E0D8C0';
      ctx.beginPath(); ctx.ellipse(0, -28, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Head
    ctx.fillStyle = '#F4C2A0';
    ctx.beginPath();
    ctx.arc(0, -36, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = skin.hair;
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
    ctx.fillStyle = skin.hat;
    ctx.fillRect(-11, -53, 22, 7);
    ctx.fillRect(-8,  -59, 16, 8);
    ctx.fillStyle = skin.hatBand;
    ctx.fillRect(-8, -52, 16, 2); // hat band
    // Feather
    ctx.fillStyle = '#F0F0F0';
    ctx.beginPath();
    ctx.ellipse(9, -57, 3, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Arms — swing while walking, or raise when attacking/jumping
    if (player.attackTimer > 0) {
      // Attack pose: front arm extended to hold sword, back arm pulled back
      ctx.fillStyle = skin.shirt;
      ctx.save(); ctx.translate(-13, -30); ctx.rotate(0.4);  ctx.fillRect(-3, -8, 6, 10); ctx.restore();
      ctx.save(); ctx.translate(13, -28);  ctx.rotate(-0.8); ctx.fillRect(-3, -8, 6, 10); ctx.restore();
    } else if (!player.onGround) {
      ctx.fillStyle = skin.shirt;
      ctx.save(); ctx.translate(-13, -30); ctx.rotate(-0.6); ctx.fillRect(-3, -8, 6, 10); ctx.restore();
      ctx.save(); ctx.translate(13, -30);  ctx.rotate(0.6);  ctx.fillRect(-3, -8, 6, 10); ctx.restore();
    } else {
      // Walking arm swing
      ctx.fillStyle = skin.shirt;
      const armSwing = player.onGround && Math.abs(player.vx) > 0.5 ? Math.sin(tick * 0.2) * 0.5 : 0;
      ctx.save(); ctx.translate(-13, -28); ctx.rotate(-armSwing); ctx.fillRect(-3, -8, 6, 10); ctx.restore();
      ctx.save(); ctx.translate(13,  -28); ctx.rotate( armSwing); ctx.fillRect(-3, -8, 6, 10); ctx.restore();
    }

    // ── Sword ──────────────────────────────────────────────────────────
    if (player.attackTimer > 0) {
      drawSwordSwing(ctx, player);
    } else if (!skin.weisswurst) {
      // Idle sword at hip (sheathed look)
      ctx.save();
      ctx.translate(13, -16);
      ctx.rotate(0.25);
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(-1.5, -14, 3, 14);
      ctx.fillStyle = '#C8A020';
      ctx.fillRect(-5, -1, 10, 3);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawSwordSwing(ctx, player) {
    const dur      = player.comboCount === 3 ? 22 : 15;
    const progress = 1 - player.attackTimer / dur; // 0→1 over animation

    ctx.save();
    ctx.translate(13, -22); // sword hand (in facing-scaled space, positive = forward)

    let angle;
    if (player.comboCount === 1) {
      angle = -1.7 + progress * 2.4;   // forward slash: back→front
    } else if (player.comboCount === 2) {
      angle = 0.5 - progress * 2.6;    // rising slash: low→high
    } else {
      angle = -2.0 + progress * 4.0;   // heavy slam: overhead→down
    }
    ctx.rotate(angle);

    const bladeLen = player.comboCount === 3 ? 36 : 28;

    // Swing arc trail
    if (progress > 0.08 && progress < 0.72) {
      const alpha = (0.72 - progress) * 1.1;
      const trailOffset = player.comboCount === 2 ? -0.7 : 0.7;
      const trailAngle  = angle - trailOffset;
      ctx.save();
      ctx.rotate(-angle); // undo blade rotation
      ctx.rotate(trailAngle + (player.comboCount === 2 ? 0 : 0)); // apply trail angle
      ctx.fillStyle = `rgba(180,210,255,${alpha * 0.55})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, bladeLen, -Math.PI * 0.05, Math.PI * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Re-rotate for blade
      ctx.rotate(0);
    }

    // Handle
    ctx.fillStyle = '#6B4A1A';
    ctx.fillRect(-2.5, 2, 5, 8);
    // Grip wrap
    ctx.strokeStyle = '#3A2808';
    ctx.lineWidth = 1;
    for (let i = 3; i < 9; i += 3) {
      ctx.beginPath(); ctx.moveTo(-2.5, i); ctx.lineTo(2.5, i); ctx.stroke();
    }
    // Crossguard
    ctx.fillStyle = '#C8A020';
    ctx.fillRect(-7, -1, 14, 4);
    ctx.fillStyle = '#FFD740';
    ctx.fillRect(-6, -0.5, 12, 2);

    // Blade with gradient
    const bGrd = ctx.createLinearGradient(-2, 0, 2, -bladeLen);
    bGrd.addColorStop(0,   '#B0B8C8');
    bGrd.addColorStop(0.4, '#E8F0FF');
    bGrd.addColorStop(1,   '#9098A8');
    ctx.fillStyle = bGrd;
    ctx.beginPath();
    ctx.moveTo(-2.5, 0);
    ctx.lineTo(-1.5, -bladeLen);
    ctx.lineTo(0, -bladeLen - 5);
    ctx.lineTo(1.5, -bladeLen);
    ctx.lineTo(2.5, 0);
    ctx.closePath();
    ctx.fill();

    // Blade fuller (center groove)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-0.5, -3); ctx.lineTo(-0.5, -bladeLen + 5); ctx.stroke();

    // Glint flash on active frames
    if (progress < 0.35) {
      const g = ctx.createRadialGradient(0, -bladeLen + 5, 0, 0, -bladeLen + 5, 8);
      g.addColorStop(0, 'rgba(255,255,255,0.85)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -bladeLen + 5, 8, 0, Math.PI * 2); ctx.fill();
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
  function drawMenu(ctx, w, h, highscore, selectedSkin, leaderboard) {
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
    ctx.fillText('✦  BAVARIAN ADVENTURE  ✦', w / 2, h * 0.17);

    // Main title
    ctx.save();
    ctx.font = '700 52px "Cinzel Decorative", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#6B3C10';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 4;
    ctx.strokeStyle = '#6B3C10';
    ctx.lineWidth = 3;
    ctx.strokeText('BAVARIA', w / 2, h * 0.28);
    const tgrd = ctx.createLinearGradient(0, h * 0.20, 0, h * 0.30);
    tgrd.addColorStop(0, '#FFE07A');
    tgrd.addColorStop(0.5, '#C8922A');
    tgrd.addColorStop(1, '#FFE07A');
    ctx.fillStyle = tgrd;
    ctx.fillText('BAVARIA', w / 2, h * 0.28);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.font = '400 20px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#DDB86A';
    ctx.fillText('JUMP  &  RUN', w / 2, h * 0.35);
    ctx.restore();

    // Gold rule below title
    ctx.fillStyle = ruleGrd;
    ctx.fillRect(0, h * 0.39, w, 1.5);

    // ── Two-column layout ────────────────────────────────────────────────
    const colY  = h * 0.42;       // top of both panels
    const colH  = h * 0.46;       // panel height
    const colW  = w / 2 - 30;     // each column width
    const colPad = 20;            // horizontal padding from edges

    function drawPanel(px, py, pw, ph) {
      const pgrd = ctx.createLinearGradient(px, py, px, py + ph);
      pgrd.addColorStop(0, 'rgba(100,55,8,0.70)');
      pgrd.addColorStop(1, 'rgba(20,8,1,0.80)');
      ctx.fillStyle = pgrd;
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(200,146,42,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 6); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,225,100,0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(px+1, py+1, pw-2, ph-2, 5); ctx.stroke();
    }

    // ── Left panel: Bestenliste or Controls ──────────────────────────────
    const lx = colPad, lw = colW;
    drawPanel(lx, colY, lw, colH);

    ctx.textAlign = 'center';

    if (leaderboard && leaderboard.length > 0) {
      // ── Leaderboard ────────────────────────────────────────────────────
      ctx.font = '700 12px "Cinzel", Georgia, serif';
      ctx.fillStyle = '#FFE07A';
      ctx.fillText('🏆  BESTENLISTE', lx + lw/2, colY + 22);

      const medals    = ['🥇', '🥈', '🥉'];
      const rowCount  = Math.min(leaderboard.length, 8);
      const rowH      = (colH - 44) / rowCount;

      leaderboard.slice(0, rowCount).forEach((entry, i) => {
        const ey = colY + 38 + i * rowH + rowH * 0.62;
        const isTop3 = i < 3;

        // Row highlight for top 3
        if (isTop3) {
          const alpha = 0.06 - i * 0.015;
          ctx.fillStyle = `rgba(255,215,0,${alpha})`;
          ctx.fillRect(lx + 6, colY + 36 + i * rowH, lw - 12, rowH);
        }

        // Rank / medal
        ctx.textAlign = 'left';
        ctx.font = isTop3 ? '13px serif' : '10px "Cinzel",Georgia,serif';
        ctx.fillStyle = i === 0 ? '#FFD700' : i === 1 ? '#C8C8C8' : i === 2 ? '#CD7F32' : 'rgba(255,200,80,0.45)';
        ctx.fillText(medals[i] || (i + 1) + '.', lx + 12, ey);

        // Name
        ctx.font = isTop3 ? '700 11px "Cinzel",Georgia,serif' : '11px "Cinzel",Georgia,serif';
        ctx.fillStyle = isTop3 ? '#FFE07A' : 'rgba(255,224,122,0.7)';
        ctx.fillText(String(entry.name).slice(0, 13), lx + 38, ey);

        // Score
        ctx.textAlign = 'right';
        ctx.font = isTop3 ? '700 11px "Cinzel",Georgia,serif' : '11px "Cinzel",Georgia,serif';
        ctx.fillStyle = isTop3 ? '#FFD700' : 'rgba(255,200,80,0.55)';
        ctx.fillText(entry.score, lx + lw - 10, ey);
      });
      ctx.textAlign = 'left';
    } else {
      // ── Controls fallback ──────────────────────────────────────────────
      ctx.font = '700 12px "Cinzel", Georgia, serif';
      ctx.fillStyle = '#FFE07A';
      ctx.fillText('STEUERUNG', lx + lw/2, colY + 22);

      const subLines = [
        ['← → / A D',       'Bewegen'],
        ['Leertaste / ↑',   'Springen'],
        ['🥨 Brezel',        '= 10 Pkt'],
        ['🍺 Maßkrug',       '= Leben'],
        ['Gegner springen',  '= besiegen'],
      ];
      ctx.font = '12px "Crimson Text", Georgia, serif';
      subLines.forEach(([left, right], i) => {
        const lineY = colY + 44 + i * 22;
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,224,122,0.85)';
        ctx.fillText(left,  lx + lw/2 - 6,  lineY);
        ctx.fillStyle = 'rgba(200,146,42,0.6)';
        ctx.fillText('—',   lx + lw/2,       lineY);
        ctx.fillStyle = 'rgba(255,224,122,0.85)';
        ctx.textAlign = 'left';
        ctx.fillText(right, lx + lw/2 + 6,  lineY);
      });
      ctx.textAlign = 'center';
      ctx.font = '11px "Crimson Text", Georgia, serif';
      ctx.fillStyle = 'rgba(200,146,42,0.55)';
      ctx.fillText('Doppelsprung & Wandsprung', lx + lw/2, colY + colH - 12);
    }

    // ── Right panel: Skin selector ───────────────────────────────────────
    const rx = w/2 + 10, rw = colW;
    drawPanel(rx, colY, rw, colH);

    ctx.textAlign = 'center';
    ctx.font = '700 12px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#FFE07A';
    ctx.fillText('CHARAKTER', rx + rw/2, colY + 22);
    ctx.font = '9px "Cinzel", Georgia, serif';
    ctx.fillStyle = 'rgba(200,146,42,0.5)';
    ctx.fillText('◀ wählen mit ← → ▶', rx + rw/2, colY + 36);

    // 2×2 grid of skin boxes
    const skinBW = (rw - 30) / 2;  // ~170px each
    const skinBH = (colH - 52) / 2 - 4;  // ~85px each
    const skinGapX = 10, skinGapY = 6;

    for (let i = 0; i < SKINS.length; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const bxi = rx + 10 + col * (skinBW + skinGapX);
      const byi = colY + 44 + row * (skinBH + skinGapY);
      const sel = i === (selectedSkin || 0);

      const bgG = ctx.createLinearGradient(bxi, byi, bxi, byi + skinBH);
      bgG.addColorStop(0, 'rgba(100,55,8,0.72)');
      bgG.addColorStop(1, 'rgba(20,8,1,0.78)');
      ctx.fillStyle = bgG;
      ctx.beginPath(); ctx.roundRect(bxi, byi, skinBW, skinBH, 4); ctx.fill();
      ctx.strokeStyle = sel ? 'rgba(255,220,80,0.95)' : 'rgba(200,146,42,0.28)';
      ctx.lineWidth   = sel ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(bxi, byi, skinBW, skinBH, 4); ctx.stroke();
      if (sel) {
        ctx.fillStyle = 'rgba(255,240,100,0.07)';
        ctx.beginPath(); ctx.roundRect(bxi, byi, skinBW, skinBH, 4); ctx.fill();
      }
      drawMiniPlayer(ctx, SKINS[i], bxi + skinBW/2, byi + skinBH - 14);
      ctx.textAlign = 'center';
      ctx.font = sel ? '700 9px "Cinzel", Georgia, serif' : '9px "Cinzel", Georgia, serif';
      ctx.fillStyle = sel ? '#FFE07A' : 'rgba(200,146,42,0.6)';
      ctx.fillText(SKINS[i].name.toUpperCase(), bxi + skinBW/2, byi + skinBH - 3);
    }

    // ── Start button ─────────────────────────────────────────────────────
    const btnY = colY + colH + 16;
    const pulse = 0.97 + Math.sin(Date.now() * 0.004) * 0.03;
    ctx.save();
    ctx.translate(w / 2, btnY + 22);
    ctx.scale(pulse, pulse);
    const btnGrd = ctx.createLinearGradient(-130, -22, -130, 22);
    btnGrd.addColorStop(0, 'rgba(220,155,30,0.96)');
    btnGrd.addColorStop(1, 'rgba(100,55,8,0.96)');
    ctx.fillStyle = btnGrd;
    ctx.beginPath(); ctx.roundRect(-130, -22, 260, 44, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,225,100,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-130, -22, 260, 44, 6); ctx.stroke();
    ctx.shadowColor = 'rgba(200,140,20,0.6)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#1A0A01';
    ctx.font = '700 16px "Cinzel", Georgia, serif';
    ctx.fillText('▶  SPIEL STARTEN', 0, 6);
    ctx.shadowBlur = 0;
    ctx.restore();

    if (highscore > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,224,122,0.55)';
      ctx.font = '10px "Cinzel", Georgia, serif';
      ctx.fillText('🏆  Rekord: ' + highscore, w / 2, btnY + 54);
    }
    ctx.textAlign = 'left';
  }

  function drawLevelComplete(ctx, w, h, levelName, score, nextLevel, highscore, isNewHighscore, stats) {
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

    // Stats row (time, items, kills)
    if (stats) {
      const mm = String(Math.floor(stats.time / 60)).padStart(2, '0');
      const ss = String(stats.time % 60).padStart(2, '0');
      const statsY = h * 0.62;
      ctx.font = '13px "Cinzel", Georgia, serif';
      ctx.fillStyle = 'rgba(255,224,122,0.7)';
      ctx.fillText(`⏱ ${mm}:${ss}   🥨 ${stats.items}   💀 ${stats.kills}`, w/2, statsY);
    }

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

      if (isNewHighscore) {
        ctx.font = '700 15px "Cinzel", Georgia, serif';
        ctx.fillStyle = '#FFE07A';
        ctx.fillText('★  NEUER REKORD: ' + highscore + '  ★', w/2, h * 0.80);
      } else if (highscore > 0) {
        ctx.font = '13px "Cinzel", Georgia, serif';
        ctx.fillStyle = 'rgba(255,224,122,0.65)';
        ctx.fillText('Rekord: ' + highscore, w/2, h * 0.80);
      }
    }

    ctx.fillStyle = 'rgba(200,146,42,0.5)';
    ctx.font = '13px "Crimson Text", Georgia, serif';
    ctx.fillText('Enter oder Klick zum Fortfahren', w/2, h * 0.90);
    ctx.textAlign = 'left';
  }

  function drawGameOver(ctx, w, h, score, highscore, isNewHighscore) {
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

    // Score & highscore panel
    const panelH = highscore > 0 ? 114 : 76;
    const bx = w/2 - 150, by = h*0.45, bw2 = 300, bh2 = panelH;
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

    if (highscore > 0) {
      ctx.font = '11px "Cinzel", Georgia, serif';
      ctx.fillStyle = isNewHighscore ? '#FFE07A' : 'rgba(255,180,180,0.65)';
      const recLabel = isNewHighscore ? '★  NEUER REKORD  ★' : 'Rekord';
      ctx.fillText(recLabel, w/2, by + 84);
      ctx.font = isNewHighscore ? '700 18px "Cinzel Decorative", Georgia, serif' : '16px "Cinzel", Georgia, serif';
      ctx.fillStyle = isNewHighscore ? '#FFE07A' : 'rgba(255,180,180,0.65)';
      ctx.fillText(highscore.toString(), w/2, by + 108);
    }

    const nextY = by + bh2 + 28;
    ctx.font = '700 16px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#FFE07A';
    ctx.fillText('Nochmal versuchen?', w/2, nextY);

    ctx.fillStyle = 'rgba(180,80,80,0.6)';
    ctx.font = '13px "Crimson Text", Georgia, serif';
    ctx.fillText('Enter oder Klick zum Fortfahren', w/2, nextY + 36);
    ctx.textAlign = 'left';
  }

  function drawPauseHint(ctx, w) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = '13px Georgia, serif';
    ctx.fillText('ESC = Menü', 10, 20);
  }

  // ── Boss projectiles (beer mugs) ──────────────────────────────────────
  function drawProjectiles(ctx, level, camX, camY) {
    if (!level.projectiles || level.projectiles.length === 0) return;
    level.projectiles.forEach(proj => {
      if (!proj.alive) return;
      const sx = proj.x - camX;
      const sy = proj.y - camY;
      // Mug body
      ctx.fillStyle = '#D4820A';
      ctx.beginPath();
      ctx.roundRect(sx - 7, sy - 9, 14, 18, 2);
      ctx.fill();
      // Foam
      ctx.fillStyle = '#FFFDE0';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 9, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Handle
      ctx.strokeStyle = '#B86A00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx + 10, sy - 2, 6, -0.8, 0.8);
      ctx.stroke();
    });
  }

  // ── Checkpoints ───────────────────────────────────────────────────────
  function drawCheckpoints(ctx, level, camX, camY, tick) {
    if (!level.checkpoints || level.checkpoints.length === 0) return;
    const groundY = (16 - 2) * TILE_SIZE; // row 14
    level.checkpoints.forEach(cp => {
      const sx = cp.x - camX;
      const sy = groundY - camY;
      // Pole
      ctx.strokeStyle = cp.activated ? '#FFD700' : '#888888';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy - 56);
      ctx.stroke();
      // Flag
      const waving = cp.activated ? Math.sin(tick * 0.12) * 3 : 0;
      ctx.fillStyle = cp.activated ? '#FFD700' : '#666666';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 56);
      ctx.lineTo(sx + 18 + waving, sy - 48);
      ctx.lineTo(sx,               sy - 40);
      ctx.closePath();
      ctx.fill();
      // Glow when activated
      if (cp.activated) {
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(tick * 0.08) * 0.1;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(sx, sy - 48, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
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
    ctx.textAlign = 'center';
    for (const p of popups) {
      ctx.globalAlpha = p.life / p.maxLife;
      if (p.isTutorial) {
        // Tutorial hint: larger, white with shadow, semi-transparent pill bg
        ctx.font = 'bold 17px Georgia, serif';
        const tx = p.x - camX, ty = p.y - camY;
        const tw = ctx.measureText(p.text).width;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.roundRect(tx - tw/2 - 10, ty - 18, tw + 20, 26, 6); ctx.fill();
        ctx.fillStyle = '#E0F0FF';
        ctx.fillText(p.text, tx, ty);
      } else {
        ctx.font      = 'bold 15px Georgia, serif';
        ctx.fillStyle = p.text.startsWith('+♥') ? '#FF8888' : '#FFD700';
        ctx.fillText(p.text, p.x - camX, p.y - camY);
      }
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

  // ── Boss HP bar ───────────────────────────────────────────────────────
  function drawBossHpBar(ctx, boss, w, h) {
    if (!boss || !boss.alive) return;
    const barW = 240, barH = 18;
    const bx = w / 2 - barW / 2;
    const by = 18;
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath(); ctx.roundRect(bx - 5, by - 18, barW + 10, barH + 23, 5); ctx.fill();
    // Label
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('ENDGEGNER', w / 2, by - 4);
    // Damage track
    ctx.fillStyle = '#440000';
    ctx.fillRect(bx, by, barW, barH);
    // HP fill
    const hpFrac = boss.hp / boss.maxHp;
    ctx.fillStyle = hpFrac > 0.5 ? '#CC2200' : '#FF4400';
    ctx.fillRect(bx, by, barW * hpFrac, barH);
    // Border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, barW, barH, 3); ctx.stroke();
    ctx.textAlign = 'left';
  }

  // ── Power-up HUD ──────────────────────────────────────────────────────
  function drawPowerUpHUD(ctx, player, w) {
    const icons = [];
    if (player.speedTimer > 0) icons.push({ type: 'speed', t: player.speedTimer, max: 300 });
    if (player.flyTimer   > 0) icons.push({ type: 'fly',   t: player.flyTimer,   max: 180 });
    if (icons.length === 0) return;
    icons.forEach((icon, i) => {
      const ix = w - 62 - i * 58;
      const iy = 10;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath(); ctx.roundRect(ix, iy, 48, 50, 6); ctx.fill();
      if (icon.type === 'speed') drawSpeedBoostIcon(ctx, ix + 24, iy + 22, 0);
      else                        drawFlyIcon(ctx,        ix + 24, iy + 24, 0);
      const frac = icon.t / icon.max;
      ctx.fillStyle = icon.type === 'speed' ? '#FFE020' : '#AAEEFF';
      ctx.fillRect(ix + 3, iy + 44, 42 * frac, 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ix + 3, iy + 44, 42, 4);
    });
  }

  // ── Combo indicator (drawn over player head) ─────────────────────────
  function drawComboIndicator(ctx, player, camX, camY) {
    if (!player || player.comboCount === 0) return;
    const sx = player.x + player.w / 2 - camX;
    const sy = player.y - 18 - camY;
    const labels = ['', '⚔', '⚔⚔', '💥 COMBO!'];
    const colors  = ['', '#FFD740', '#FF9920', '#FF4400'];
    const label   = labels[player.comboCount] || '';
    const col     = colors[player.comboCount] || '#FFF';
    const scale   = player.comboCount === 3 ? 1.3 : 1.0;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (player.comboTimer / 30) + (player.attackTimer > 0 ? 1 : 0));
    ctx.font = `bold ${Math.round(14 * scale)}px "Cinzel", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(label, sx + 1, sy + 1);
    ctx.fillStyle = col;
    ctx.fillText(label, sx, sy);
    ctx.restore();
  }

  // ── Game complete screen ──────────────────────────────────────────────
  function drawGameComplete(ctx, w, h, score, highscore, isNewHighscore) {
    // Golden overlay
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, 'rgba(30,10,0,0.96)');
    bg.addColorStop(1, 'rgba(60,30,0,0.96)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = 24;
    ctx.fillStyle   = '#FFD700';
    ctx.font        = 'bold 64px Georgia, serif';
    ctx.fillText('SIEG!', w / 2, h * 0.28);
    ctx.shadowBlur  = 0;

    ctx.fillStyle = '#FFE88A';
    ctx.font      = 'bold 22px Georgia, serif';
    ctx.fillText('Du hast Bayern gerettet!', w / 2, h * 0.40);

    // Score panel
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(w/2 - 160, h*0.47, 320, 100, 10); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(w/2 - 160, h*0.47, 320, 100, 10); ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('Punkte: ' + score, w / 2, h * 0.47 + 38);
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Highscore: ' + highscore, w / 2, h * 0.47 + 66);
    if (isNewHighscore) {
      ctx.fillStyle = '#FFAA00';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.fillText('Neuer Rekord!', w / 2, h * 0.47 + 90);
    }

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font      = '15px Georgia, serif';
    ctx.fillText('Enter oder Klick für Hauptmenü', w / 2, h * 0.88);
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
  }

  return {
    SKINS,
    drawBackground,
    drawTilemap,
    drawCollectibles,
    drawEnemies,
    drawPlayer,
    drawGoal,
    drawCheckpoints,
    drawProjectiles,
    drawMenu,
    drawLevelComplete,
    drawGameOver,
    drawPauseHint,
    drawPlayerTrail,
    drawScorePopups,
    drawLevelBanner,
    drawBossHpBar,
    drawPowerUpHUD,
    drawComboIndicator,
    drawGameComplete,
  };
})();
