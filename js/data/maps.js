// Database configuration for the 22 connected maps of MayaWorld
// Used to procedurally compile layouts and handle coordinate warps

export const MAPS_CONFIG = {
  1: {
    id: 1,
    name: "Suryanagar Village Square",
    width: 40,
    height: 40,
    theme: "vibrant",
    type: "village",
    defaultSpawn: { x: 19, y: 36 },
    color: "#27633d",
    warps: [
      { x: 8, y: 12, targetMapId: 2, targetX: 10, targetY: 18, type: "door" },   // Bhrigu's Ashram
      { x: 30, y: 12, targetMapId: 3, targetX: 8, targetY: 14, type: "door" },   // Reva's Farmhouse
      { x: 8, y: 28, targetMapId: 4, targetX: 8, targetY: 14, type: "door" },    // Village Hut
      { x: 19, y: 38, targetMapId: 5, targetX: 20, targetY: 2, type: "pass" },   // South shrine
      { x: 19, y: 1, targetMapId: 6, targetX: 20, targetY: 37, type: "pass" },   // North grove
      { x: 38, y: 18, targetMapId: 10, targetX: 2, targetY: 20, type: "pass" },  // East volcano
      { x: 38, y: 30, targetMapId: 14, targetX: 2, targetY: 20, type: "river" }  // East coast
    ]
  },
  2: {
    id: 2,
    name: "Sage Bhrigu's Ashram",
    width: 20,
    height: 20,
    theme: "vibrant",
    type: "interior",
    defaultSpawn: { x: 10, y: 18 },
    floorTile: 109, // cobblestone floor (kenney_terrain)
    wallTile: 89, // stone wall (kenney_terrain)
    warps: [
      { x: 10, y: 19, targetMapId: 1, targetX: 8, targetY: 13, type: "door" }
    ]
  },
  3: {
    id: 3,
    name: "Reva's Farmhouse",
    width: 16,
    height: 16,
    theme: "vibrant",
    type: "interior",
    defaultSpawn: { x: 8, y: 14 },
    floorTile: 109,
    wallTile: 89,
    warps: [
      { x: 8, y: 15, targetMapId: 1, targetX: 30, targetY: 13, type: "door" }
    ]
  },
  4: {
    id: 4,
    name: "Village Residential Hut",
    width: 16,
    height: 16,
    theme: "vibrant",
    type: "interior",
    defaultSpawn: { x: 8, y: 14 },
    floorTile: 109,
    wallTile: 89,
    warps: [
      { x: 8, y: 15, targetMapId: 1, targetX: 8, targetY: 29, type: "door" }
    ]
  },
  5: {
    id: 5,
    name: "South Sacred Shrine",
    width: 40,
    height: 40,
    theme: "vibrant",
    type: "shrine",
    defaultSpawn: { x: 20, y: 2 },
    warps: [
      { x: 20, y: 1, targetMapId: 1, targetX: 19, targetY: 37, type: "pass" },
      { x: 20, y: 21, targetMapId: 21, targetX: 20, targetY: 37, type: "pass" }
    ]
  },
  6: {
    id: 6,
    name: "Sacred Grove Entrance",
    width: 40,
    height: 40,
    theme: "vibrant",
    type: "forest",
    defaultSpawn: { x: 20, y: 36 },
    warps: [
      { x: 20, y: 38, targetMapId: 1, targetX: 19, targetY: 2, type: "pass" },   // south to village
      { x: 12, y: 28, targetMapId: 7, targetX: 10, targetY: 18, type: "door" },  // Vashistha's Hermitage
      { x: 1, y: 20, targetMapId: 18, targetX: 37, targetY: 20, type: "pass" },  // west to snowy pass
      { x: 20, y: 1, targetMapId: 8, targetX: 20, targetY: 37, type: "pass" }    // north to canopy
    ]
  },
  7: {
    id: 7,
    name: "Sage Vashistha's Hermitage",
    width: 20,
    height: 20,
    theme: "vibrant",
    type: "interior",
    defaultSpawn: { x: 10, y: 18 },
    floorTile: 109,
    wallTile: 89,
    warps: [
      { x: 10, y: 19, targetMapId: 6, targetX: 12, targetY: 29, type: "door" }
    ]
  },
  8: {
    id: 8,
    name: "Canopy of Roots",
    width: 40,
    height: 40,
    theme: "vibrant",
    type: "dense_forest",
    defaultSpawn: { x: 20, y: 36 },
    warps: [
      { x: 20, y: 38, targetMapId: 6, targetX: 20, targetY: 2, type: "pass" },   // south to grove
      { x: 20, y: 1, targetMapId: 9, targetX: 20, targetY: 38, type: "cave" }    // north to whispering caves
    ]
  },
  9: {
    id: 9,
    name: "Whispering Caves",
    width: 40,
    height: 40,
    theme: "vibrant",
    type: "cave",
    defaultSpawn: { x: 20, y: 38 },
    warps: [
      { x: 20, y: 39, targetMapId: 8, targetX: 20, targetY: 3, type: "cave" }
    ]
  },
  10: {
    id: 10,
    name: "Volcanic Ascent Path",
    width: 40,
    height: 40,
    theme: "autumn",
    type: "volcano",
    defaultSpawn: { x: 3, y: 20 },
    warps: [
      { x: 1, y: 20, targetMapId: 1, targetX: 37, targetY: 18, type: "pass" },   // west to village
      { x: 28, y: 18, targetMapId: 11, targetX: 12, targetY: 22, type: "door" }, // Daksha's Forge
      { x: 20, y: 1, targetMapId: 12, targetX: 20, targetY: 38, type: "cave" },  // north to lava caves
      { x: 38, y: 30, targetMapId: 13, targetX: 2, targetY: 20, type: "pass" }   // east to crag heights
    ]
  },
  11: {
    id: 11,
    name: "Daksha's Volcanic Forge",
    width: 24,
    height: 24,
    theme: "autumn",
    type: "interior",
    defaultSpawn: { x: 12, y: 22 },
    floorTile: 109,
    wallTile: 89,
    warps: [
      { x: 12, y: 23, targetMapId: 10, targetX: 28, targetY: 19, type: "door" }
    ]
  },
  12: {
    id: 12,
    name: "Lava Caves",
    width: 40,
    height: 40,
    theme: "autumn",
    type: "lava_cave",
    defaultSpawn: { x: 20, y: 38 },
    warps: [
      { x: 20, y: 39, targetMapId: 10, targetX: 20, targetY: 2, type: "cave" }
    ]
  },
  13: {
    id: 13,
    name: "Crag Heights",
    width: 40,
    height: 40,
    theme: "autumn",
    type: "volcano_peaks",
    defaultSpawn: { x: 2, y: 20 },
    warps: [
      { x: 1, y: 20, targetMapId: 10, targetX: 37, targetY: 30, type: "pass" }
    ]
  },
  14: {
    id: 14,
    name: "Submerged Column Hall",
    width: 40,
    height: 40,
    theme: "vibrant",
    type: "coastal",
    defaultSpawn: { x: 3, y: 20 },
    warps: [
      { x: 1, y: 20, targetMapId: 1, targetX: 37, targetY: 30, type: "river" },  // west to village
      { x: 20, y: 6, targetMapId: 15, targetX: 16, targetY: 30, type: "door" },  // Sanctuary of Time
      { x: 38, y: 20, targetMapId: 16, targetX: 2, targetY: 20, type: "pass" }   // east to coral shore
    ]
  },
  15: {
    id: 15,
    name: "Sanctuary of Time",
    width: 32,
    height: 32,
    theme: "vibrant",
    type: "temple",
    defaultSpawn: { x: 16, y: 30 },
    warps: [
      { x: 16, y: 31, targetMapId: 14, targetX: 20, targetY: 7, type: "door" }
    ]
  },
  16: {
    id: 16,
    name: "Coral Reef Shore",
    width: 40,
    height: 40,
    theme: "vibrant",
    type: "beach",
    defaultSpawn: { x: 3, y: 20 },
    warps: [
      { x: 1, y: 20, targetMapId: 14, targetX: 37, targetY: 20, type: "pass" },  // west to column hall
      { x: 14, y: 38, targetMapId: 17, targetX: 12, targetY: 22, type: "cave" }  // tidal ruins vault
    ]
  },
  17: {
    id: 17,
    name: "Tidal Ruins Vault",
    width: 24,
    height: 24,
    theme: "vibrant",
    type: "cave_vault",
    defaultSpawn: { x: 12, y: 22 },
    warps: [
      { x: 12, y: 23, targetMapId: 16, targetX: 14, targetY: 37, type: "cave" }
    ]
  },
  18: {
    id: 18,
    name: "Snowy Mountain Pass",
    width: 40,
    height: 40,
    theme: "autumn", // using autumn tileset modified to snow colors in draw loops
    type: "snow_pass",
    defaultSpawn: { x: 37, y: 20 },
    warps: [
      { x: 38, y: 20, targetMapId: 6, targetX: 2, targetY: 20, type: "pass" },   // east to grove
      { x: 20, y: 28, targetMapId: 19, targetX: 8, targetY: 14, type: "door" },  // Mahameru Hermitage
      { x: 20, y: 1, targetMapId: 20, targetX: 20, targetY: 38, type: "pass" }   // north to summit
    ]
  },
  19: {
    id: 19,
    name: "Mahameru Hermitage",
    width: 16,
    height: 16,
    theme: "vibrant",
    type: "interior",
    defaultSpawn: { x: 8, y: 14 },
    floorTile: 109,
    wallTile: 89,
    warps: [
      { x: 8, y: 15, targetMapId: 18, targetX: 20, targetY: 29, type: "door" }
    ]
  },
  20: {
    id: 20,
    name: "Silent Peak Summit",
    width: 40,
    height: 40,
    theme: "autumn",
    type: "summit",
    defaultSpawn: { x: 20, y: 38 },
    warps: [
      { x: 20, y: 39, targetMapId: 18, targetX: 20, targetY: 2, type: "pass" }
    ]
  },
  21: {
    id: 21,
    name: "Temple of Vows Altar",
    width: 40,
    height: 40,
    theme: "vibrant",
    type: "temple_altar",
    defaultSpawn: { x: 20, y: 36 },
    warps: [
      { x: 20, y: 38, targetMapId: 5, targetX: 20, targetY: 18, type: "pass" },     // south to shrine
      { x: 20, y: 8, targetMapId: 22, targetX: 20, targetY: 36, type: "portal" }    // portal to the void
    ]
  },
  22: {
    id: 22,
    name: "Cosmic Center Void",
    width: 40,
    height: 40,
    theme: "corrupted",
    type: "void",
    defaultSpawn: { x: 20, y: 36 },
    warps: [
      { x: 20, y: 38, targetMapId: 21, targetX: 20, targetY: 21, type: "portal" }
    ]
  }
};
