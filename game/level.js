// Level definitions — Tilemap system
// Tile types:
//   0 = air
//   1 = solid ground (grass top)
//   2 = solid stone
//   3 = wood platform (passthrough)
//   4 = snow block
//   5 = ice block (slippery)

const TILE_SIZE = 32;

// ── Level layouts ─────────────────────────────────────────────────────────
// Each level is defined as a 2D array. Levels scroll horizontally.
// Rows count top-to-bottom (row 0 = sky, last rows = ground).

function makeLevelData(rows, cols, fillFn) {
  const map = [];
  for (let r = 0; r < rows; r++) {
    map.push([]);
    for (let c = 0; c < cols; c++) {
      map[r].push(fillFn(r, c));
    }
  }
  return map;
}

// ── Level 1: Alpines Dorf ─────────────────────────────────────────────────
const LEVEL1_MAP = (() => {
  const ROWS = 16, COLS = 60;
  const m = makeLevelData(ROWS, COLS, () => 0);

  // Ground floor
  for (let c = 0; c < COLS; c++) m[14][c] = 1;
  for (let c = 0; c < COLS; c++) m[15][c] = 2;

  // Platforms
  const platforms = [
    [11, 3, 7],   [11, 12, 16],  [11, 20, 24],
    [9,  27, 31], [9,  34, 38],
    [7,  40, 44], [7,  48, 52],
    [5,  54, 58],
    [12, 10, 13], [12, 18, 21],
  ];
  platforms.forEach(([r, c1, c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 3;
  });

  // Raised ground sections
  for (let c = 25; c < 32; c++) { m[12][c] = 1; m[13][c] = 2; m[14][c] = 2; }
  for (let c = 44; c < 50; c++) { m[11][c] = 1; m[12][c] = 2; m[13][c] = 2; m[14][c] = 2; }

  // Pit at end
  for (let c = 56; c < COLS; c++) { m[14][c] = 0; m[15][c] = 0; }
  for (let c = 57; c < COLS; c++) m[15][c] = 2;

  return m;
})();

// ── Level 2: Biergarten & Wald ───────────────────────────────────────────
const LEVEL2_MAP = (() => {
  const ROWS = 16, COLS = 70;
  const m = makeLevelData(ROWS, COLS, () => 0);

  // Ground with gaps
  const groundRanges = [[0,18],[22,38],[42,55],[59,COLS-1]];
  groundRanges.forEach(([a,b]) => {
    for (let c = a; c <= b; c++) { m[14][c] = 1; m[15][c] = 2; }
  });

  // Platforms
  const platforms = [
    [11, 5, 10], [10, 14, 18], [9, 22, 26],
    [11, 30, 34], [10, 38, 42], [9, 45, 49],
    [8, 52, 56], [7, 59, 63],
    [12, 8, 11], [12, 25, 28],
  ];
  platforms.forEach(([r, c1, c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 3;
  });

  // Raised sections
  for (let c = 42; c < 55; c++) { m[12][c] = 1; m[13][c] = 2; m[14][c] = 2; }

  return m;
})();

// ── Level 3: Zugspitze ───────────────────────────────────────────────────
const LEVEL3_MAP = (() => {
  const ROWS = 16, COLS = 75;
  const m = makeLevelData(ROWS, COLS, () => 0);

  // Sparse ground
  const groundRanges = [[0,10],[15,22],[27,32],[37,42],[47,52],[57,62],[67,COLS-1]];
  groundRanges.forEach(([a,b]) => {
    for (let c = a; c <= b; c++) { m[14][c] = 4; m[15][c] = 2; }
  });

  // Ice platforms (slippery)
  const icePlatforms = [
    [12, 3, 8], [11, 13, 17], [10, 20, 24],
    [9, 28, 31], [8, 35, 38], [7, 42, 45],
    [6, 49, 52], [5, 56, 59], [4, 63, 67],
    [11, 7, 9], [10, 25, 27],
  ];
  icePlatforms.forEach(([r, c1, c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 5;
  });

  // Snow blocks as stepping stones
  const snowBlocks = [
    [12, 11, 12], [12, 18, 19], [11, 33, 34],
    [10, 40, 41], [9, 47, 48], [8, 54, 55],
    [7, 61, 62],
  ];
  snowBlocks.forEach(([r, c1, c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 4;
  });

  return m;
})();

// ── Moving platforms ──────────────────────────────────────────────────────
// Each: { x, y, w, minX, maxX, speed }
const LEVEL2_MOVING = [
  { x: 600, y: 320, w: 4, minX: 560, maxX: 680, speed: 1.5 },
  { x: 900, y: 288, w: 4, minX: 860, maxX: 980, speed: 2 },
  { x: 1300, y: 256, w: 4, minX: 1260, maxX: 1380, speed: 1.8 },
];

// ── Collectibles ──────────────────────────────────────────────────────────
// { x, y, type: 'pretzel'|'mug' }
function makeCollectibles(levelIndex) {
  if (levelIndex === 0) return [
    {x:180,y:320,type:'pretzel'},{x:320,y:320,type:'pretzel'},{x:420,y:288,type:'pretzel'},
    {x:550,y:256,type:'pretzel'},{x:700,y:224,type:'pretzel'},{x:900,y:192,type:'pretzel'},
    {x:1100,y:160,type:'mug'},{x:1300,y:128,type:'pretzel'},{x:1500,y:96,type:'pretzel'},
    {x:250,y:320,type:'pretzel'},{x:650,y:320,type:'pretzel'},{x:1000,y:288,type:'pretzel'},
  ];
  if (levelIndex === 1) return [
    {x:160,y:320,type:'pretzel'},{x:400,y:288,type:'pretzel'},{x:640,y:256,type:'pretzel'},
    {x:800,y:256,type:'pretzel'},{x:1000,y:224,type:'pretzel'},{x:1200,y:192,type:'pretzel'},
    {x:360,y:352,type:'mug'},{x:880,y:320,type:'pretzel'},{x:1440,y:160,type:'pretzel'},
    {x:1600,y:128,type:'pretzel'},{x:1760,y:96,type:'mug'},{x:1920,y:224,type:'pretzel'},
  ];
  // Level 3
  return [
    {x:128,y:320,type:'pretzel'},{x:480,y:288,type:'pretzel'},{x:768,y:256,type:'pretzel'},
    {x:960,y:224,type:'mug'},{x:1152,y:192,type:'pretzel'},{x:1344,y:160,type:'pretzel'},
    {x:1536,y:128,type:'pretzel'},{x:1728,y:96,type:'mug'},{x:1920,y:64,type:'pretzel'},
    {x:320,y:352,type:'pretzel'},{x:640,y:320,type:'pretzel'},{x:2080,y:192,type:'pretzel'},
  ];
}

// ── Enemies ───────────────────────────────────────────────────────────────
function makeEnemies(levelIndex) {
  if (levelIndex === 0) return [
    {x:400, y:14*32, vx:-0.8, minX:320, maxX:520, alive:true},
    {x:700, y:11*32, vx:-0.8, minX:640, maxX:770, alive:true},
    {x:1000,y:9*32,  vx:-1,   minX:900, maxX:1080, alive:true},
    {x:1300,y:14*32, vx:-1,   minX:1200,maxX:1400, alive:true},
  ];
  if (levelIndex === 1) return [
    {x:350, y:14*32, vx:-1,   minX:288, maxX:480,  alive:true},
    {x:768, y:14*32, vx:-1.2, minX:704, maxX:1152, alive:true},
    {x:1100,y:11*32, vx:-1,   minX:1024,maxX:1200, alive:true},
    {x:1500,y:9*32,  vx:-1.5, minX:1440,maxX:1600, alive:true},
    {x:1900,y:7*32,  vx:-1.5, minX:1840,maxX:2000, alive:true},
  ];
  return [
    {x:300, y:14*32, vx:-1.2, minX:240, maxX:400,  alive:true},
    {x:700, y:10*32, vx:-1.5, minX:640, maxX:768,  alive:true},
    {x:1152,y:8*32,  vx:-1.8, minX:1120,maxX:1216, alive:true},
    {x:1376,y:7*32,  vx:-2,   minX:1344,maxX:1440, alive:true},
    {x:1824,y:5*32,  vx:-2,   minX:1792,maxX:1888, alive:true},
  ];
}

// ── Level export ──────────────────────────────────────────────────────────
const LEVELS = [
  {
    map: LEVEL1_MAP,
    name: 'Alpines Dorf',
    theme: 'village',
    movingPlatforms: [],
    gravity: 0.5,
    friction: 0.85,
  },
  {
    map: LEVEL2_MAP,
    name: 'Biergarten & Wald',
    theme: 'forest',
    movingPlatforms: LEVEL2_MOVING,
    gravity: 0.5,
    friction: 0.85,
  },
  {
    map: LEVEL3_MAP,
    name: 'Zugspitze',
    theme: 'mountain',
    movingPlatforms: [],
    gravity: 0.5,
    friction: 0.75, // base; ice tiles override to 0.95
  },
];

// ── Level helpers ─────────────────────────────────────────────────────────
const Level = {
  TILE_SIZE,
  ROWS: 16,

  getTile(map, row, col) {
    if (row < 0 || row >= map.length) return 0;
    if (col < 0 || col >= map[0].length) return 0;
    return map[row][col];
  },

  isSolid(tile) { return tile === 1 || tile === 2 || tile === 4 || tile === 5; },
  isPassthrough(tile) { return tile === 3; },
  isIce(tile) { return tile === 5; },
  isAir(tile) { return tile === 0; },

  getWidth(map)  { return map[0].length * TILE_SIZE; },
  getHeight(map) { return map.length * TILE_SIZE; },

  getGoalX(levelIndex) {
    const map = LEVELS[levelIndex].map;
    return (map[0].length - 2) * TILE_SIZE;
  },

  load(levelIndex) {
    const def = LEVELS[levelIndex];
    return {
      index: levelIndex,
      map: def.map,
      name: def.name,
      theme: def.theme,
      gravity: def.gravity,
      friction: def.friction,
      movingPlatforms: def.movingPlatforms.map(p => ({ ...p, dir: 1 })),
      collectibles: makeCollectibles(levelIndex).map(c => ({ ...c, collected: false })),
      enemies: makeEnemies(levelIndex),
      goalX: Level.getGoalX(levelIndex),
      width: Level.getWidth(def.map),
      height: Level.getHeight(def.map),
    };
  },

  updateMovingPlatforms(level, dt) {
    level.movingPlatforms.forEach(p => {
      p.x += p.speed * p.dir * dt;
      if (p.x >= p.maxX) { p.x = p.maxX; p.dir = -1; }
      if (p.x <= p.minX) { p.x = p.minX; p.dir = 1; }
    });
  },

  updateEnemies(level) {
    level.enemies.forEach(e => {
      if (!e.alive) return;
      e.x += e.vx;
      if (e.x <= e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
      if (e.x >= e.maxX) { e.x = e.maxX; e.vx = -Math.abs(e.vx); }
    });
  },
};
