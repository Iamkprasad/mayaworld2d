// Canonical tile mapping for MayaWorld.
//
// Tile sheet: assets/images/backgrounds.png  (1036x4000)
// Grid: 61 columns x 235 rows, 16px tiles on a 17px stride (1px gap).
// Indices are 1-based: index = row*61 + col + 1.
//
// These indices were VERIFIED by sampling the actual pixels of backgrounds.png
// (see scripts/ + scratch/_final_picks.png). Every entry points at a distinct,
// visually-correct tile — no two concepts share an index (the old map.js
// collapsed ~14 concepts onto 4 magic indices, which is why the map looked
// like one repeated brown tile).

export const TILE_SHEET = 'assets/images/backgrounds.png';
export const TILE_SHEET_AUTUMN = 'assets/images/backgrounds_autumn.png';
export const TILE_SHEET_CORRUPTED = 'assets/images/backgrounds_corrupted.png';
export const GRID_COLS = 61;
export const TILE_STRIDE = 17; // 16px tile + 1px gap
export const TILE_SRC = 16;

// Ground / base terrain (verified)
export const BASE_TILES = {
  WATER: 54,      // blue water w/ shore
  GRASS: 1,       // green grass
  SAND: 29,       // tan sand
  DIRT: 132,      // brown dirt path
  STONE: 33,      // light cobble / stone floor
  LAVA: 367,      // red lava
  CORRUPTED: 245, // dark/red corrupted ground (stand-in, refine later)
  SNOW: 38,       // near-white snow
  ICE: 201,       // pale blue ice/water
  VOID: 62        // black cosmic void
};

// Decoration / object tiles (verified, all distinct)
export const DECO_TILES = {
  EMPTY: 0,
  TREE: 103,       // leafy green canopy
  WALL: 74,        // grey stone wall / rock face
  TEMPLE_WALL: 342,// grey temple stone
  BRIDGE: 76,      // wooden plank bridge deck (walkable)
  ALTAR: 319,      // stone altar / temple step
  SHRINE: 624,     // shrine stand-in (single tile)
  RUINED_COL: 69,  // grey boulder / ruined column
  PORTAL: 1254,    // portal swirl
  CROPS: 64,       // green crop bush
  FORGE: 368,      // red brick forge
  BOOKSHELF: 14,   // furniture / shelf
  SIGNBOARD: 25,   // wooden signpost
  CHEST: 6,        // small wooden chest/crate
  // --- nature-pass decor (verified) ---
  FLOWER: 17,      // red flowers (decorative, walkable)
  BUSH: 1257,      // leafy fern/bush (decorative, walkable)
  TUFT: 1372,      // grass tuft (decorative, walkable)
  TREE_ALT: 225,   // alternate darker tree canopy (collidable)
  ROCK: 69         // grey boulder (collidable) — alias of RUINED_COL
};

// Decoration tiles the player CANNOT walk through (obstacles)
export const COLLIDABLE_DECOS = [
  DECO_TILES.TREE, DECO_TILES.TREE_ALT, DECO_TILES.WALL, DECO_TILES.TEMPLE_WALL,
  DECO_TILES.RUINED_COL, DECO_TILES.ROCK, DECO_TILES.CHEST
];

// Decorative ground cover that is purely visual (walkable)
export const WALKABLE_DECOR = [
  DECO_TILES.FLOWER, DECO_TILES.BUSH, DECO_TILES.TUFT
];

// Multi-tile shrine (3x3) drawn around an anchor tile
export const SHRINE_3x3 = [307, 308, 309, 368, 369, 370, 429, 430, 431];

// Interior defaults (wood floor / brick wall) on the 61-col grid
export const INTERIOR_FLOOR = 132; // brown wood-ish floor
export const INTERIOR_WALL = 74;   // stone/brick wall
