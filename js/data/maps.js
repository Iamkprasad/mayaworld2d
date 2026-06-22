// Database configuration for the 22 connected maps of MayaWorld
// Used to procedurally compile layouts and handle coordinate warps

export const MAPS_CONFIG = {
  1: {
    id: 1,
    name: "Suryanagar Village Square",
    width: 80,
    height: 80,
    theme: "vibrant",
    type: "village",
    defaultSpawn: { x: 40, y: 70 },
    color: "#27633d",
    warps: [
      { x: 12, y: 24, targetMapId: 2, targetX: 10, targetY: 18, type: "door" },
      { x: 34, y: 28, targetMapId: 3, targetX: 8, targetY: 14, type: "door" },
      { x: 56, y: 32, targetMapId: 4, targetX: 8, targetY: 14, type: "door" },
      { x: 40, y: 59, targetMapId: 5, targetX: 20, targetY: 2, type: "pass" },
      { x: 40, y: 1, targetMapId: 6, targetX: 40, targetY: 78, type: "pass" },
      { x: 78, y: 36, targetMapId: 10, targetX: 2, targetY: 40, type: "pass" },
      { x: 78, y: 25, targetMapId: 14, targetX: 2, targetY: 40, type: "river" }
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
    floorTile: 480, // wood floor
    wallTile: 464, // brick wall
    warps: [
      { x: 10, y: 19, targetMapId: 1, targetX: 12, targetY: 25, type: "door" }
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
    floorTile: 480,
    wallTile: 464,
    warps: [
      { x: 8, y: 15, targetMapId: 1, targetX: 34, targetY: 29, type: "door" }
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
    floorTile: 480,
    wallTile: 464,
    warps: [
      { x: 8, y: 15, targetMapId: 1, targetX: 56, targetY: 33, type: "door" }
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
      { x: 20, y: 1, targetMapId: 1, targetX: 40, targetY: 58, type: "pass" },
      { x: 20, y: 21, targetMapId: 21, targetX: 40, targetY: 78, type: "pass" }
    ]
  },
  6: {
    id: 6,
    name: "Sacred Grove Entrance",
    width: 80,
    height: 80,
    theme: "vibrant",
    type: "forest",
    defaultSpawn: { x: 40, y: 78 },
    warps: [
      { x: 40, y: 79, targetMapId: 1, targetX: 40, targetY: 2, type: "pass" },
      { x: 16, y: 21, targetMapId: 7, targetX: 10, targetY: 18, type: "door" },
      { x: 1, y: 40, targetMapId: 18, targetX: 78, targetY: 40, type: "pass" },
      { x: 40, y: 1, targetMapId: 8, targetX: 40, targetY: 78, type: "pass" }
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
    floorTile: 480,
    wallTile: 464,
    warps: [
      { x: 10, y: 19, targetMapId: 6, targetX: 16, targetY: 22, type: "door" }
    ]
  },
  8: {
    id: 8,
    name: "Canopy of Roots",
    width: 80,
    height: 80,
    theme: "vibrant",
    type: "dense_forest",
    defaultSpawn: { x: 40, y: 78 },
    warps: [
      { x: 40, y: 79, targetMapId: 6, targetX: 40, targetY: 2, type: "pass" },
      { x: 70, y: 13, targetMapId: 9, targetX: 20, targetY: 38, type: "cave" }
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
      { x: 20, y: 39, targetMapId: 8, targetX: 70, targetY: 14, type: "cave" }
    ]
  },
  10: {
    id: 10,
    name: "Volcanic Ascent Path",
    width: 80,
    height: 80,
    theme: "autumn",
    type: "volcano",
    defaultSpawn: { x: 2, y: 40 },
    warps: [
      { x: 1, y: 40, targetMapId: 1, targetX: 77, targetY: 36, type: "pass" },
      { x: 60, y: 25, targetMapId: 11, targetX: 12, targetY: 22, type: "door" },
      { x: 40, y: 9, targetMapId: 12, targetX: 20, targetY: 38, type: "cave" },
      { x: 78, y: 40, targetMapId: 13, targetX: 2, targetY: 20, type: "pass" }
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
    floorTile: 33, // stone/basalt
    wallTile: 464,
    warps: [
      { x: 12, y: 23, targetMapId: 10, targetX: 60, targetY: 26, type: "door" }
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
      { x: 20, y: 39, targetMapId: 10, targetX: 40, targetY: 10, type: "cave" }
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
      { x: 1, y: 20, targetMapId: 10, targetX: 77, targetY: 40, type: "pass" }
    ]
  },
  14: {
    id: 14,
    name: "Submerged Column Hall",
    width: 80,
    height: 80,
    theme: "vibrant",
    type: "coastal",
    defaultSpawn: { x: 2, y: 40 },
    warps: [
      { x: 1, y: 40, targetMapId: 1, targetX: 77, targetY: 25, type: "river" },
      { x: 40, y: 17, targetMapId: 15, targetX: 16, targetY: 30, type: "door" },
      { x: 78, y: 40, targetMapId: 16, targetX: 2, targetY: 40, type: "pass" }
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
      { x: 16, y: 31, targetMapId: 14, targetX: 40, targetY: 18, type: "door" }
    ]
  },
  16: {
    id: 16,
    name: "Coral Reef Shore",
    width: 80,
    height: 80,
    theme: "vibrant",
    type: "beach",
    defaultSpawn: { x: 2, y: 40 },
    warps: [
      { x: 1, y: 40, targetMapId: 14, targetX: 77, targetY: 40, type: "pass" },
      { x: 40, y: 41, targetMapId: 17, targetX: 12, targetY: 22, type: "cave" }
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
      { x: 12, y: 23, targetMapId: 16, targetX: 40, targetY: 42, type: "cave" }
    ]
  },
  18: {
    id: 18,
    name: "Snowy Mountain Pass",
    width: 80,
    height: 80,
    theme: "autumn", // using autumn tileset modified to snow colors in draw loops
    type: "snow_pass",
    defaultSpawn: { x: 78, y: 40 },
    warps: [
      { x: 79, y: 40, targetMapId: 6, targetX: 2, targetY: 40, type: "pass" },
      { x: 30, y: 21, targetMapId: 19, targetX: 8, targetY: 14, type: "door" },
      { x: 20, y: 1, targetMapId: 20, targetX: 20, targetY: 38, type: "pass" }
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
    floorTile: 480,
    wallTile: 464,
    warps: [
      { x: 8, y: 15, targetMapId: 18, targetX: 30, targetY: 22, type: "door" }
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
    width: 80,
    height: 80,
    theme: "vibrant",
    type: "temple_altar",
    defaultSpawn: { x: 40, y: 78 },
    warps: [
      { x: 40, y: 79, targetMapId: 5, targetX: 20, targetY: 20, type: "pass" },
      { x: 40, y: 41, targetMapId: 22, targetX: 40, targetY: 78, type: "portal" }
    ]
  },
  22: {
    id: 22,
    name: "Cosmic Center Void",
    width: 80,
    height: 80,
    theme: "corrupted",
    type: "void",
    defaultSpawn: { x: 40, y: 78 },
    warps: [
      { x: 40, y: 79, targetMapId: 21, targetX: 40, targetY: 42, type: "portal" }
    ]
  }
};
