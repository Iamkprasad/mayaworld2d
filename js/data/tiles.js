// Canonical tile mapping for MayaWorld.
//
// Tile sheet: assets/images/kenney_terrain.png  (192x176)
// Grid: 12 columns x 11 rows, 16px tiles packed with no gap.
// Indices are 1-based: index = row*12 + col + 1.
//
// All tiles drawn from the Kenney Tiny-Town pack (tilemap_packed.png)
// to eliminate the previous Pokémon GBA aesthetic.

export const TILE_SHEET = 'assets/images/kenney_terrain.png';
export const TILE_SHEET_AUTUMN = 'assets/images/kenney_terrain.png';
export const TILE_SHEET_CORRUPTED = 'assets/images/kenney_terrain.png';
export const GRID_COLS = 12;
export const TILE_STRIDE = 16; // no gap in packed sheet
export const TILE_SRC = 16;

// Ground / base terrain (Kenney tiny-town 1-based indices)
export const BASE_TILES = {
  WATER: 49,      // tile 48 — blue water
  GRASS: 1,       // tile 0  — solid green
  SAND: 77,       // tile 76 — shore / beach transition
  DIRT: 97,       // tile 96 — gray packed-earth path
  STONE: 109,     // tile 108 — cobblestone
  LAVA: 25,       // tile 24 — red roof tile (lava stand-in)
  CORRUPTED: 1,   // same as grass (corrupted sheet TBD)
  SNOW: 110,      // tile 109 — light gray
  ICE: 98,        // tile 97 — gray path
  VOID: 0         // transparent / empty
};

// Decoration / object tiles (Kenney tiny-town 1-based indices)
export const DECO_TILES = {
  EMPTY: 0,
  TREE: 17,        // tile 16 — bush on grass
  WALL: 89,        // tile 88 — building wall with windows
  TEMPLE_WALL: 109,// tile 108 — cobblestone (temple stand-in)
  BRIDGE: 50,      // tile 49 — shore tile (bridge stand-in)
  ALTAR: 4,        // tile 3  — red heart/crystal
  SHRINE: 4,       // tile 3  — red heart/crystal
  RUINED_COL: 79,  // tile 78 — gray decorative pillar
  PORTAL: 4,       // tile 3  — red heart/crystal
  CROPS: 18,       // tile 17 — grass with yellow (crop stand-in)
  FORGE: 53,       // tile 52 — red building tile
  BOOKSHELF: 4,    // tile 3  — red heart/crystal
  SIGNBOARD: 93,   // tile 92 — small red/yellow sign
  CHEST: 4,        // tile 3  — red heart/crystal (chest stand-in)
  FLOWER: 93,      // tile 92 — small red/yellow decor
  BUSH: 17,        // tile 16 — bush on grass
  TUFT: 98,        // tile 97 — gray path tile
  TREE_ALT: 5,     // tile 4  — grass with dark variation
  ROCK: 79,        // tile 78 — gray decorative
  FENCE: 2,        // tile 1 — wooden fence segment (CORRECTED: actual Kenney index)
  FENCE_L: 2,      // tile 1  — fence left end (CORRECTED: actual Kenney index)
  FENCE_R: 12      // tile 11 — fence right end (CORRECTED: actual Kenney index)
};

// Decoration tiles the player CANNOT walk through (obstacles)
export const COLLIDABLE_DECOS = [
  DECO_TILES.TREE, DECO_TILES.TREE_ALT, DECO_TILES.WALL, DECO_TILES.TEMPLE_WALL,
  DECO_TILES.RUINED_COL, DECO_TILES.ROCK, DECO_TILES.CHEST, DECO_TILES.FENCE
];

// Decorative ground cover that is purely visual (walkable)
export const WALKABLE_DECOR = [
  DECO_TILES.FLOWER, DECO_TILES.BUSH, DECO_TILES.TUFT
];

// Multi-tile shrine (3x3) drawn around an anchor tile
export const SHRINE_3x3 = [1, 1, 1, 1, 4, 1, 1, 1, 1];

// Interior defaults (dungeon floor / wall) on the 12-col grid
export const INTERIOR_FLOOR = 5;  // dungeon tile 4 — gray stone floor
export const INTERIOR_WALL = 1;   // dungeon tile 0 — red brick wall

// House-exterior prefab tiles (Kenney tiny-town stone building tiles).
// Uses the stone building facade tiles (84-88) to construct a 3-tall, 4-wide
// building that looks like a Kenney tiny-town stone cottage rather than a
// Pokémon red-roof house.
export const HOUSE_TILES = {
  ROOF_L: 86, ROOF_M: [86, 86], ROOF_R: 87,
  EAVE_L: 85, EAVE_M: [88, 88], EAVE_R: 87,
  WALL_L: 88, WALL_M: [88, 88], WALL_R: 87,
  DOOR: 107
};
