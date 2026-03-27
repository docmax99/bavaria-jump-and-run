// Level definitions — Tilemap system
// Tile types:
//   0 = air
//   1 = solid ground (grass top)
//   2 = solid stone
//   3 = wood platform (passthrough)
//   4 = snow block
//   5 = ice block (slippery)
//   6 = castle brick (solid, dark stone)

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
  const ROWS = 16, COLS = 92;
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
    // Extended section (cols 60–91)
    [10, 62, 66], [9,  70, 74], [8, 77, 81], [7, 84, 88],
    [12, 60, 63],
  ];
  platforms.forEach(([r, c1, c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 3;
  });

  // Raised ground sections
  for (let c = 25; c < 32; c++) { m[12][c] = 1; m[13][c] = 2; m[14][c] = 2; }
  for (let c = 44; c < 50; c++) { m[11][c] = 1; m[12][c] = 2; m[13][c] = 2; m[14][c] = 2; }
  // Extended raised section
  for (let c = 67; c < 72; c++) { m[12][c] = 1; m[13][c] = 2; m[14][c] = 2; }

  return m;
})();

// ── Level 2: Biergarten & Wald ───────────────────────────────────────────
const LEVEL2_MAP = (() => {
  const ROWS = 16, COLS = 94;
  const m = makeLevelData(ROWS, COLS, () => 0);

  // Ground with gaps
  const groundRanges = [[0,18],[22,38],[42,55],[59,72],[76,COLS-1]];
  groundRanges.forEach(([a,b]) => {
    for (let c = a; c <= b; c++) { m[14][c] = 1; m[15][c] = 2; }
  });

  // Platforms
  const platforms = [
    [11, 5, 10], [10, 14, 18], [9, 22, 26],
    [11, 30, 34], [10, 38, 42], [9, 45, 49],
    [8, 52, 56], [7, 59, 63],
    [12, 8, 11], [12, 25, 28],
    // Extended section (cols 70–93)
    [6, 66, 70], [7, 73, 77], [6, 80, 84], [5, 87, 91],
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
  const ROWS = 16, COLS = 96;
  const m = makeLevelData(ROWS, COLS, () => 0);

  // Sparse ground
  const groundRanges = [[0,10],[15,22],[27,32],[37,42],[47,52],[57,62],[67,74],[80,85],[91,COLS-1]];
  groundRanges.forEach(([a,b]) => {
    for (let c = a; c <= b; c++) { m[14][c] = 4; m[15][c] = 2; }
  });

  // Ice platforms (slippery)
  const icePlatforms = [
    [12, 3, 8], [11, 13, 17], [10, 20, 24],
    [9, 28, 31], [8, 35, 38], [7, 42, 45],
    [6, 49, 52], [5, 56, 59], [4, 63, 67],
    [11, 7, 9], [10, 25, 27],
    // Extended section
    [4, 70, 73], [3, 76, 79], [3, 83, 86], [2, 89, 92],
  ];
  icePlatforms.forEach(([r, c1, c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 5;
  });

  // Snow blocks as stepping stones
  const snowBlocks = [
    [12, 11, 12], [12, 18, 19], [11, 33, 34],
    [10, 40, 41], [9, 47, 48], [8, 54, 55],
    [7, 61, 62],
    // Extended snow steps
    [4, 74, 75], [3, 80, 81],
  ];
  snowBlocks.forEach(([r, c1, c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 4;
  });

  return m;
})();

// ── Level 4: Schloss Hof ──────────────────────────────────────────────────
const LEVEL4_MAP = (() => {
  const ROWS = 16, COLS = 95;
  const m = makeLevelData(ROWS, COLS, () => 0);

  // Ground — castle brick, with two gaps
  for (let c = 0; c < COLS; c++) { m[14][c] = 6; m[15][c] = 2; }
  [[18,21],[52,55]].forEach(([a,b]) => {
    for (let c = a; c <= b; c++) { m[14][c] = 0; m[15][c] = 0; }
  });

  // Stone platforms (battlements)
  const plats = [
    [11,4,8],[10,12,16],[9,20,24],[9,28,33],[8,36,41],
    [7,44,48],[7,56,61],[6,64,69],[5,72,76],[5,82,86],
    [12,9,12],[12,26,29],[10,49,53],[8,66,70],
  ];
  plats.forEach(([r,c1,c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 2;
  });

  // Raised parapet sections
  for (let c = 30; c < 44; c++) { m[12][c] = 6; m[13][c] = 2; }
  for (let c = 64; c < 78; c++) { m[11][c] = 6; m[12][c] = 2; m[13][c] = 2; }

  return m;
})();

// ── Level 5: Neuschwanstein ───────────────────────────────────────────────
const LEVEL5_MAP = (() => {
  const ROWS = 16, COLS = 92;
  const m = makeLevelData(ROWS, COLS, () => 0);

  // Ground with gaps
  const groundRanges = [[0,14],[18,32],[36,48],[52,64],[68,78],[82,COLS-1]];
  groundRanges.forEach(([a,b]) => {
    for (let c = a; c <= b; c++) { m[14][c] = 6; m[15][c] = 2; }
  });

  // Stone platforms — rising path
  const plats = [
    [12,6,10],[11,14,18],[10,22,27],[9,31,35],[8,39,44],
    [7,48,52],[6,56,61],[5,65,70],[4,74,79],[3,83,87],
    [13,3,5],[13,19,22],[11,35,39],[9,52,56],[7,62,66],
  ];
  plats.forEach(([r,c1,c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 2;
  });

  // Raised parapets
  for (let c = 20; c < 32; c++) { m[12][c] = 6; m[13][c] = 2; }
  for (let c = 56; c < 68; c++) { m[11][c] = 6; m[12][c] = 2; m[13][c] = 2; }

  return m;
})();

// ── Level 6: Zugspitze Gipfel ─────────────────────────────────────────────
const LEVEL6_MAP = (() => {
  const ROWS = 16, COLS = 96;
  const m = makeLevelData(ROWS, COLS, () => 0);

  // Very sparse ground (snow)
  const groundRanges = [[0,8],[14,20],[26,31],[36,41],[47,52],[57,62],[68,73],[78,83],[89,COLS-1]];
  groundRanges.forEach(([a,b]) => {
    for (let c = a; c <= b; c++) { m[14][c] = 4; m[15][c] = 2; }
  });

  // Ice platforms — long staircase
  const icePlats = [
    [12,2,6],[11,11,15],[10,19,23],[9,27,31],
    [8,35,39],[7,43,47],[6,51,55],[5,58,62],
    [4,66,70],[3,74,78],[2,82,86],[2,90,94],
  ];
  icePlats.forEach(([r,c1,c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 5;
  });

  // Snow stepping stones
  const snowBlocks = [
    [12,8,9],[11,16,17],[10,24,25],[9,32,33],
    [8,40,41],[7,48,49],[6,56,57],[5,63,64],[4,71,72],[3,79,80],
  ];
  snowBlocks.forEach(([r,c1,c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 4;
  });

  return m;
})();

// ── Level 7: Thronsaal (Boss Arena) ──────────────────────────────────────
const LEVEL7_MAP = (() => {
  const ROWS = 16, COLS = 90;
  const m = makeLevelData(ROWS, COLS, () => 0);

  // Solid castle floor
  for (let c = 0; c < COLS; c++) { m[14][c] = 6; m[15][c] = 2; }

  // Raised wing platforms (left and right)
  for (let c = 6; c < 22; c++)  { m[11][c] = 2; m[12][c] = 6; m[13][c] = 2; }
  for (let c = 66; c < 82; c++) { m[11][c] = 2; m[12][c] = 6; m[13][c] = 2; }

  // Stone pillars
  [33,38,48,53].forEach(pc => {
    for (let r = 8; r <= 13; r++) m[r][pc] = 2;
  });

  // Low platforms mid-arena
  [[10,26,30],[10,57,61]].forEach(([r,c1,c2]) => {
    for (let c = c1; c <= c2; c++) m[r][c] = 2;
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

const LEVEL4_MOVING = [
  { x: 576, y: 352, w: 4, minX: 540, maxX: 672, speed: 1.5 },
  { x: 1760, y: 256, w: 4, minX: 1720, maxX: 1856, speed: 2 },
];
const LEVEL5_MOVING = [
  { x: 448, y: 320, w: 4, minX: 416, maxX: 544, speed: 1.8 },
  { x: 1024, y: 256, w: 4, minX: 992, maxX: 1120, speed: 2.2 },
  { x: 1664, y: 192, w: 4, minX: 1632, maxX: 1760, speed: 2.5 },
];
const LEVEL6_MOVING = [
  { x: 960, y: 192, w: 5, minX: 896, maxX: 1088, speed: 2 },
];

// ── Collectibles ──────────────────────────────────────────────────────────
// { x, y, type: 'pretzel'|'mug'|'speedboost'|'fly' }
function makeCollectibles(levelIndex) {
  if (levelIndex === 0) return [
    // y = platform_surface - 40  (eye level above platform)
    // ground row14=448→408, row12=384→344, row11=352→312, row9=288→248, row7=224→184
    {x:180, y:312,type:'pretzel'},{x:250, y:408,type:'pretzel'},{x:320, y:344,type:'pretzel'},
    {x:420, y:312,type:'pretzel'},{x:550, y:344,type:'pretzel'},{x:650, y:312,type:'pretzel'},
    {x:700, y:312,type:'pretzel'},{x:900, y:344,type:'pretzel'},{x:1000,y:248,type:'pretzel'},
    {x:1100,y:248,type:'mug'},   {x:1300,y:184,type:'pretzel'},{x:1500,y:312,type:'pretzel'},
    // Extended section power-up + pretzel
    {x:2048,y:280,type:'speedboost'},{x:2240,y:248,type:'pretzel'},{x:2560,y:208,type:'pretzel'},
  ];
  if (levelIndex === 1) return [
    // ground row14=448→408, row12=384→344, row11=352→312, row10=320→280, row9=288→248, row8=256→216, row7=224→184
    {x:160, y:312,type:'pretzel'},{x:360, y:344,type:'mug'},   {x:400, y:344,type:'pretzel'},
    {x:640, y:248,type:'pretzel'},{x:800, y:344,type:'pretzel'},{x:880, y:344,type:'pretzel'},
    {x:1000,y:312,type:'pretzel'},{x:1200,y:280,type:'pretzel'},{x:1440,y:248,type:'pretzel'},
    {x:1600,y:344,type:'pretzel'},{x:1760,y:216,type:'mug'},   {x:1920,y:184,type:'pretzel'},
    // Extended section power-up + pretzels
    {x:2144,y:152,type:'fly'},{x:2336,y:184,type:'pretzel'},{x:2560,y:144,type:'pretzel'},
  ];
  if (levelIndex === 2) return [
    // row12=384→344, row11=352→312, row10=320→280, row9=288→248, row8=256→216, row7=224→184, row6=192→152, row5=160→120, row4=128→88
    {x:128, y:344,type:'pretzel'},{x:320, y:312,type:'pretzel'},{x:480, y:312,type:'pretzel'},
    {x:640, y:280,type:'pretzel'},{x:768, y:280,type:'pretzel'},{x:960, y:248,type:'mug'},
    {x:1152,y:216,type:'pretzel'},{x:1344,y:184,type:'pretzel'},{x:1536,y:152,type:'pretzel'},
    {x:1728,y:120,type:'mug'},   {x:1920,y:88, type:'pretzel'},{x:2080,y:88, type:'pretzel'},
    // Extended section power-up + pretzels
    {x:2272,y:88,type:'fly'},{x:2464,y:72,type:'pretzel'},{x:2720,y:56,type:'pretzel'},
  ];
  if (levelIndex === 3) return [
    {x:192, y:344,type:'pretzel'},{x:448, y:312,type:'pretzel'},{x:704, y:280,type:'pretzel'},
    {x:960, y:248,type:'mug'},   {x:1152,y:216,type:'pretzel'},{x:1408,y:280,type:'pretzel'},
    {x:1568,y:248,type:'pretzel'},{x:1600,y:248,type:'speedboost'},{x:1824,y:216,type:'pretzel'},
    {x:2080,y:344,type:'mug'},   {x:2240,y:280,type:'pretzel'},{x:2560,y:248,type:'pretzel'},
    {x:2752,y:216,type:'pretzel'},
  ];
  if (levelIndex === 4) return [
    {x:160, y:312,type:'pretzel'},{x:448, y:280,type:'pretzel'},{x:704, y:248,type:'mug'},
    {x:960, y:216,type:'pretzel'},{x:1120,y:248,type:'fly'},   {x:1280,y:344,type:'pretzel'},
    {x:1472,y:312,type:'pretzel'},{x:1664,y:280,type:'pretzel'},{x:1920,y:248,type:'mug'},
    {x:2112,y:216,type:'pretzel'},{x:2304,y:184,type:'pretzel'},{x:2560,y:280,type:'pretzel'},
    {x:2720,y:248,type:'pretzel'},
  ];
  if (levelIndex === 5) return [
    {x:128, y:280,type:'pretzel'},{x:320, y:248,type:'pretzel'},{x:640, y:216,type:'mug'},
    {x:832, y:184,type:'pretzel'},{x:1024,y:152,type:'fly'},   {x:1280,y:120,type:'pretzel'},
    {x:1472,y:248,type:'pretzel'},{x:1664,y:216,type:'pretzel'},{x:1856,y:184,type:'mug'},
    {x:2048,y:152,type:'pretzel'},{x:2240,y:120,type:'speedboost'},{x:2560,y:88,type:'pretzel'},
    {x:2752,y:72, type:'pretzel'},
  ];
  // Level 7 — Thronsaal (boss level): power-ups near start to help player
  return [
    {x:160, y:312,type:'fly'},   {x:480, y:312,type:'speedboost'},{x:800, y:312,type:'pretzel'},
    {x:1120,y:312,type:'mug'},   {x:1440,y:312,type:'pretzel'},   {x:1760,y:344,type:'fly'},
    {x:2080,y:312,type:'pretzel'},
  ];
}

// ── Enemies ───────────────────────────────────────────────────────────────
function makeEnemies(levelIndex) {
  if (levelIndex === 0) return [
    {x:400, y:14*32, vx:-0.8, minX:320,  maxX:520,  alive:true},
    {x:700, y:11*32, vx:-0.8, minX:640,  maxX:770,  alive:true},
    {x:1000,y:9*32,  vx:-1,   minX:900,  maxX:1080, alive:true},
    {x:1300,y:14*32, vx:-1,   minX:1200, maxX:1400, alive:true},
    // Extended section
    {x:2080,y:10*32, vx:-1.2, minX:1984, maxX:2176, alive:true},
    {x:2432,y:14*32, vx:-1,   minX:2368, maxX:2560, alive:true},
  ];
  if (levelIndex === 1) return [
    {x:350, y:14*32, vx:-1,   minX:288,  maxX:480,  alive:true},
    {x:768, y:14*32, vx:-1.2, minX:704,  maxX:1152, alive:true},
    {x:1040,y:11*32, vx:-1,   minX:976,  maxX:1104, alive:true},  // platform [11,30,34]: x=960-1120
    {x:1520,y:9*32,  vx:-1.5, minX:1456, maxX:1584, alive:true},  // platform [9,45,49]: x=1440-1600
    {x:1968,y:7*32,  vx:-1.5, minX:1904, maxX:2032, alive:true},  // platform [7,59,63]: x=1888-2048
    // Extended section
    {x:2192,y:6*32,  vx:-1.8, minX:2128, maxX:2256, alive:true},  // platform [6,66,70]: x=2112-2272
    {x:2864,y:5*32,  vx:-1.8, minX:2800, maxX:2928, alive:true},  // platform [5,87,91]: x=2784-2944
  ];
  if (levelIndex === 2) return [
    {x:300, y:14*32, vx:-1.2, minX:240,  maxX:400,  alive:true},
    {x:700, y:10*32, vx:-1.5, minX:640,  maxX:768,  alive:true},
    {x:1152,y:8*32,  vx:-1.8, minX:1120, maxX:1216, alive:true},
    {x:1376,y:7*32,  vx:-2,   minX:1344, maxX:1440, alive:true},
    {x:1824,y:5*32,  vx:-2,   minX:1792, maxX:1888, alive:true},
    // Extended section
    {x:2272,y:4*32,  vx:-2,   minX:2240, maxX:2336, alive:true},
    {x:2688,y:3*32,  vx:-2.2, minX:2656, maxX:2752, alive:true},
  ];
  if (levelIndex === 3) return [
    {x:480, y:14*32, vx:-1,   minX:384,  maxX:576,  alive:true},
    {x:960, y:12*32, vx:-1.2, minX:896,  maxX:1056, alive:true},
    // Turtle — 2 HP, slow
    {x:1200,y:14*32, vx:-0.7, minX:1120, maxX:1360, alive:true, type:'turtle', hp:2, retreated:false, retreatTimer:0},
    {x:1440,y:9*32,  vx:-1.2, minX:1376, maxX:1536, alive:true},
    // Bat — sine flight
    {x:1800,y:7*32,  vx:-1.4, minX:1700, maxX:1980, alive:true, type:'bat', baseY:7*32, phase:0},
    {x:1920,y:12*32, vx:-1.5, minX:1856, maxX:2048, alive:true},
    {x:2400,y:14*32, vx:-1.5, minX:2304, maxX:2496, alive:true},
    {x:2752,y:11*32, vx:-1.8, minX:2688, maxX:2848, alive:true},
  ];
  if (levelIndex === 4) return [
    {x:384, y:14*32, vx:-1.2, minX:320,  maxX:512,  alive:true},
    // Bat — sine flight
    {x:700, y:8*32,  vx:-1.5, minX:600,  maxX:920,  alive:true, type:'bat', baseY:8*32, phase:1.2},
    {x:768, y:11*32, vx:-1.2, minX:704,  maxX:896,  alive:true},
    // Turtle — 2 HP
    {x:1100,y:14*32, vx:-0.8, minX:1000, maxX:1280, alive:true, type:'turtle', hp:2, retreated:false, retreatTimer:0},
    {x:1216,y:9*32,  vx:-1.5, minX:1152, maxX:1344, alive:true},
    {x:1664,y:14*32, vx:-1.5, minX:1600, maxX:1792, alive:true},
    // Bat
    {x:2000,y:6*32,  vx:-1.8, minX:1900, maxX:2200, alive:true, type:'bat', baseY:6*32, phase:2.5},
    {x:2560,y:14*32, vx:-2,   minX:2496, maxX:2688, alive:true},
  ];
  if (levelIndex === 5) return [
    {x:320, y:14*32, vx:-1.5, minX:256,  maxX:448,  alive:true},
    // Bat
    {x:640, y:7*32,  vx:-1.8, minX:550,  maxX:850,  alive:true, type:'bat', baseY:7*32, phase:0.5},
    {x:704, y:11*32, vx:-1.8, minX:640,  maxX:800,  alive:true},
    // Turtle — 2 HP
    {x:960, y:14*32, vx:-0.9, minX:860,  maxX:1120, alive:true, type:'turtle', hp:2, retreated:false, retreatTimer:0},
    {x:1088,y:9*32,  vx:-1.8, minX:1024, maxX:1216, alive:true},
    {x:1472,y:7*32,  vx:-2,   minX:1408, maxX:1600, alive:true},
    // Bat + Turtle combo
    {x:1750,y:6*32,  vx:-2,   minX:1650, maxX:1950, alive:true, type:'bat', baseY:6*32, phase:3.0},
    {x:1856,y:14*32, vx:-2,   minX:1792, maxX:1984, alive:true},
    {x:2304,y:5*32,  vx:-2.2, minX:2240, maxX:2400, alive:true},
  ];
  // Level 7 — Thronsaal: only the boss
  return [{
    x: 2400, y: 14*32, vx: -1.2, minX: 1600, maxX: 2720,
    alive: true, vy: 0,
    isBoss: true, hp: 3, maxHp: 3,
    W: 50, H: 60,
    jumpTimer: 0,
  }];
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
    checkpoints: [{ x: 1440 }],
  },
  {
    map: LEVEL2_MAP,
    name: 'Biergarten & Wald',
    theme: 'forest',
    movingPlatforms: LEVEL2_MOVING,
    gravity: 0.5,
    friction: 0.85,
    checkpoints: [{ x: 1520 }],
  },
  {
    map: LEVEL3_MAP,
    name: 'Zugspitze',
    theme: 'mountain',
    movingPlatforms: [],
    gravity: 0.5,
    friction: 0.75,
    checkpoints: [{ x: 1600 }],
  },
  {
    map: LEVEL4_MAP,
    name: 'Schloss Hof',
    theme: 'castle',
    movingPlatforms: LEVEL4_MOVING,
    gravity: 0.5,
    friction: 0.85,
    checkpoints: [{ x: 1504 }],
  },
  {
    map: LEVEL5_MAP,
    name: 'Neuschwanstein',
    theme: 'castle',
    movingPlatforms: LEVEL5_MOVING,
    gravity: 0.5,
    friction: 0.85,
    checkpoints: [{ x: 1440 }],
  },
  {
    map: LEVEL6_MAP,
    name: 'Zugspitze Gipfel',
    theme: 'mountain',
    movingPlatforms: LEVEL6_MOVING,
    gravity: 0.5,
    friction: 0.72,
    checkpoints: [{ x: 1600 }],
  },
  {
    map: LEVEL7_MAP,
    name: 'Thronsaal',
    theme: 'castle',
    movingPlatforms: [],
    gravity: 0.5,
    friction: 0.88,
    checkpoints: [],
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

  isSolid(tile) { return tile === 1 || tile === 2 || tile === 4 || tile === 5 || tile === 6; },
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
      checkpoints: (def.checkpoints || []).map(cp => ({ x: cp.x, activated: false })),
      projectiles: [],
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

  updateEnemies(level, player) {
    const { map, gravity } = level;
    level.enemies.forEach(e => {
      if (!e.alive) return;

      // ── Boss update ───────────────────────────────────────────────────
      if (e.isBoss) {
        // Phase: 3=easy, 2=medium, 1=hard
        const phase = e.hp;
        const speedMult = phase === 1 ? 2.2 : phase === 2 ? 1.5 : 1.0;
        const throwInterval = phase === 1 ? 70 : phase === 2 ? 90 : 120;
        const throwCount    = phase === 1 ? 2  : 1;

        e.vy = (e.vy || 0) + gravity;
        if (e.vy > 18) e.vy = 18;

        e.y += e.vy;
        const checkColsBoss = [e.x - 20, e.x, e.x + 20];
        for (const px of checkColsBoss) {
          const col = Math.floor(px / TILE_SIZE);
          const row = Math.floor(e.y / TILE_SIZE);
          const t   = Level.getTile(map, row, col);
          if (Level.isSolid(t) || Level.isPassthrough(t)) {
            e.y = row * TILE_SIZE;
            e.vy = 0;
            break;
          }
        }

        e.x += e.vx * speedMult;
        if (e.x <= e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
        if (e.x >= e.maxX) { e.x = e.maxX; e.vx = -Math.abs(e.vx); }

        e.jumpTimer = (e.jumpTimer || 0) + 1;
        if (e.jumpTimer >= 80) {
          e.vy = -13;
          e.jumpTimer = 0;
        }

        // Throw projectile(s)
        e.throwTimer = (e.throwTimer || 0) + 1;
        if (e.throwTimer >= throwInterval) {
          e.throwTimer = 0;
          const dir = player && player.x > e.x ? 1 : (e.vx > 0 ? 1 : -1);
          for (let t = 0; t < throwCount; t++) {
            level.projectiles.push({
              x:  e.x + (dir > 0 ? e.W : 0),
              y:  e.y - e.H * 0.5,
              vx: dir * (4 + t * 1.5),
              vy: -7 + t * 2,
              alive: true,
            });
          }
        }
        return;
      }

      // ── Bat: sine-wave flight ─────────────────────────────────────────
      if (e.type === 'bat') {
        e.phase = (e.phase || 0) + 0.045;
        e.y     = e.baseY + Math.sin(e.phase) * 38;
        e.x    += e.vx;
        if (e.x <= e.minX) { e.x = e.minX; e.vx =  Math.abs(e.vx); }
        if (e.x >= e.maxX) { e.x = e.maxX; e.vx = -Math.abs(e.vx); }
        return;
      }

      // ── Turtle retreat timer ──────────────────────────────────────────
      if (e.type === 'turtle' && e.retreatTimer > 0) {
        e.retreatTimer--;
        if (e.retreatTimer <= 0) e.retreated = false;
        // Still apply gravity while retreated
      }

      // ── Gravity ───────────────────────────────────────────────────────
      e.vy = (e.vy || 0) + gravity;
      if (e.vy > 18) e.vy = 18;

      // ── Move Y + ground collision ─────────────────────────────────────
      e.y += e.vy;
      let onGround = false;
      if (e.vy >= 0) {
        const checkCols = [e.x - 8, e.x, e.x + 8];
        for (const px of checkCols) {
          const col = Math.floor(px / TILE_SIZE);
          const row = Math.floor(e.y / TILE_SIZE);
          const t   = Level.getTile(map, row, col);
          if (Level.isSolid(t) || Level.isPassthrough(t)) {
            e.y = row * TILE_SIZE;
            e.vy = 0;
            onGround = true;
            break;
          }
        }
      }

      // ── Move X ────────────────────────────────────────────────────────
      e.x += e.vx;

      // Turn at patrol bounds
      if (e.x <= e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
      if (e.x >= e.maxX) { e.x = e.maxX; e.vx = -Math.abs(e.vx); }

      // Turn at platform edges (no ground ahead → don't walk off)
      if (onGround) {
        const groundRow = Math.floor(e.y / TILE_SIZE);
        const aheadX    = e.x + (e.vx > 0 ? 16 : -16);
        const aheadCol  = Math.floor(aheadX / TILE_SIZE);
        const tileAhead = Level.getTile(map, groundRow, aheadCol);
        if (!Level.isSolid(tileAhead) && !Level.isPassthrough(tileAhead)) {
          e.vx = -e.vx;
        }
      }
    });
  },

  updateProjectiles(level) {
    for (let i = level.projectiles.length - 1; i >= 0; i--) {
      const p = level.projectiles[i];
      if (!p.alive) { level.projectiles.splice(i, 1); continue; }
      p.vy += 0.4;
      if (p.vy > 14) p.vy = 14;
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > level.height + 64 || p.x < -200 || p.x > level.width + 200) {
        level.projectiles.splice(i, 1);
      }
    }
  },
};
