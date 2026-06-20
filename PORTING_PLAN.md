# MayaWorld HTML/CSS/JS Porting Plan
## Based on MAYAWORLD_EXPANDED_DESIGN.md and related design documents
## Target Structure: Similar to Pokemon-Emerald web repository

## Overview
This plan outlines the porting of MayaWorld (originally designed for RPG Paper Maker) to a web-based implementation using HTML, CSS, and JavaScript. The game is a deep, narrative-driven RPG with reincarnation mechanics, Sanskrit-inspired Vidya systems, and a cyclical world history spanning 7 epochs.

## Target Technology Stack
- **HTML5**: Semantic structure, canvas for rendering
- **CSS3**: Styling, animations, responsive design
- **JavaScript (ES6+)**: Game logic, state management, rendering
- **Optional**: 
  - Howler.js for audio
  - PixiJS or Phaser for 2D rendering (if needed over raw canvas)
  - LocalStorage/IndexedDB for persistence
  - Web Audio API for advanced audio

## Target Repository Structure (Inspired by Pokemon-Emerald)
```
mayaworld-web/
├── index.html              # Entry point
├── css/
│   ├── styles.css          # Main stylesheet
│   ├── responsive.css      # Media queries
│   ├── ui.css              # UI-specific styles
│   └── themes/             # Epoch-specific themes
├── js/
│   ├── main.js             # Game initialization & loop
│   ├── config.js           # Game constants & configuration
│   ├── states/             # Game state machines
│   │   ├── boot.js         # Loading state
│   │   ├── title.js        # Title screen
│   │   ├── overworld.js    # Main gameplay
│   │   ├── battle.js       # Combat encounters
│   │   ├── menu.js         # Menus (Journal, Skills, etc.)
│   │   ├── dreaming.js     # Dreaming State (between lives)
│   │   └── ritual.js       # Final Ritual sequence
│   ├── systems/            # Core game systems
│   │   ├── epoch.js        # 7 Epochs management
│   │   ├── vidya.js        # 9 Vidyas + Mauna system
│   │   ├── karma.js        # Karma/Light/Shadow system
│   │   ├── samsara.js      # Rebirth & lineage system
│   │   ├── corruption.js   # Corruption & purification
│   │   ├── vritti.js       # Thought interruption system
│   │   ├── dialogue.js     # Dialogue system
│   │   ├── npc.js          # NPC behavior & schedules
│   │   ├── audio.js        # Audio management
│   │   └── save.js         # Save/load system
│   ├── entities/           # Game entities
│   │   ├── player.js       # Player character
│   │   ├── sage.js         # Sage NPCs
│   │   ├── civilian.js     # Civilian NPCs
│   │   └── enemy.js        # Mayasur/corrupted entities
│   ├── utils/              # Utility functions
│   │   ├── math.js         # Math helpers
│   │   ├── assets.js       # Asset loading
│   │   └── events.js       # Event system
│   └── data/               # Game data
│       ├── epochs.json     # Epoch definitions
│       ├── sages.json      # Sage profiles & locations
│       ├── vidyas.json     # Vidya skill trees
│       ├── dialogues.json  # Dialogue content
│       └── items.json      # Item definitions
├── assets/
│   ├── images/             # Sprites, tilesets, portraits
│   │   ├── epochs/         # Epoch-specific graphics
│   │   ├── sages/          # Sage portraits & sprites
│   │   ├── player/         # Player character variations
│   │   ├── ui/             # UI elements
│   │   └── effects/        # Particle effects, VFX
│   ├── audio/              # Music & SFX
│   │   ├── music/          # Background music per epoch
│   │   ├── sfx/            # Sound effects
│   │   └── ambient/        # Environmental sounds
│   └── fonts/              # Custom fonts (Sanskrit, UI)
└── data/
    └── save/               # Player save files (browser storage)
```

## Core Systems to Implement (Based on Design Documents)

