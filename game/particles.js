// Particle system — pool-based, pure Canvas 2D
const Particles = (() => {
  const pool = [];

  function spawn(x, y, count, color, speed, life) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      pool.push({
        x, y,
        vx: Math.cos(angle) * speed * (0.4 + Math.random() * 0.6),
        vy: Math.sin(angle) * speed * (0.4 + Math.random() * 0.6) - speed * 0.3,
        life, maxLife: life,
        color,
        r: 2 + Math.random() * 3,
      });
    }
  }

  function update() {
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.22;   // gravity
      p.vx *= 0.94;   // drag
      p.life--;
      if (p.life <= 0) pool.splice(i, 1);
    }
  }

  function draw(ctx, camX, camY) {
    if (pool.length === 0) return;
    // Sort by color so we can batch fillStyle changes
    const sorted = pool.slice().sort((a, b) => (a.color > b.color ? 1 : -1));
    let lastColor = null;
    for (const p of sorted) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      if (p.color !== lastColor) {
        ctx.fillStyle = p.color;
        lastColor = p.color;
      }
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.r * (0.3 + alpha * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function clear() { pool.length = 0; }

  return { spawn, update, draw, clear };
})();
