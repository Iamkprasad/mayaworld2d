// Vidya System - Tracks, teaches, and unlocks skills

export const VIDYA_METADATA = {
  agni: {
    name: "Agni Vidya",
    sage: "Bhrigu",
    levels: [
      "Not learned",
      "Level 1: Build Campfire (save game, heal breath)",
      "Level 2: Agni Seal (purify surrounding tiles)",
      "Level 3: Cosmic Ember (charges the Asthra)"
    ]
  },
  niti: {
    name: "Niti Shastra",
    sage: "Pulastya",
    levels: [
      "Not learned",
      "Level 1: Tactical Stance (observe NPC patterns)",
      "Level 2: Alertness (gives warning of Mayasur attacks)",
      "Level 3: Universal Foresight (reveals path during eclipse)"
    ]
  },
  vaidya: {
    name: "Vaidya Kala",
    sage: "Pulaha",
    levels: [
      "Not learned",
      "Level 1: Gather Herbs (minor breath restoration)",
      "Level 2: Healing Touch (heal injured civilians)",
      "Level 3: Breath Rejuvenation (permanent breath increase)"
    ]
  },
  dhanur: {
    name: "Dhanur Vidya",
    sage: "Kratu",
    levels: [
      "Not learned",
      "Level 1: Conditioning (reduces breath depletion speed)",
      "Level 2: Earthen Stillness (stuns nearby corrupted forces)",
      "Level 3: Luminous Velocity (rapid walk state)"
    ]
  },
  jyotish: {
    name: "Jyotish Vidya",
    sage: "Angiras",
    levels: [
      "Not learned",
      "Level 1: Astrometry (reads current epoch time metrics)",
      "Level 2: Star Navigation (points to next closest Sage)",
      "Level 3: Eclipse Predictor (predicts exact eclipse date)"
    ]
  },
  yoga: {
    name: "Yoga Siddhi",
    sage: "Marichi",
    levels: [
      "Not learned",
      "Level 1: Seated Meditation (restores breath, invites thoughts)",
      "Level 2: Time Dilation (slows world movements by 50%)",
      "Level 3: Astral Projection (scout ahead with floating sight)"
    ]
  },
  bhu: {
    name: "Bhu Vidya",
    sage: "Atri",
    levels: [
      "Not learned",
      "Level 1: Earth Stride (immune to mud/slipping)",
      "Level 2: Node Sensing (draws corruption node map coordinates)",
      "Level 3: Mountain Ascent (unlocks access to mountain peaks)"
    ]
  },
  brahma: {
    name: "Brahma Vidya",
    sage: "Vashistha",
    levels: [
      "Not learned",
      "Level 1: Mantra Sound Shield (absorbs initial strikes)",
      "Level 2: Karma Cleansing (sacrifices HP to reduce Shadow Karma)",
      "Level 3: Word of Release (necessary to invoke True Name)"
    ]
  },
  shilpa: {
    name: "Shilpa Vidya",
    sage: "Daksha",
    levels: [
      "Not learned",
      "Level 1: Build Trap (slows down corrupted entities)",
      "Level 2: Restoration (repairs collapsed village huts)",
      "Level 3: Forge Asthra (combines Relics into the ultimate weapon)"
    ]
  },
  mauna: {
    name: "Mauna Vidya",
    sage: "Silence",
    levels: [
      "Locked (requires absolute silence and stillness)",
      "Level 1: Mastered Silence (ability to remain still in chaos)"
    ]
  }
};

export class VidyaSystem {
  static teach(player, vidyaKey, level) {
    // Apply learning rate modifier
    const rate = player.affinities[vidyaKey] || 1.0;
    
    // Set level directly
    player.vidyas[vidyaKey] = level;
    player.curiosity = `Practicing ${VIDYA_METADATA[vidyaKey].name}`;
    
    // Check if player has unlocked Level 3 for Dhanur, which permanently boosts player speed
    if (vidyaKey === 'dhanur' && level === 3) {
      player.speed = 0.12; // Speed boost
    }
  }

  static getLevelName(vidyaKey, level) {
    const meta = VIDYA_METADATA[vidyaKey];
    if (!meta) return "Unknown";
    return meta.levels[level] || "Not Learned";
  }
}
export default VidyaSystem;