### 1. Epoch System (7 Distinct Time Periods)
- **Files**: `js/systems/epoch.js`, `css/themes/`, `js/data/epochs.json`
- **Features**:
  - Epoch overlay system (not separate worlds)
  - Settlement density, ruin density, forest density per epoch
  - NPC counts, sage visibility, Mayasur activity per epoch
  - Special tile types per epoch
  - Dialogue set switching per epoch
- **Implementation**:
  - Epoch manager tracking current epoch
  - Dynamic asset loading based on epoch
  - Visual/theme changes via CSS classes
  - NPC spawning/despawning based on epoch

### 2. Vidya System (9 Vidyas + Mauna)
- **Files**: `js/systems/vidya.js`, `js/data/vidyas.json`, `js/entities/sage.js`
- **Features**:
  - Each Vidya has 3 levels (1=Taught, 2=Discovered, 3=Mastery)
  - Discovery-through-practice mechanic (not menu unlock)
  - Vidya affinities from curiosity/actions
  - Mauna as 10th Vidya (silence discipline)
  - Resonance score calculation for ritual
- **Implementation**:
  - Vidya tracker with levels and discovery flags
  - Context-based discovery triggers
  - Affinity gains from player actions/locations
  - Mastery requirements (specific contexts for level 3)

### 3. Samsara & Rebirth System
- **Files**: `js/systems/samsara.js`, `js/entities/player.js`, `js/systems/lineage.js`
- **Features**:
  - Death → Dreaming State → Rebirth loop
  - Karma_Light & Karma_Shadow as separate weights
  - Smriti (cosmic memory) accumulation
  - Lineage Web (visual diagram in Journal)
  - Rebirth determinants: time of death, skills learned, skill order, karma, gender
  - What carries over: Knowledge (player memory), Journal, Karma totals, Smriti, Asthra, Mauna progress, Vidya affinities, Daksha's forge progress
  - What resets: Age, items, gold, current stats, map fog, direct Vidya skill levels
  - Sage bond depreciation based on Karma_Shadow
  - Epoch retention based on Karma_Balance > 200
- **Implementation**:
  - Rebirth calculator on death
  - Dreaming State as separate game state
  - Lineage tracking variables
  - Persistent storage for cross-life data
  - Affinity system (50% faster relearning)

### 4. Corruption & Purification System
- **Files**: `js/systems/corruption.js`, `js/entities/npc.js`, `js/entities/player.js`
- **Features**:
  - Corruption tiles (dark, cracked, pulsing animation, MP drain)
  - Corrupted NPCs (fragmented dialogue, broken schedules)
  - Corrupted sage retreats (Bond depreciation)
  - Corruption Nodes (invisible events that spread)
  - Purification methods per Vidya (Agni Seal, Extended Meditation, etc.)
  - Corruption spread Common Event equivalent
- **Implementation**:
  - Tile-based corruption system
  - NPC state machine affected by corruption
  - Spread algorithm (check adjacent tiles every interval)
  - Purification skill effects on tiles/NPCs

### 5. Vritti System (Thought Interruption)
- **Files**: `js/systems/vritti.js`, `js/entities/player.js`
- **Features**:
  - Random intrusive thoughts during meditation/study/exploration
  - Dismiss (interrupts meditation slightly) vs Observe (Smriti +1, continues)
  - Teaches core philosophy through mechanics
  - 30% chance per meditation minute
- **Implementation**:
  - Timer-based trigger during specific states
  - Text overlay system with fade
  - Player input handling (dismiss vs observe timer)
  - Smriti award on successful observation

### 6. Dream Fragment & Memory Architecture
- **Files**: `js/systems/dreams.js`, `js/systems/journal.js`
- **Features**:
  - Collectible memories stored in Journal's Dream Wing
  - Found by: sleeping in specific locations, Bond≥80 with Sage, witnessing catastrophe, Astral Projection near ruins
  - Non-linear puzzle pieces (30-60 sec interactive visions)
  - Assembled to reveal Tamas's story
  - Carries over across all rebirths
