# MayaWorld — Expanded Game Design Specification v2.0
### *Deep Implementation Guide for RPG Paper Maker*

> **Design Audit Note**: Three structural tensions in v1.0 are addressed head-on before expansion. Each fix is marked `[FIX]`. New systems are marked `[NEW]`. RPG Paper Maker-specific implementation notes are marked `[RPM]`.

---

## TABLE OF CONTENTS

1. [Design Audit & Critical Fixes](#1-design-audit--critical-fixes)
2. [Core Philosophy — Refined](#2-core-philosophy--refined)
3. [Narrative Arc — Expanded](#3-narrative-arc--expanded)
4. [The 7 Epochs — Implementation Deep Dive](#4-the-7-epochs--implementation-deep-dive)
5. [The 9 Sages & Vidya System — Expanded](#5-the-9-sages--vidya-system--expanded)
6. [Samsara System — Redesigned](#6-samsara-system--redesigned)
7. [NEW: Corruption & Purification System](#7-new-corruption--purification-system)
8. [NEW: Vritti System (Thought Interruption)](#8-new-vritti-system-thought-interruption)
9. [NEW: Dream Fragment & Memory Architecture](#9-new-dream-fragment--memory-architecture)
10. [NEW: Lineage Web & Inherited Karma](#10-new-lineage-web--inherited-karma)
11. [The Final Ritual — Redesigned](#11-the-final-ritual--redesigned)
12. [Civilian NPC Engine — Optimized for RPM](#12-civilian-npc-engine--optimized-for-rpm)
13. [Audio & Atmosphere Design System](#13-audio--atmosphere-design-system)
14. [RPG Paper Maker: Engine-Specific Implementation](#14-rpg-paper-maker-engine-specific-implementation)
15. [Variable & Switch Architecture](#15-variable--switch-architecture)
16. [Asset & Resource Recommendations](#16-asset--resource-recommendations)
17. [Scope & Milestone Roadmap](#17-scope--milestone-roadmap)

---

## 1. Design Audit & Critical Fixes

### [FIX 1] — The Samsara Contradiction

**The Problem**: v1.0 calls death "not a failure state" but then gives players a Karma Shop that rewards optimization. Players will grind deaths to unlock stat buffs — the exact opposite of contemplative design.

**The Fix — "The Weight of Forgetting"**:
Death should feel like *loss with grace*, not a menu screen. The Dreaming State is not a shop — it is a conversation. Restructure:

- **Remove the Karma Shop entirely.** Karma is not currency. It is *accumulated weight* — it shapes your next life passively, without a menu.
- **Replace with the Council of Echoes**: In the Dreaming State, the 9 Sages appear as dim silhouettes (brighter for Sages you bonded with deeply). Each one speaks a single memory from your past life. These memories automatically convert to passive affinities in the next life.
- **The player has one choice only**: Which Sage's voice do you carry? (This sets the dominant Vidya affinity for the new life — everything else carries over invisibly.)
- **Result**: Rebirth feels like meditation between breaths, not an RPG upgrade screen.

---

### [FIX 2] — The Five-Seal Checklist Problem

**The Problem**: The True Ending requires 9 Vidyas maxed + 3 relics + True Name + location + eclipse. This is a completionist checklist, not a contemplative climax.

**The Fix — "Ripeness, Not Completion"**:
The ritual shouldn't check boxes — it should check *understanding*. Redesign the conditions as **resonance thresholds** rather than binary locks:

- Each Vidya contributes a **resonance score** to the ritual (partial mastery = partial resonance).
- The ritual *works* at any resonance level, but the outcome varies. A player with 6 Vidyas at Level 3 and 3 at Level 2 gets a *partial freeing* — Tamas is weakened but not freed, earning a "grey ending" and giving a meaningful hint.
- Only perfect resonance (all 9 at Level 3) produces the True Ending, but the journey to discover *why* the grey ending wasn't enough is itself the contemplative arc.
- See [Section 11](#11-the-final-ritual--redesigned) for the full ritual redesign.

---

### [FIX 3] — NPC Schedule Performance

**The Problem**: Individual Common Event loops for each NPC will cause lag and event stack overflow in RPG Paper Maker, especially during epoch transitions with 20–40 NPCs per map.

**The Fix — "The Village Clock"**:
Use a **single global schedule Common Event** (the Village Clock) that reads NPC role from a variable on each NPC event, rather than giving each NPC its own loop. See [Section 12](#12-civilian-npc-engine--optimized-for-rpm) for full implementation.

---

## 2. Core Philosophy — Refined

### The Three Axes of Growth

Abandon the single "level" metaphor. Player growth happens on three independent axes simultaneously:

| Axis | What It Measures | How It Grows | What It Affects |
|---|---|---|---|
| **Vidya Depth** | Technical mastery per discipline | Study time with Sages, practice challenges | Skills available, ritual resonance |
| **Karma Weight** | Moral gravity of choices | Every significant decision accumulates weight (positive or negative) | NPC reactions, lineage options, Dreaming State clarity |
| **Smriti (Memory)** | Cosmic recollection across lifetimes | Discovering lore, completing Sage bonds | What carries over during rebirth, clarity in Dreaming State |

### What "Non-Violence" Actually Means Mechanically

v1.0 includes "Agni Astra (ranged fire blast)" and "Force Strike (physical knockback)." These are combat moves. If the non-violence pillar is real, skills must be *repurposed*, not relabeled violence.

**Revised Skill Philosophy**: Every offensive-looking skill has a *preservative* framing:
- **Agni Astra** → renamed **Agni Seal**: Creates a ring of purifying fire around the player that *repels* corrupted entities (they flee, not die).
- **Force Strike** → renamed **Earthen Stillness**: Causes a shockwave that knocks back and *stuns* (not damages) threats, buying evacuation time.
- **The player never deals killing damage.** Enemy HP bars show *Corruption %*, not health. Reducing it to zero *purifies* the entity, it does not destroy it.

---

## 3. Narrative Arc — Expanded

### Act 0 — The Silence Before Fire (Prologue)
*This act is not playable.*

A 2–3 minute cinematic using RPM's cutscene system. Tamas is shown as the most devoted sage — gentle, curious, beloved. The moment of his fall is shown from the other nine Sages' perspectives: not a battle, but a *heartbreak*. His curse is delivered in silence. The sky goes dark. The nine Sages lower their heads.

This reframes the entire game: the player knows from minute one that Mayasur is a trapped, suffering teacher. The antagonist is grief made manifest. This prevents the final ritual from feeling like a "boss defeat" — it has always been a rescue mission.

**[RPM]**: Implement using RPM's Event cutscene page with `Show Pictures`, `Move Camera`, `Fade In/Out`, and `Play Music` commands. Lock player input during this sequence via `Input Disable` command at the event start.

---

### Act I — Samsara (Expanded)

**Infancy Phase** (new):
The player begins as a literal infant. First 2–3 minutes of each new life are spent as a baby with no skills, limited movement, and the world described from a low camera angle. NPCs interact differently — they speak in simplified language. The village feels *enormous*.

This does two things:
1. It makes the player genuinely feel the vulnerability of new life.
2. It naturally introduces the world's current Epoch through environmental observation, not text dumps.

**The Growing Phase — Skill Unlocks via Curiosity**:
Instead of purchasing skills, young characters *unlock abilities by interacting with the world*. A child who spends time near the river gains early Bhu Vidya affinity. One who sits near the shrine fire begins sensing Agni Vidya. This makes each new life feel *organically different*, not just a fresh menu session.

```
[Curiosity Affinity Table]
+---------------------+----------------------------------+--------------------+
| Location/Activity   | Curiosity Affinity Gained        | Sage Connection    |
+---------------------+----------------------------------+--------------------+
| Sitting by river    | Bhu Vidya +3 per 10 min          | Atri               |
| Near shrine fire    | Agni Vidya +3 per 10 min         | Bhrigu             |
| Observing stars     | Jyotish Vidya +3 per night spent | Angiras            |
| Helping farmer      | Vaidya Kala +2, Niti Shastra +2  | Pulaha / Pulastya  |
| Building/crafting   | Shilpa Vidya +4 per session      | Daksha             |
| Meditating alone    | Yoga Siddhi +5 per session       | Marichi            |
| Listening to elders | Brahma Vidya +3 per conversation | Vashistha          |
+---------------------+----------------------------------+--------------------+
```

---

### Act II — The Apprenticeship (Expanded)

**Finding the Sages Is a Puzzle, Not a Map Marker**:
Remove waypoints to Sages. Each Sage is found through environmental inference:
- Bhrigu (fire) → Follow smoke rising above the treeline at dawn.
- Angiras (stars) → Sleep outside under a clear sky. A star trail appears pointing to his retreat.
- Atri (geography) → Ask an elder about the "stone that breathes." They describe a landmark. Navigate by description.

**Sage Relationship Friction**:
Not all Sages accept the player immediately. Two Sages — Daksha and Vashistha — require *a prior Sage vouching for you* (Daksha needs Pulaha or Bhrigu at Bond ≥ 50; Vashistha needs any two Sages at Bond ≥ 30). This creates natural relationship sequencing and prevents the player from beelining to max power.

**Sage Dialogue Depth**:
Each Sage has three dialogue tiers, unlocked by Bond level:
- **Bond < 50**: Surface wisdom, practical advice, skill instruction.
- **Bond 50–79**: Personal history. Subtle hints about Tamas. Philosophical debates.
- **Bond ≥ 80**: The Sage shares a *Memory Fragment* — a half-vision of what happened to Tamas. Nine Memory Fragments assembled together reveal the full truth. This makes high bonding narratively essential, not just mechanically rewarding.

---

### Act III — The Catastrophe (Expanded)

**Mayasur Attack Phases — Not Just One Event Type**:

| Phase | Name | Triggered By | Effect |
|---|---|---|---|
| Phase 1 | Shadow Tremor | Epoch 4 begins | Edges of the map darken. Animals flee toward center. NPCs report bad dreams. |
| Phase 2 | The Wail | First settlement near collapse | A subsonic audio event — the music cuts out and a distant, whale-like sound plays. Corruption tiles begin appearing. |
| Phase 3 | The Strike | Player witnesses event | Mayasur's visual presence (massive shadowed silhouette crossing the sky). Buildings crumble (tile changes). NPCs enter flee state. |
| Phase 4 | Aftermath | 1 in-game day after strike | A destroyed map version loads. Ash particle overlay. Refugees create a camp. New survivor NPCs with unique lore. |

**The Player Role During Catastrophe**:
The player cannot fight Mayasur. Their actions during catastrophe determine Karma:
- Evacuating civilians (Warning Call skill) → High Karma gain.
- Using Vaidya skills to heal wounded → High Karma.
- Panicking and fleeing → Neutral.
- Attempting to attack Mayasur (direct) → Low Karma (futile, hubris).
- Performing a calming ritual near wounded civilians → Karma gain + Smriti gain.

---

## 4. The 7 Epochs — Implementation Deep Dive

### Epoch Transition Architecture [RPM]

Each Epoch is not just a Switch flip — it requires coordinated map changes, NPC roster changes, audio changes, and visual filters.

**Recommended Epoch Transition Sequence**:
```
[Epoch Transition Common Event]
1. Fade to Black (2s)
2. Set Switch: Epoch_N = ON, Epoch_(N-1) = OFF
3. Set Variable: Current_Epoch = N
4. Call Common Event: Update_Map_Layers (changes parallax/tile overlays)
5. Call Common Event: Refresh_NPC_Roster (spawns/despawns NPCs based on epoch)
6. Call Common Event: Update_Ambient_Audio
7. Set Variable: Player_Age = 0 (new life begins)
8. Fade In (2s)
9. Show Picture: Epoch_Title_Card (e.g., "Age of Temples — Year 1200")
10. Wait 3s → Remove Picture
```

**Epoch Map Layer Strategy**:
Rather than creating entirely new maps per Epoch (which multiplies file size), use **conditional tile overlays** on a single base map:
- Base map = Age of First Fire terrain (permanent geography, rivers, mountains).
- Each Epoch adds/removes building event sprites in layers.
- Ruined variants of buildings are separate sprites toggled via event pages.
- This reduces total map count by ~60% while still visually representing each era.

```
[Epoch Visual States per Map Zone]
+------------------+---------+---------+---------+---------+---------+
| Map Zone         | Epoch 1 | Epoch 3 | Epoch 4 | Epoch 5 | Epoch 7 |
+------------------+---------+---------+---------+---------+---------+
| Central Village  | Trees   | Huts    | Temples | Ruins   | Vines   |
| River Crossing   | Fording | Bridge  | Arch    | Cracked | Moss    |
| Mountain Pass    | Wild    | Cleared | Paved   | Blocked | Overgrown|
+------------------+---------+---------+---------+---------+---------+
```

### The Eclipse Cycle [RPM]
The Solar Eclipse (required for the True Ending) occurs once per full Epoch cycle. Track it via:
```
Variable: Eclipse_Countdown (starts at 400 in-game days)
Every in-game day: Eclipse_Countdown -= 1
When Eclipse_Countdown = 0:
  → Set Switch: Eclipse_Active = ON
  → Apply screen tint: dark amber overlay (R:100, G:70, B:0, A:120)
  → Play: eclipse_chime audio (looped, low)
  → Set Timer: Eclipse_Duration = 3 in-game hours
  → After Eclipse_Duration: Eclipse_Active = OFF, reset countdown
```
Angiras's Eclipse Predictor skill shows a counter on the HUD: `"Eclipse in X days"`.

---

## 5. The 9 Sages & Vidya System — Expanded

### Vidya Training: Replace "Study Unlocks Skill" with "Practice Reveals Skill"

In v1.0, skills are unlocked by reaching Bond thresholds. This is a menu-driven unlock system. Replace with *discovery through practice*:

Each Sage teaches the player a **foundational technique** (Level 1). Level 2 and 3 are not taught — they are *discovered* when the player uses Level 1 skills in contextually appropriate situations:

**Example — Bhrigu's Agni Vidya**:
- Level 1 (Taught): Build Campfire. Creates a rest point.
- Level 2 (Discovered): Use Build Campfire in a *corrupted tile area*. The purifying effect triggers naturally. Bhrigu appears as a vision and names it "Agni Seal." Level 2 unlocked.
- Level 3 (Mastery): Use Agni Seal near a Mayasur Corruption node during a catastrophe. The interaction reveals the fire's cosmic resonance. Bhrigu's Bond jumps to 95+. Level 3 unlocked.

This means **mastery is earned through presence and curiosity**, not grinding Bond points.

---

### Expanded Sage Profiles

#### Bhrigu — Agni Vidya
- **Location**: A volcanic ridge clearing, found by following dawn smoke.
- **Personality**: Impatient, tests the player with silence before speaking. Warmest once trust is earned.
- **Hidden Truth** (Bond ≥ 80): Bhrigu was the first to realize Tamas had fallen, but chose silence to protect the order. He carries guilt about this. His high-Bond dialogue is the most emotionally raw in the game.
- **Sage Sutra (passive)**: *Agni Memory* — Campfires the player builds persist across rebirths as unmarked warm spots in the world (cosmetic, but haunting).

| Level | Skill Name | Mechanic | Field Use |
|---|---|---|---|
| 1 | Build Campfire | Places a rest/save marker. Restores 30 HP, 20 MP. | Camping, night survival |
| 2 | Agni Seal | Creates a 3-tile radius purification ring. Corruption tiles revert. | Clearing paths, Epoch 5–6 travel |
| 3 | Cosmic Ember | Charges the Asthra of Tamas (required for ritual). | Endgame only |

---

#### Marichi — Yoga Siddhi
- **Location**: A cliff face at dawn. Only visible if the player arrives at exactly 06:00 in-game. He blends with the sunrise.
- **Personality**: Speaks in questions, never answers. Frustrating at first, transcendent at high Bond.
- **Hidden Truth** (Bond ≥ 80): Marichi has already achieved liberation but chose to stay because he felt responsible for Tamas's descent. He teaches stillness because he knows that his own action caused the greatest violence.
- **Sage Sutra (passive)**: *Time Breath* — The player can pause environmental timers (water wheels, falling objects) for 3 seconds by holding the meditation button. Useful in puzzle sequences.

| Level | Skill Name | Mechanic | Field Use |
|---|---|---|---|
| 1 | Seated Meditation | Player sits. Restores 50 MP. NPCs nearby become curious and approach. | Initiating NPC conversations passively |
| 2 | Time Dilation | Slows field objects to 30% speed for 10s. | Puzzle traversal, evacuation sequences |
| 3 | Astral Projection | Player leaves body for 60s. Can scout ahead 2 screens. Body is vulnerable. | Reconnaissance, finding hidden areas |

---

#### Vashistha — Brahma Vidya (Key Sage for True Ending)
- **Location**: The island's oldest temple — but he cannot be found until two other Sages vouch for the player.
- **Personality**: Formal, precise, does not smile. Sees through pretense instantly.
- **Hidden Truth** (Bond ≥ 80): Vashistha wrote the cosmic decree that cursed Tamas. He has spent 3,000 years trying to find a mortal worthy of undoing his own judgment. He has failed every cycle so far. When the player reaches Bond 80, he is *not proud* — he is *terrified the player might fail again*.
- **Sage Sutra (passive)**: *Dharmic Shield* — Player is immune to Karma penalties from one catastrophic mistake per lifetime.

---

#### Daksha — Shilpa Vidya (Key Sage for Asthra)
- **Unique Mechanic — The Forge**:
The Asthra of Tamas is not simply crafted. It requires a **multi-lifetime process**:
  - Life 1: Find the Relic of Rage. Bring it to Daksha. He begins studying it.
  - Life 2 or later: Find the second relic. Daksha's analysis progresses.
  - Final life: All three relics + Daksha at Bond ≥ 80 → He can forge the Asthra.

This means the True Ending *requires at least 3 lifetimes* — enforcing the Samsara theme mechanically.

**The Forge Mechanic [RPM]**:
```
Variable: Daksha_Forge_Progress (0–3)
When Relic delivered:
  Daksha_Forge_Progress += 1
  Show Cutscene: Daksha examines relic, adds note to journal
When Daksha_Forge_Progress = 3 AND Daksha_Bond >= 80:
  → Unlock: Assemble Asthra event
  → Show: Extended forge cutscene (longest in the game — ~5 mins)
  → Add Item: Asthra_of_Tamas to inventory (persists across rebirths)
```

---

### The Tenth Vidya — Mauna (Silence)

**This was missing from v1.0 and it should be the most important discipline.**

Tamas fell because he mastered all nine Vidyas but never mastered Mauna — the Vidya of Silence, of *not doing*. No Sage teaches it. It is discovered by the player naturally when they:
1. Sit in Seated Meditation for 5 consecutive in-game hours (long enough to feel uncomfortable as a player).
2. During a Mayasur catastrophe, choose to *do nothing* — no healing, no evacuation, just witness. The game detects this non-action.
3. Reach the Dreaming State and, at the Council of Echoes, choose *no Sage's voice*.

When all three conditions are met across any lifetimes, a glyph appears in the Journal: the tenth slot, previously blank, fills with a single symbol. No fanfare. No notification. The player must notice it themselves.

**Why This Matters for the True Ending**: The ritual's final step is not the Asthra or the True Name — it is the player pressing no button for 30 seconds while Mayasur rages. The Mauna response — *meeting chaos with stillness* — is the actual mechanism of liberation.

---

## 6. Samsara System — Redesigned

### The Dreaming State — Rewritten

**Visual**: Not a menu. A dark void with slow drifting stars. The player's footsteps leave rings of light on the ground. Distance and sound are distorted.

**The Council of Echoes**:
The nine Sages appear at the edge of the void. Their luminosity corresponds to your Bond level:
- Bond < 30 → Barely visible silhouette.
- Bond 30–60 → Outline, faint voice.
- Bond 60–80 → Clear form, full voice.
- Bond ≥ 80 → Glowing, the Sage walks toward you and speaks directly.

Each Sage delivers one sentence — a memory from your past life. These are procedurally selected from a pool of 15 per Sage, based on what you actually did in that life. If you spent significant time near Bhrigu's retreat, he might say: *"You sat by my fire, even when I said nothing. Remember what the flames told you."*

**The Single Choice**:
After all Sages speak (or fewer, if bonds are low), a prompt appears: one Sage's name glows brighter than the others, and the player presses interact to *carry their voice*. This determines the dominant Vidya affinity in the next life (30% faster training speed for that discipline).

If the player chooses *no voice* (walks away from all Sages and sits in the void alone), they unlock the Mauna Vidya trigger condition #3.

---

### Karma Mechanics — Detailed

**Karma is not a point system. It is a weight system.** Both positive and negative Karma accumulate as separate counters:

```
Variable: Karma_Light (good deeds)
Variable: Karma_Shadow (harmful actions)
Variable: Karma_Balance = Karma_Light - Karma_Shadow
```

The game uses `Karma_Balance` for most calculations, but `Karma_Shadow` matters independently for certain outcomes. A player with 500 Karma_Light and 490 Karma_Shadow has a technically "good" balance, but the Shadow weight causes the Dreaming State to feel heavier — more fog, dimmer Sages, distorted footstep sounds.

**What Generates Karma**:

| Action | Karma Effect | Notes |
|---|---|---|
| Evacuating civilians during catastrophe | Light +15 per NPC saved | |
| Meditating for 3+ in-game hours | Light +5 | Once per day cap |
| Delivering relic to Daksha | Light +20 | |
| Choosing Self-Sacrifice rebirth trigger | Light +40 | |
| Attacking a sage's retreat out of impatience | Shadow +10 | |
| Abandoning an NPC in catastrophe | Shadow +20 | |
| Attempting to attack Mayasur directly | Shadow +5 | |
| Karma Cleanse (Vashistha skill) | Converts HP to reduce Shadow | Costly but powerful |
| Choosing no Sage's voice in Dreaming State | Mauna progress | Neutral karma |

---

### Rebirth State — Revised Table

```
+-------------------------------+------------------------------------------+
| RESETS on Rebirth             | CARRIES OVER (always)                    |
+-------------------------------+------------------------------------------+
| Character age                 | Seeker's Journal (lore, maps, recipes)   |
| Current items & equipment     | Karma_Light & Karma_Shadow totals        |
| Gold / village currency       | Smriti level (cosmic memory depth)       |
| Sage Bond levels              | Asthra of Tamas (if forged)              |
|   (depreciates 10–20% based   | Mauna Vidya progress conditions met      |
|   on Karma_Shadow weight)     | Vidya Affinities (chosen in Dreaming     |
| Direct Vidya skill levels     |   State from past life's dominant Sage)  |
| Map fog of war                | Daksha_Forge_Progress variable           |
+-------------------------------+------------------------------------------+
| CARRIES OVER (conditionally)  | CONDITIONS                               |
+-------------------------------+------------------------------------------+
| Sage Bond (partial)           | 10% lost per rebirth; Karma_Light slows  |
|                               | the depreciation rate                    |
| Epoch (stays same)            | Only if Karma_Balance > 200 at death     |
| One item                      | Only if died via Self-Sacrifice trigger  |
+-------------------------------+------------------------------------------+
```

---

## 7. NEW: Corruption & Purification System

### What Corruption Is

Corruption is Mayasur's ambient influence — not just during attacks, but always present in the world as a spreading darkness. It manifests as:

- **Map tiles**: Corrupted tiles appear as dark, cracked earth with a subtle pulsing animation. Moving through them drains MP at 1 per step.
- **NPCs**: A corrupted NPC speaks in fragmented, fearful dialogue. Their daily schedule breaks — they stand still or wander randomly.
- **Sages**: Corrupted sage retreats cause Bond depreciation over time even without rebirth.

### Corruption Spread Mechanics [RPM]

```
[Corruption Spread Common Event — runs every 30 in-game minutes]
1. Check: Current_Epoch >= 4 (corruption starts in Age of Temples)
2. For each active Corruption_Node on current map:
   a. Pick random adjacent tile (within 2 tiles of node)
   b. If tile is not a shrine/temple tile AND not water:
      → Set tile terrain tag to "Corrupted"
      → Play subtle spread SFX (very quiet, unsettling)
3. Check: Corruption_Nodes_Total > threshold for current epoch:
   → Trigger Mayasur Phase event (see Section 3)
```

**Corruption Nodes**: Invisible events on the map at fixed positions. They activate based on Epoch and Mayasur's attack history. Players can destroy Corruption Nodes using Agni Seal (Level 2), Earth Sync (Atri), or by building a shrine within 3 tiles.

### Purification Methods by Vidya

| Vidya | Purification Skill | Radius | Duration |
|---|---|---|---|
| Agni Vidya (L2) | Agni Seal | 3 tiles | Permanent |
| Yoga Siddhi (L2) | Extended Meditation | 1 tile | Permanent |
| Brahma Vidya (L2) | Mantra Shield | Self only | 1 day |
| Shilpa Vidya (L3) | Build Shrine | 5-tile radius | Permanent, marks teleport point |
| Bhu Vidya (L2) | Earth Sync | Reveals nodes, no removal | Diagnostic only |

---

## 8. NEW: Vritti System (Thought Interruption)

### Concept

*Vritti* (Sanskrit: mental fluctuations) are intrusive thought events that interrupt the player during meditation, exploration, or ritual preparation. Borrowed from Patanjali's Yoga Sutras — the practice of yoga is the stilling of Vritti.

### How It Works

During specific activities (Seated Meditation, studying with a Sage, quiet exploration), a **Vritti Overlay** occasionally appears: a whispered thought overlaid on the screen in soft text. These are not instructions or story beats. They are psychological interruptions.

**Example Vritti texts**:
- *"Are you sure this life has been enough?"*
- *"You have forgotten something. What was it?"*
- *"He is watching you."*
- *"The next eclipse is closer than you think."*

**The mechanic**: The player can either:
1. **Dismiss it** (press any action button) → Meditation is interrupted slightly (timer pauses, then resumes).
2. **Observe it** (do nothing for 5 seconds) → The Vritti fades naturally. Smriti +1 gained. Meditation continues uninterrupted.

This teaches the player the game's core philosophy through *mechanics, not text*: noticing thoughts without reacting to them.

**[RPM Implementation]**:
```
[Vritti Common Event]
1. Check: Player_State = "Meditating" OR "Studying"
2. Roll random: 1–100
3. If roll < 30 (30% chance per meditation minute):
   → Pick random Vritti text from pool (40+ entries)
   → Show Text: Vritti text (centered, soft blue, italic)
   → Start Timer: Vritti_Duration = 5 seconds
   → Wait for player input OR timer expiry:
      - If input received: Interrupt meditation slightly (Smriti +0)
      - If timer expires: Vritti fades. Smriti +1.
```

---

## 9. NEW: Dream Fragment & Memory Architecture

### Dream Fragments

These are collectible memories — not items in an inventory, but *experiences stored in the Journal's Dream Wing*. They are found:
- By sleeping in specific locations (lying down on certain tiles at night).
- By reaching Bond ≥ 80 with a Sage.
- By witnessing a Mayasur catastrophe without fleeing.
- By using Astral Projection near ancient ruins.

**Dream Fragments are non-linear puzzle pieces**. Each is a 30–60 second interactive vision of Tamas's past — his childhood, his mastery, his fall, his anguish. They are not labeled or numbered. The player assembles the narrative of who Tamas was from fragments across multiple lifetimes.

**Fragment Implementation [RPM]**:
```
Each Dream Fragment:
  → Stored as: Variable DreamFragment_XX = 1 (collected)
  → Displayed as: Full-screen sepia-toned picture + audio + text overlay
  → Accessible via: Journal > Dream Wing > [fragment title — poetic, not numbered]
  → Carries over: Yes, across all rebirths (stored in persistent variable)
```

### The Full Picture
When all Dream Fragments are collected, a final composite vision appears in the Journal — the complete story of Tamas told in the player's accumulated order of discovery. Because players find fragments in different orders, this final picture feels *personally assembled* rather than delivered.

---

## 10. NEW: Lineage Web & Inherited Karma

### The Lineage Map

Between rebirths, the player accumulates a **Lineage Web**: a visual diagram in the Journal showing all past lives, their birth family, their dominant Vidya, their cause of death, and which Sages were encountered. This is not mechanical — it is a *narrative artifact* the player accumulates.

**Why This Matters**: By the fifth or sixth life, the player has a genuinely complex personal history visible in the Journal. Seeing the web often triggers strategic and emotional responses simultaneously. A player who died in the catastrophe twice will have that marked clearly. A player who achieved Self-Sacrifice three times will see a pattern.

### Cross-Life NPC Descendants

Some NPC families persist across Epochs. If the player helped a Farmer family in Epoch 2 (high Karma interaction), their descendants appear in Epoch 4 — now running a market stall, with a subtle visual resemblance to their ancestor. They have unique dialogue recognizing a vague "ancestral warmth" toward the player's lineage.

**[RPM] Implementation**:
```
Variable: Family_Sharma_Karma (tracks cumulative Karma from interactions with this lineage)
At Epoch transition:
  If Family_Sharma_Karma > 30:
    → Spawn descendant NPC with "Warm" dialogue state
  If Family_Sharma_Karma < 0:
    → Descendant is hostile or absent
  If Family_Sharma_Karma 0–30:
    → Neutral descendant
```

---

## 11. The Final Ritual — Redesigned

### Replacing the Checklist with Resonance

**Resonance Score Calculation**:
```
Ritual_Resonance = 0
For each Vidya (1–9):
  If Vidya_Level = 1: Resonance += 5
  If Vidya_Level = 2: Resonance += 10
  If Vidya_Level = 3: Resonance += 20
If Mauna_Vidya_Unlocked: Resonance += 30 (CRITICAL — cannot be compensated)
If Asthra_Forged: Resonance += 15
If True_Name_Known: Resonance += 10
If Eclipse_Active: Resonance multiplier x1.5
Max Resonance (without Eclipse): 225
Max Resonance (with Eclipse): 337
```

### Outcome Table (Revised)

| Resonance | Ending | Name | What Happens |
|---|---|---|---|
| < 80 | Failure | *The Unready* | Mayasur ignores the player entirely. No engagement. The altar stays dark. Hint: *"Come back when the circle is complete."* |
| 80–149 | Partial | *The Compassionate One* | The ritual partially engages. Tamas is weakened and retreats, buying 200 in-game years of peace. But he is not freed. The Sages look at the player with grief. The cycle continues. |
| 150–224 | Near True | *Almost Samat* | Tamas's form becomes visible within Mayasur. He reaches toward the player. But the ritual's final step requires Mauna — and without it, the connection breaks. Tamas screams. It is devastating. |
| 225+ (requires Mauna) | True Ending | *Samat* | The 30-second Mauna silence. Mayasur stills. Tamas emerges, ancient and exhausted. He does not thank the player. He simply looks. Then dissolves. The eclipse passes. The Sages speak one final word each. Silence. |

### The 30-Second Silence

The True Ending's final moment must be designed carefully. When Mayasur is at the threshold:

- All music stops.
- The HUD disappears.
- On-screen text: *"..."*
- A slow, barely audible drone begins (20Hz, felt more than heard).
- The player's controller/keyboard receives no prompts.
- If any button is pressed, the ritual destabilizes slightly (resonance temporarily drops, recovers after 5s).
- After 30 seconds of stillness: the liberation sequence begins.

This is Mauna as a game mechanic — the final boss is the player's own impatience.

---

## 12. Civilian NPC Engine — Optimized for RPM

### The Village Clock Architecture

Replace individual NPC Common Event loops with a **single global Village Clock event** using NPC Role Variables.

**Setup**:
- Each NPC event has one local variable: `This_Event_Role` (values: 1=Farmer, 2=Potter, 3=Weaver, 4=Trader, 5=Guard).
- A global Common Event called `Village_Clock` runs every in-game hour.
- It cycles through all active NPC events and applies state transitions based on `Hour_of_Day` and `This_Event_Role`.

```
[Village_Clock Common Event — runs hourly]
1. Read Variable: Hour_of_Day
2. Branch:
   IF Hour = 6:
     → Call Common Event: NPC_Commute_To_Work (for all active NPCs)
   IF Hour = 8:
     → Call Common Event: NPC_Begin_Work
   IF Hour = 17:
     → Call Common Event: NPC_Commute_Home
   IF Hour = 19:
     → Call Common Event: NPC_Sleep (set transparency ON, disable interaction)
3. Check: Mayasur_Attack_Active = TRUE
   → Override all states: Call Common Event: NPC_Flee
   → Set all NPC movement toward nearest shrine coordinates
```

### NPC Fleeing Pathfinding [RPM]

RPG Paper Maker does not have built-in pathfinding. Use waypoint-based fleeing:

```
[NPC_Flee Common Event]
For each NPC:
  1. Check NPC's current map quadrant (NW, NE, SW, SE corner of map)
  2. Assign nearest Shrine/Temple as waypoint based on quadrant
  3. Set NPC movement: Move Toward Event [Shrine_Event_ID]
  4. Set NPC move speed: Fast
  5. Set NPC animation: Flee_Pose (arms raised, stumbling gait)
  6. Change dialogue state: "fleeing" (generic panic lines on interact)
```

### Epoch-Based NPC Roster Management

Avoid spawning all NPCs at game start. Use **Epoch-gated spawn events**:

```
[Map Initialization Event — runs on map entry]
1. Check: Current_Epoch variable
2. Branch:
   Epoch 1: Spawn 0 civilian NPCs (no villages yet)
   Epoch 2: Spawn Farmer_01, Farmer_02, Elder_01 (3 total)
   Epoch 3: Spawn all Epoch 2 + Trader_01, Potter_01, Weaver_01 (6 total)
   Epoch 4: Full roster (12–15 per village)
   Epoch 5: Despawn 50% (killed/fled). Mark 3 NPCs as "Survivor" state.
   Epoch 6: Despawn 80%. Remaining are gaunt, despairing dialogue.
   Epoch 7: 1–2 NPCs per map. Ancient, quiet, witnessing.
```

---

## 13. Audio & Atmosphere Design System

### Layered Audio Architecture

MayaWorld should use **layered ambient audio**, not single background tracks. RPG Paper Maker supports multiple audio channels. Use them:

```
Channel 1 (BGM): Era-appropriate melodic layer
  - Epoch 1–2: Solo bansuri (bamboo flute), no percussion
  - Epoch 3–4: Bansuri + tabla (hand drum) + tanpura drone
  - Epoch 5–6: Same instruments, detuned slightly, slower tempo
  - Epoch 7: Only tanpura drone, very quiet

Channel 2 (BGS/Ambient): Environmental soundscape
  - Village day: Distant chatter, birds, water
  - Village night: Crickets, wind, occasional owl
  - Post-catastrophe: Wind through ruins, distant crying, settling rubble
  - Dreaming State: Underwater echo, slowed heartbeat

Channel 3 (ME/Effect): Triggered by events
  - Sage encounter: Single temple bell
  - Corruption spread: Low subsonic pulse (barely audible)
  - Eclipse: Rising drone, building slowly over 60s
  - Mauna moment: Silence (deliberately cutting all channels)
```

### Adaptive Music Triggers [RPM]

```
[Audio_State Common Event — checks every 5 in-game minutes]
1. If Karma_Balance > 100: BGM pitch +2% (brighter tone)
2. If Karma_Balance < -50: BGM pitch -3%, add subtle reverb
3. If Corruption_Nodes_Total > 5 on current map: BGS corruption pulse fades in
4. If Player near Sage Retreat (within 5 tiles): BGM volume -20%, add silence layer
5. If Meditating: All BGM fades out over 10s. Only tanpura drone remains.
```

---

## 14. RPG Paper Maker: Engine-Specific Implementation

### What RPG Paper Maker Does Well (Use These)

- **3D maps with 2D sprite characters**: Use for dramatic scale — Mayasur's silhouette crossing a 3D landscape is viscerally powerful.
- **Custom menu plugins**: The Journal (Seeker's Journal) should be built as a custom menu plugin.
- **Particle systems**: Use for corruption spread, fire effects, eclipse overlay, and Dreaming State void.
- **Tilesets with multiple layers**: Essential for the epoch overlay strategy described in Section 4.
- **Condition-based event pages**: The backbone of the epoch system and NPC scheduling.

### What RPG Paper Maker Struggles With (Workarounds)

| Challenge | Workaround |
|---|---|
| No native pathfinding | Waypoint-based movement for NPCs (see Section 12) |
| Complex UI (Journal, Lineage Web) | Build as external HTML overlay via RPM plugin API or custom menu page |
| Large number of persistent variables across rebirths | Use a structured variable naming convention (see Section 15) |
| Time system (in-game clock) | Run a master clock Common Event. 1 real second = 10 in-game minutes. |
| Corruption tile tracking | Store corrupted tile positions as paired variables (X,Y per node) rather than modifying tilesets directly |

### Plugin Recommendations for RPM

| Plugin | Purpose | Where to Find |
|---|---|---|
| **Time Fantasy / MV Time System port** | In-game clock management | Adapt from RPG Maker MV versions for RPM's JS layer |
| **Particle.js integration** | Corruption fog, Dreaming State stars | Include via RPM's custom resource import |
| **Custom Menu Framework** | Journal, Lineage Web, Dream Wing | Build in RPM's plugin system using the documented RPM Plugin API |
| **Tint Screen by Hour** | Automatic day/night color grading | Script a Common Event that runs tint changes based on Hour_of_Day variable |

### The In-Game Clock [RPM]

```
[Master_Clock Common Event — Parallel Process]
Every 1 real second:
  Variable: Game_Minutes += 10
  If Game_Minutes >= 60:
    Game_Minutes -= 60
    Game_Hours += 1
    → Call Common Event: Village_Clock
  If Game_Hours >= 24:
    Game_Hours = 0
    Game_Days += 1
    → Call Common Event: Daily_Events (corruption spread, eclipse countdown)
  If Game_Days >= 365:
    Game_Days = 0
    Game_Years += 1
    → Call Common Event: Yearly_Events (epoch check, Sage bond depreciation)

Display HUD: "[Game_Hours]:[Game_Minutes padded] — Year [Game_Years]"
```

---

## 15. Variable & Switch Architecture

### Naming Convention (Use This to Prevent Variable Sprawl)

```
SWITCHES (binary state)
  World State:   Epoch_1 through Epoch_7
  Events:        Mayasur_Attack_Active, Eclipse_Active, Eclipse_Used
  Player State:  Is_Meditating, Is_Astral_Projecting, Is_Sleeping
  Progress:      True_Name_Known, Asthra_Forged, Mauna_Unlocked
  Sage Met:      Sage_Bhrigu_Met through Sage_Daksha_Met

VARIABLES (numeric)
  Time:          Game_Hours, Game_Minutes, Game_Days, Game_Years
  Player Core:   Karma_Light, Karma_Shadow, Smriti_Level, Player_Age
  Vidya Levels:  Vidya_Agni (1–3), Vidya_Niti, Vidya_Vaidya, Vidya_Dhanur,
                 Vidya_Jyotish, Vidya_Yoga, Vidya_Bhu, Vidya_Brahma,
                 Vidya_Shilpa, Vidya_Mauna (0 or 1)
  Sage Bonds:    Bond_Bhrigu (0–100), Bond_Pulastya ... Bond_Daksha
  Forge:         Daksha_Forge_Progress (0–3)
  Dream:         DreamFragment_01 through DreamFragment_27
  Lineage:       Family_[Name]_Karma (one per persistent family)
  Mauna Conds:   Mauna_Condition_1, Mauna_Condition_2, Mauna_Condition_3
  Ritual:        Ritual_Resonance (calculated at attempt)
  Eclipse:       Eclipse_Countdown (days remaining)
  NPC:           Corruption_Nodes_Total, Village_Threat_Level
```

### Variable Persistence Across Rebirths

RPM does not natively separate "session" from "lifetime" variables. Structure this manually:

- **Lifetime variables** (reset on rebirth): Prefix with `L_` (e.g., `L_Current_Gold`, `L_Vidya_Agni`)
- **Cosmic variables** (never reset): No prefix (e.g., `Karma_Light`, `Smriti_Level`, `DreamFragment_01`)
- **On rebirth event**: Run a Common Event that resets all `L_` variables to 0, while leaving all unprefixed variables intact.

---

## 16. Asset & Resource Recommendations

### Art Style Target

**Reference board**: Combine the visual grammar of *Gris* (soft watercolor, emotional color palettes) with *Spiritfarer* (warm lighting, handcrafted world detail) and filtered through Indian miniature painting aesthetics (flat perspective, intricate pattern borders, luminous color).

**Do not** use generic JRPG tilesets. The visual language of MayaWorld should feel unlike any existing RPG Maker game.

### Recommended Free/Affordable Assets

| Category | Resource | Notes |
|---|---|---|
| **Tilesets** | Ansimuz's Free Pixel Art Tilesets | Forest, cave, temple sets adaptable to Vedic context |
| **Tilesets** | Kenney.nl game assets | Clean, modifiable for your color palette |
| **Character Sprites** | OpenGameArt.org — "LPC (Liberated Pixel Cup)" sprites | Modifiable base sprites for villager roles |
| **Music** | Incompetech.com (Kevin MacLeod) | "Meditation Impromptu" and "Cipher" are near-perfect for this aesthetic |
| **Music** | Freesound.org — search "bansuri", "tanpura", "tabla" | Individual instrument recordings for layer mixing |
| **SFX** | Freesound.org — search "temple bell", "om", "fire crackle" | Direct use for shrine/meditation SFX |
| **Fonts** | Google Fonts — "Yatra One" or "Tiro Devanagari Sanskrit" | For Sanskrit text in UI |

### Custom Art Priorities (Where to Invest)

If budget allows commissioning art, prioritize in this order:
1. **The 9 Sage portraits** (shown during dialogue — seen constantly)
2. **The Dreaming State background** (the emotional core of every rebirth)
3. **Mayasur's silhouette** (must be iconic — should feel geological in scale)
4. **The Asthra of Tamas** (item art — player will stare at it for multiple lifetimes)
5. **Epoch title cards** (establish era identity immediately)

### Color Palette Reference

```
PALETTE: MayaWorld Master Colors
  Void Black:        #0A0A14  (Dreaming State background)
  Deep Indigo:       #1A1A4A  (Night sky, shadow zones)
  Cosmic Indigo:     #3D3580  (Dreaming State paths, Sage glow)
  Forest Emerald:    #2D6A4F  (Epoch 1–2 nature)
  Muted Sage Green:  #5B8C5A  (Farmer robes, fields)
  Warm Saffron:      #E07B39  (Shrine fire, sage robes)
  Pale Saffron:      #DF9D38  (Trader robes, temple ornament)
  Terracotta:        #C47D5A  (Potter robes, village walls)
  Ash Grey:          #9E9E9E  (Epoch 5–6 ruins)
  Eclipse Amber:     #C87941  (Eclipse tint overlay)
  Corruption Black:  #1C0A0A  (Corrupted tile base)
  Corruption Pulse:  #4A0010  (Corruption node glow)
  Smriti Gold:       #F5D78E  (Journal accents, high-bond Sage glow)
```

---

## 17. Scope & Milestone Roadmap

### Honest Scope Assessment

MayaWorld as fully designed is a **3–5 year solo project** or **18–24 months with a small team of 3–4**. The systems described here are implementable but require discipline to sequence correctly.

**Cut these if scope is tight**:
- Lineage Web (Journal > Lineage tab — skip, describe via text instead)
- Dynamic Corruption Spread (simplify to epoch-gated fixed tiles)
- Cross-life NPC descendants (replace with new NPCs per epoch with similar names)

**Never cut these** (load-bearing for the design):
- The Samsara Loop and Dreaming State
- The Vritti System (cheap to implement, essential to philosophy)
- The Tenth Vidya / Mauna
- The 30-second silence finale

---

### Milestone Plan

| Milestone | Goal | Estimated Duration |
|---|---|---|
| **M0: Proof of Concept** | One working life cycle: birth → explore → one Sage interaction → death → Dreaming State → rebirth. No content, just systems. | 6–8 weeks |
| **M1: Epoch 2 Vertical Slice** | Age of Roots fully playable. 2 Sages implemented. Village Clock working. 2 NPC types scheduled. | 3–4 months |
| **M2: Samsara Loop Complete** | All rebirth mechanics working. Karma system. Dreaming State with Council of Echoes. Vritti system. | 2–3 months |
| **M3: Full Sage Roster** | All 9 Sages implemented with Level 1 skills. Bond system working. Dream Fragments 1–9. | 4–5 months |
| **M4: Epochs 1–4** | First half of world history playable. Corruption system active. Mayasur Phase 1–3 events. | 3–4 months |
| **M5: Epochs 5–7 + Ritual** | End-game content. Asthra forge (multi-life). All ritual resonance outcomes. True Ending: the 30-second silence. | 4–5 months |
| **M6: Polish & Audio** | Full audio layering, adaptive music, visual filters, particle FX, font/UI polish. | 2–3 months |

---

*"The game that cannot be won by trying harder. Only by understanding more."*

---

**Document Version**: 2.0
**Engine Target**: RPG Paper Maker (latest stable)
**Original Design**: v1.0 by developer
**Expanded Design**: Audit, architecture, and new systems added in v2.0