- **Implementation**:
  - Dream fragment tracker (variables/flags)
  - Trigger conditions for fragment discovery
  - Interactive vision player (separate scene/state)
  - Journal integration for viewing fragments
  - Composite vision upon collecting all fragments

### 7. Lineage Web & Inherited Karma
- **Files**: `js/systems/lineage.js`, `js/systems/journal.js`
- **Features**:
  - Visual diagram in Journal showing past lives
  - Tracks: birth family, dominant Vidya, cause of death, Sages encountered
  - Cross-life NPC descendants (families persisting across epochs)
  - Family karma affecting descendant NPC attitudes
- **Implementation**:
  - Lineage data structure (array of life objects)
  - Journal visualization component
  - NPC generation based on lineage karma
  - Dialogue variation based on ancestral warmth/hostility

### 8. Final Ritual System
- **Files**: `js/systems/ritual.js`, `js/states/ritual.js`
- **Features**:
  - Resonance score calculation (replaces checklist)
  - Partial/freeing/near true/true ending based on resonance
  - Mauna requirement (critical - cannot be compensated)
  - 30-second silence mechanic (final boss = player's impatience)
  - Outcomes based on resonance thresholds
- **Implementation**:
  - Resonance calculator (Vidya levels, Mauna, Asthra, True Name, Eclipse)
  - Ritual attempt validation
  - Outcome determination based on score
  - 30-second silence state with input blocking
  - Ending sequence player

### 9. Civilian NPC Engine (Optimized)
- **Files**: `js/systems/npc.js`, `js/entities/civilian.js`, `js/systems/village_clock.js`
- **Features**:
  - Single global Village Clock (replaces individual NPC loops)
  - NPC Role Variables (1=Farmer, 2=Potter, etc.)
  - Hour-based state transitions (commute, work, sleep)
  - Mayasur attack override (flee to nearest shrine)
  - Epoch-based roster management (spawn/despawn per epoch)
  - Profession-as-discovery-engine (rumor system)
  - Profession-based karma effects
- **Implementation**:
  - Village Clock tick-based system (hourly)
  - NPC factory with role-based behaviors
  - Schedule system (waypoints per profession/time)
  - Fleeing algorithm (quadrant-based shrine targeting)
  - Epoch-gated NPC spawning
  - Profession-gated rumor dialogues
  - Profession-based karma actions

### 10. Audio & Atmosphere System
- **Files**: `js/systems/audio.js`
- **Features**:
  - Layered audio architecture (BGM, BGS/Ambient, ME/Effects)
  - Epoch-appropriate instrumentation
  - Adaptive music based on Karma, corruption, proximity to sages, meditation
  - Audio channels for different purposes
  - Screen tinting for time of day, eclipse, dreaming state
- **Implementation**:
  - Audio manager with multiple channels
  - Dynamic volume/pitch/effects based on game state
  - Ambient soundscapes per epoch/situation
  - Triggered SFX for events
  - CSS-based screen tinting (or canvas overlay)

## User Interface Systems

### 1. Seeker's Journal (Persistent Across Lives)
- **Files**: `js/systems/journal.js`, `js/states/menu.js` (journal tab), `css/ui.css`
- **Features**:
  - Persistent UI element accumulating notes, hints, visions
  - Dream Wing for dream fragments
  - Lineage tab for lineage web
  - What They Call Him page (Mayasur names across epochs)
  - Curse fragment tracking
  - Map/notes functionality
- **Implementation**:
  - Journal state object saved to storage
  - Tabbed interface (Adventure, Dreams, Lineage, etc.)
  - Rich text/formatting capabilities
  - Unlocking/discovery animations

### 2. HUD (Heads-Up Display)
- **Files**: `js/systems/hud.js`, `css/ui.css`
- **Features**:
  - Displays: [Game_Hours]:[Game_Minutes] — Year [Game_Years]
  - Context-sensitive indicators (Vidya affinities, etc.)
  - Minimalist design that fades during meditation
  - Eclipse timer display (when active)
- **Implementation**:
  - DOM elements updated each tick
  - Visibility toggles based on player state
  - Animation for fades/changes

### 3. Skill Trees & Vidya Displays
- **Files**: `js/systems/vidya.js`, `js/states/menu.js` (skills tab), `css/ui.css`
- **Features**:
  - Visual representation of Vidya progress
  - Discovery hints (not direct unlocks)
  - Mastery indicators
  - Affinity gains display
- **Implementation**:
  - Interactive skill trees
  - Tooltip/hint system
  - Visual progression indicators

## Core Game Loop & Architecture

### Main Game Loop (js/main.js)
```
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastTimestamp;
  
  // Update systems
  updateSystems(deltaTime);
  
  // Render
  render();
  
  lastTimestamp = timestamp;
  requestAnimationFrame(gameLoop);
}

function updateSystems(deltaTime) {
  clock.update(deltaTime);           // Master clock (time system)
  epochSystem.update();              // Epoch checks/transitions
  villageClock.update();             // NPC schedules (hourly)
  corruptionSystem.update();         // Spread checks (every 30 min)
  vrittiSystem.update();             // Thought interruption checks
  player.update(deltaTime);          // Player state/movement
  npcs.update();                     # NPC behaviors
  audioSystem.update();             # Audio transitions
  ui.update();                      # HUD/menus
}

function render() {
  // Clear canvas
  // Render world (tiles, entities, effects)
  // Render UI overlays
  // Render HUD
}
```

### Time System (js/systems/clock.js)
- 1 real second = 10 in-game minutes (configurable)
- Tracks: Game_Hours, Game_Minutes, Game_Days, Game_Years
- Triggers: Village Clock (hourly), Daily Events (daily), Yearly Events (yearly)
- HUD display: "[HH]:[MM] — Year [YYYY]"

### Save System (js/systems/save.js)
- Uses browser storage (LocalStorage/IndexedDB)
- Saves: Journal, Life counter, Karma totals, Epoch state, Unlocked fragments, etc.
- Lifetime vs cosmic variables distinction (via naming convention)
- On rebirth: Reset lifetime variables (L_ prefix), preserve cosmic variables
- Autosave + manual save options

## Priority Implementation Order (Milestone Approach)

### M0: Proof of Concept (2-4 weeks)
- One working life cycle: birth → explore → die → Dreaming State → rebirth
- No content, just systems
- Core: Time system, basic player movement, death/rebirth loop
- Goal: Verify the samsara loop feels right

### M1: Epoch 2 Vertical Slice (Age of Roots) (6-8 weeks)
- Age of Roots fully playable
- 2 Sages implemented (Bhrigu & Pulaha suggested starters)
- Village Clock working
- 2 NPC types scheduled
- Basic Vidya system (Level 1 skills)
- Simple overworld exploration

### M2: Samsara Loop Complete (4-6 weeks)
- All rebirth mechanics working
- Karma system (Light/Shadow)
- Dreaming State with Council of Echoes
- Vritti system
- Basic Journal implementation

### M3: Full Sage Roster (8-10 weeks)
- All 9 Sages implemented with Level 1 skills
- Bond system working
- Dream Fragments 1-9
- Curiosity affinity system
- Basic profession system

### M4: Epochs 1-4 (6-8 weeks)
- First half of world history playable
- Corruption system active
- Mayasur Phase 1-3 events
- Basic purification systems
- Enhanced NPC schedules

### M5: Epochs 5-7 + Ritual (8-10 weeks)
- End-game content
- Asthra forge (multi-life process)
- All ritual resonance outcomes
- True Ending: 30-second silence
- Final ritual sequence
- Samat transformation

### M6: Polish & Audio (4-6 weeks)
- Full audio layering (BGM, BGS, ME/Effects)
- Adaptive music system
- Visual filters (epoch colors, corruption tint, dreaming indigo)
- Particle FX (dreaming void, corruption fog, eclipse overlay)
- Font/UI polish
- Responsiveness & performance optimization

## Key Design Decisions to Lock First (From GAP Analysis)

Before implementing any systems, these decisions must be made:

1. **Island Geography** (Confirm/Modify from GAP Doc Section GAP 7):
   - Mountain Range (N)
   - Kratu's Ridge (Dhanur Vidya - NE)
   - Relic of Pride (Sunken Temple - E)
   - Temple of Vows (Absolute center)
   - Sage locations arranged around center
   - Village cluster (S) - starting location
   - Relic locations: Rage (NE volcanic cave), Pride (E sunken temple), Desire (N mountain peak)

2. **Five Open Questions** (from mayaworld_game_design1.md):
   - **Player character appearance**: Evolving glow system (recommended: visible progression via Vidya mastery)
   - **Save slot naming**: Named at birth, revealed as "Samat" at end (NOT available as player-chosen name)
   - **Sound/music**: YES - layered audio system (Web Audio API)
   - **Tutorial**: First life only - Bhrigu finds player (not vice versa)
   - **Multiplayer**: Deferred but designed for (Supabase Realtime later)

3. **One Life Duration Target**: 60-90 minutes of play
   - Most players: 2-3 Sages per life
   - Full playthrough: 5-8 lifetimes (6-12 hours total)
   - True Ending feels earned, not checklist

## Adaptations from RPG Paper Maker to Web

### What Translates Well:
- **Event-driven architecture** → JavaScript event system
- **Variables & Switches** → Game state object
- **Condition-based event pages** → State machines/conditions in JS
- **Parallel process events** → `setInterval`/`requestAnimationFrame` tick systems
- **Custom menu plugins** → React/Vue components or vanilla JS UI
- **Tile-based movement** → Grid-based or pixel-based movement with collision
- **Audio channels** → Web Audio API gain nodes
- **Screen tint** → CSS filters or canvas overlays

### What Needs Reimplementation:
- **RPM's event page system** → JavaScript state machines with conditions
- **Switch/Variable naming conventions** → Adopt L_/cosmic variable pattern
- **Epoch overlay strategy** → Dynamic asset/theme loading based on epoch
- **NPC scheduling** → Single global clock vs individual loops
- **Database-like systems** (Journal, Lineage) → Client-side storage + UI
- **Particle systems** → Canvas particles or lightweight library

## Risk Assessment & Mitigation

### High Risks:
1. **Scope Creep** - Mitigation: Strict milestone approach, cutscope document
2. **Performance** (Many NPCs/effects) - Mitigation: Epoch-gated spawning, object pooling, LOD
3. **Save System Complexity** - Mitigation: Clear lifetime/cosmic variable separation, rigorous testing
4. **Narrative Cohesion** - Mitigation: Early implementation of Dreaming State/Journals
5. **Audio Synchronization** - Mitigation: Dedicated audio manager, Web Audio API precision

### Medium Risks:
1. **Touch/Mobile Controls** - Mitigation: Design for both keyboard and touch from start
2. **Browser Compatibility** - Mitigation: Feature detection, polyfills where needed
3. **Asset Pipeline** - Mitigation: Early establishment of asset naming/conversion processes

## Success Criteria
- Core samsara loop feels meditative and meaningful (not grindy)
- Players discover the curse through exploration, not hand-holding
- The 30-second silence finale creates genuine emotional impact
- Each life feels distinct due to epoch, profession, and accumulated knowledge
- Systems reinforce philosophy: Vrittis teach observation, Mauna rewards stillness
- Technical: 60fps target, <3s load times, offline capable after initial load

## Next Steps
1. Confirm island geography with stakeholders
2. Lock the five open questions from game_design1.md
3. Establish core repository structure
4. Implement M0 proof of concept
5. Iteratively build toward milestones