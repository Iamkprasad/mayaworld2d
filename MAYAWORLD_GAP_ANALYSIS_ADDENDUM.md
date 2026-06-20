# MayaWorld — Gap Analysis & Design Addendum
### *What the Original Docs Had, What Got Lost, What's Still Missing*
### *Engine Pivot: Three.js → RPG Paper Maker Translation*

---

## CRITICAL NOTICE: ENGINE PIVOT

The two original design documents (`game_design.md` and `game_design1.md`) were written assuming a **Three.js + React + TypeScript + Supabase** web application hosted on Lovable.

You are now building in **RPG Paper Maker (RPM)**.

This changes nothing about the *story or design philosophy*. It changes everything about the *implementation layer*. Every reference to TypeScript files (`worldGenerator.ts`, `agentEngine.ts`, `sutraSystem.ts`, etc.) must be mentally replaced with RPM's equivalent systems: Common Events, Variables, Switches, and Plugin scripts.

The rest of this document treats the original docs as **concept sources only** and translates what matters into RPM terms.

---

## PART 1: What the Originals Had That Got Lost in v2.0 Expanded Doc

These are ideas from your original design documents that are genuinely good and were not carried forward into the expanded design. They need to be restored.

---

### LOST ELEMENT 1 — Mayasur's Human Form

**Source**: `game_design.md`, Section 3B.

> *"Between attacks, Mayasur walks among the people. He might appear as a traveler, a priest, or a merchant. In some lifetimes, the player might unknowingly help him."*

This was one of the strongest ideas in the original documents and it was completely dropped in the expanded spec. It needs to be restored.

**Why it's critical**: The Tamas/Mayasur reveal hits hardest if the player has already met him. Not as a monster — as a quiet, melancholy traveler who asked them for help finding herbs, or to carry a message. The late-game revelation that this man was Mayasur recontextualizes every prior interaction.

**Implementation in RPM**:

Create a unique NPC event called **"The Wanderer"** that appears only in Epochs 2–4 (when civilization is present). He has no name tag. His sprite is an ordinary traveler — worn robes, slightly unusual color (very dark indigo, barely noticeable).

```
[The Wanderer — Encounter Conditions]
Epoch: 2, 3, or 4
Time of Day: Dusk only (Hour 17:00–19:00)
Location: Always on the outskirts of a village, never inside
Frequency: Once per lifetime, at most

[Wanderer Dialogue Pool — one selected randomly per encounter]
Option A: "I was a teacher once. Nobody remembers what I taught."
Option B: "You seem to be searching for something. So am I.
           I have been searching for a very long time."
Option C: "There is a place on this island where the sky once fell.
           I was there. I cannot explain what happened."
Option D: [If player has met Bhrigu]: "You've spoken with the fire sage.
           He was a student of mine, once. A long time ago.
           Tell me — does he seem well?"

[Wanderer Behavior]
- On interact: dialogue plays. He does not move or react to world events.
- After dialogue: he turns and walks slowly off the map edge.
- No combat, no quest, no follow-up in this lifetime.
- Sets Switch: Wanderer_Seen = ON (tracked across rebirths)
- In the final ritual cutscene: if Wanderer_Seen = ON,
  Tamas's appearance triggers a player recognition moment:
  "You have seen him before." The cutscene adds one line.
```

**The revelation line** (added to True Ending if Wanderer_Seen is true):

When Tamas is freed and stands as the old sage, he says:
*"We have met before. You were kind to me, when I did not deserve it.
That kindness was part of why you succeeded."*

If Wanderer_Seen is false, this line does not appear. The player who never met the Wanderer gets a slightly less complete ending — not punishing, but noticeably less resonant.

---

### LOST ELEMENT 2 — Profession as Discovery Engine

**Source**: `game_design.md`, Section 3A.

> *"The player can take up a profession (farming, pottery, etc.) as a cover identity each life. This earns food and shelter but also determines which NPCs they interact with, and therefore which rumors about the sages they overhear."*
> *"A potter might hear about Daksha's location. A farmer might learn of Pulaha's herb garden."*

The expanded v2.0 doc replaced this with Curiosity Affinities near locations. That's fine for skill growth, but it removed the social dimension — the idea that **who you work with determines what you discover**, not just where you stand.

Both systems should coexist. They complement rather than conflict.

**Profession → Rumor Pipeline [RPM]**:

```
[Profession Assignment — Early Life Event]
After infancy phase, player chooses (or is randomly assigned) a starting profession.
Set Variable: Player_Profession = [1=Farmer, 2=Potter, 3=Weaver, 4=Trader, 5=Guard]

[Profession-Gated Rumor Dialogues]
Each workplace NPC has a dialogue page that checks Player_Profession:
  IF Player_Profession = 1 (Farmer):
    NPC "Old Reva": "I've seen herb bundles drying on the north cliff.
                    Someone lives up there — never comes down."
    → This is a rumor pointing toward Pulaha (Vaidya Kala)

  IF Player_Profession = 2 (Potter):
    NPC "Kiln Master": "A traveler brought clay from the volcano ridge.
                       Strange markings on his tools. Like nothing I've seen."
    → Points toward Daksha (Shilpa Vidya)

  IF Player_Profession = 4 (Trader):
    NPC merchant gossip: "The eastern road goes quiet near the mountain pass.
                         Animals avoid it. Some old man lives there, they say."
    → Points toward Kratu (Dhanur Vidya)
```

**Profession also gates which NPCs approach the player**:
A Guard is approached by the village elder about a beast problem near the shrine. A Weaver is sought out by a traveling merchant with strange cloth. A Farmer is visited by a child who found something buried. These micro-quests are not listed in a journal — they happen naturally through workplace context.

**Profession Karma Effects**:

| Profession | Bonus Karma Action | Penalty Karma Action |
|---|---|---|
| Farmer | Sharing harvest during catastrophe | Hoarding food |
| Potter | Repairing a broken shrine vessel | Destroying a relic container |
| Weaver | Crafting robes for a newly homeless family | Refusing to shelter refugees |
| Trader | Giving fair price to a desperate seller | Overcharging during catastrophe |
| Guard | Staying at post during a Mayasur attack | Abandoning post to flee |

---

### LOST ELEMENT 3 — Ghosts of the Past

**Source**: `game_design.md`, Section 3A.

> *"Ghosts of the Past (during Night/Mist): Translucent figures from previous eras, visible only with certain Sutras unlocked."*

This is a stunning idea and costs almost nothing to implement in RPM. It directly rewards the player who has lived many lives with *glimpses of the world's former glory or ruin*.

**How it works**:

In Epoch 5–7 (ruins and silence), at specific ruins tiles at night (Hour 20:00–04:00), translucent NPC events appear if the player has unlocked Yoga Siddhi Level 2 or higher (Astral sensitivity).

These are not interactable. They replay a single looping animation — a farmer tending a field that no longer exists, a family eating at a hearth inside a collapsed wall, children playing in a courtyard that is now rubble.

```
[Ghost_Event — Event Conditions]
Page 1 (visible): Current_Epoch >= 5 AND Hour >= 20
                  AND Vidya_Yoga >= 2
  → NPC sprite: translucent (set opacity via tint: R180,G180,B220,A100)
  → Movement: fixed looping animation only
  → On interact: no dialogue. Show text: "[A memory the world has not released.]"

Page 2 (invisible): All other conditions
  → Set event transparency ON
```

A high Smriti level (cosmic memory) unlocks a second interaction: the ghost briefly turns and looks at the player. No words. This is the only interaction. It should feel deeply unsettling and moving simultaneously.

---

### LOST ELEMENT 4 — NPCs Use Different Names for Mayasur Across Eras

**Source**: `game_design.md`, Section 3B.

> *"Different eras have different names for him. Piecing together that they're all the same entity is itself a discovery."*

This is elegant environmental storytelling. It was not implemented in the expanded doc.

**Name Pool by Epoch**:

| Epoch | What NPCs Call Mayasur | Context of Reference |
|---|---|---|
| 2 (Age of Roots) | "The Shadow Between Trees" | Whispered. Children are told not to go into the forest at night because of him. |
| 3 (Age of Rivers) | "The River-Silencer" | Named for the time he destroyed a riverside settlement. River traders speak of it. |
| 4 (Age of Temples) | "Mayasur" | The civilization is large enough to have formalized mythology. Temples carry carved warnings. |
| 5 (Age of Fracture) | "The Undying Wrath" | Survivors don't use names — they describe what he does. |
| 6 (Age of Embers) | "The Reason" | A bleak shorthand. "What happened to this village?" "The Reason." Nothing more. |
| 7 (Age of Silence) | No name | The last NPCs don't speak of him. A pause. Eyes cast downward. |

The player's journal automatically records each name as encountered. A Journal page titled **"What They Call Him"** accumulates these entries. When Angiras (Jyotish Vidya Level 3) confirms they are all the same entity, the journal page transforms — all names collapse into one final line: *"Tamas."*

**[RPM Implementation]**:
```
Variable: Mayasur_Names_Collected (0–6)
When a new era name is first heard by the player:
  → Mayasur_Names_Collected += 1
  → Add entry to Journal: "What They Call Him" page
When Vidya_Jyotish = 3 AND Mayasur_Names_Collected >= 3:
  → Unlock journal transformation: all names → "Tamas"
  → Set Switch: True_Name_Known = partially (hints unlocked)
  → Full True_Name_Known requires Vashistha Bond >= 80 as confirmation
```

---

### LOST ELEMENT 5 — Character Visual Evolution via Vidya Mastery

**Source**: `game_design1.md`, Open Question 2.

> *"Should the player look like a villager (simple robes) that visually evolves as they learn Vidyas?"*

This question was never answered and never designed. It needs to be.

**Design Answer**: Yes, the character visually evolves. But not through gear — through *presence*. The character's sprite doesn't change clothing; it gains light.

**Visual Evolution Stages**:

| Stage | Trigger | Visual Change | Audio Cue |
|---|---|---|---|
| Seeker (start) | Beginning of each life | Plain robes. No aura. | None |
| Initiate | 1–3 Vidyas at Level 1 | Faint warm glow around feet when standing still | Subtle tone |
| Apprentice | 4–6 Vidyas at any level | Soft light emanates from the character at dusk/night | Gentle hum |
| Adept | All 9 Vidyas at Level 1+ | The character casts a faint secondary shadow — a more luminous self behind them | Harmonic overtone |
| Samat-Approaching | All 9 at Level 3 | The secondary shadow becomes golden. At the Temple, all 9 Sages glow in recognition. | All 9 Sage tones simultaneously |

**[RPM Implementation]**:
Use a layered character graphic approach:
```
Player sprite base: standard robes
Overlay sprite (separate event, follows player): glow_layer_XX
  → Controlled by Vidya_Total_Levels variable
  → Glow_Layer opacity scales: 0 (0 vidyas) → 30% (3) → 60% (6) → 100% (9 all L3)
  → At night (Hour 20:00–06:00): glow_layer opacity doubles (more visible in dark)
```

---

### LOST ELEMENT 6 — The "Die Young / Die Old" Epoch Navigation

**Source**: Both original documents.

> *"Die young → born in a later epoch. Die old → born in a nearby epoch."*

The expanded v2.0 doc replaced this with a more arbitrary epoch system. The original mechanic is more elegant because **it makes longevity a choice**, not just an outcome. A player who wants to rush to the end-game epochs dies young deliberately. A player who wants to stay in a specific era lives carefully and fully.

**Full Epoch Rebirth Logic [RPM]**:

```
[On Death — Rebirth Epoch Calculator]
Read: Player_Age at death
Read: Current_Epoch

IF Player_Age < 30 (died very young):
  → Next_Epoch = Current_Epoch + 2 (world has moved significantly)

IF Player_Age 30–60 (middle of life):
  → Next_Epoch = Current_Epoch + 1 (world moves forward one era)

IF Player_Age > 60 (died old):
  → Next_Epoch = Current_Epoch (same era, next generation)

IF Player_Age > 80 (died very old):
  → Next_Epoch = Current_Epoch - 1 if Current_Epoch > 1
    (can be born back into the previous era — rare, honored)

IF Rebirth_Trigger = Self_Sacrifice:
  → Next_Epoch = Player's choice of Current or Current+1

Cap: Next_Epoch cannot exceed 7. Cannot go below 1.
```

This single mechanic creates natural strategic depth: players who want to access Epoch 7 for the True Ending can die young twice. Players who love Epoch 3's civilization can age slowly across multiple lives there. Neither approach is wrong.

---

## PART 2: What's Still Missing from All Documents

These gaps exist across the original docs, the expanded v2.0, and the core concept docs. They need answers before development begins.

---

### GAP 1 — Tutorial Design (Completely Absent)

No document addresses how a first-time player learns *anything*. The game has: a rebirth system, a profession system, a karma system, an epoch system, a 10-Vidya skill tree, a corruption system, and a multi-condition ending. A player dropped in cold will be bewildered.

**Recommended Solution — "The First Sage Finds You"**:

In the very first life only (Switch: First_Life = ON), one Sage is guaranteed to appear near the player's starting village — always Bhrigu (fire), because fire is the most immediately intuitive. He does not wait for the player to find him. He walks into the village and sits by the fire at dusk.

His dialogue in the first life is different: slightly more direct. He explains the concept of Vidyas without naming them as a system. He asks the player to sit with him (teaching Seated Meditation — the most accessible skill). After this first interaction, First_Life knowledge is delivered via the Journal in 3 short notes, unlocked one per day:
- Day 1: *"You have lived before. The journal remembers."*
- Day 2: *"The sages carry wisdom. Find them. They will not find you again."*
- Day 3: *"Mayasur will come. You cannot stop him yet. Watch. Learn. That is enough."*

No tutorials after this. The first life is the tutorial.

---

### GAP 2 — The Character Name / Samat Revelation

**Source**: Open question in `game_design1.md`.

> *"Do you want players to name their character, or should 'Samat' be the only name?"*

**Recommended Design**:

The player names their character at birth, each life. These names are different (matching the random lineage). The name "Samat" is never available as a player-chosen name (it is reserved — attempting to name yourself Samat shows a gentle refusal: *"That name has not been earned yet."*).

The True Ending's emotional payoff depends on this: when Vashistha says *"From this day, you are Samat"*, it is the first and only time this name has appeared. The player's current lifetime name is replaced. The transformation is complete.

**[RPM]**: Store `Player_Current_Name` as a variable (string, named at birth). At True Ending trigger: `Player_Current_Name = "Samat"`. Update any subsequent name displays.

---

### GAP 3 — What Happens After the True Ending

No document addresses post-ending state. Does the game end and return to title? Can the player continue exploring as Samat?

**Recommended Design — "The Tenth Sage Mode"**:

After the True Ending credits, the player is given the option:
- **Rest** (return to title, save preserved as "Samat Achieved")
- **Continue as Samat** (load into a new, peaceful version of the world — Epoch 7 but healed)

The "Samat World" is Epoch 7 with corruption removed, ruins slowly rebuilding (new visual state), and all 9 Sages visible simultaneously at the Temple for the first time. No quests. No combat. No objectives. Just the world the player spent the entire game trying to save, finally at peace.

NPCs who survived into Epoch 7 speak to Samat differently — with quiet reverence. The Wanderer's spot (if Wanderer_Seen = ON) now has the sapling. It grows visibly larger each in-game day.

This is the game's actual ending — not the ritual, but the morning after. The player walking through the healed world is the payoff for every rebirth.

---

### GAP 4 — Sage Aging Across Epochs

No document addresses this: the Sages are described as living across all 7 Epochs (thousands of years). But no explanation is given for how NPCs and players perceive this. Do the Sages look old? Do they age?

**Recommended Design**:

The Sages do not age visibly. But their dialogue acknowledges time passing in subtle ways:
- In Epoch 2, Bhrigu's dialogue is curious, energetic, almost playful.
- In Epoch 5, Bhrigu's dialogue is heavier. Tired. He has watched cities burn.
- In Epoch 7, Bhrigu barely speaks. He sits and watches the player.

Their sprite does not change. But their presence does. This is achieved entirely through the `Dialogues_Epoch_N` dialogue set switching — the same face, utterly different soul by the end.

**A player who bonds with Bhrigu in Epoch 2 and meets him again in Epoch 6 (same Bond partially carried over) gets a unique dialogue**:

*"You feel familiar to me. Across all these years, I have met many seekers.
But you — there is something about your presence that does not quite reset."*

This triggers only if Bond_Bhrigu >= 40 AND Current_Epoch >= 5 AND Lifetime_Count >= 3.

---

### GAP 5 — The Multiplayer Ghost System (Design-Ready but Unbuilt)

The original docs planned ghost echoes of other players wandering the same world. This is deferred — but the design needs to be locked so RPM's save architecture doesn't prevent it later.

**Design Locked for Future**:

Ghost echoes require a server-side position log. Since RPM exports to desktop/web, the path forward would be:
- Export to web via RPM's web deployment
- Use a small external API (Supabase or PocketBase) to log player positions by epoch
- Ghost sprites loaded as read-only NPC events on map entry

**Design Rules (locked now, implemented later)**:
- Ghosts are translucent (40% opacity)
- Ghosts are never labeled
- Ghosts cannot be interacted with
- Ghosts can leave one-word offerings at shrines (preset list: "Peace", "Stillness", "Remember", "Almost", "Wait")
- Ghost paths appear as faint footprint trails that fade over 2 real minutes

---

### GAP 6 — Death by Old Age: The Aging Mechanic

How does the player "age"? No document specifies. Without a concrete aging mechanic, "dying of old age" is an arbitrary timer — not meaningful.

**Recommended Design — The Breath Counter**:

Each in-game day, a hidden variable `Life_Breath` decreases by 1. Starting value is determined by lineage:

| Lineage | Starting Life_Breath | Equivalent Lifespan |
|---|---|---|
| Farmer family | 260 | ~71 in-game years (260 days at 1/3.65 ratio) |
| Guard family | 240 | ~65 years |
| Weaver family | 270 | ~74 years |
| Trader family | 250 | ~68 years |

Life_Breath can be extended by:
- Practicing Yoga Siddhi regularly (+1 per meditation session, max +40)
- Living in a low-corruption area (+0.5 per day, max +20)
- Healing with Vaidya Kala regularly (prevents -1 per illness event)

Life_Breath decreases faster from:
- Corruption exposure (double drain in corrupted tiles)
- Self-Sacrifice triggers (costs 50 Life_Breath)
- Injury during catastrophe (costs 20–40)

When Life_Breath = 0: death cutscene (the character sits, breathes slowly, closes eyes). This is the only death that can trigger the "Died very old" bonus in the rebirth epoch calculation.

---

### GAP 7 — The Island's Geography is Never Mapped

No document specifies where anything is located. Both the original and the expanded doc reference "the volcano cave," "the sunken temple ruins," "mountain peaks," "the river," and "the Temple of Vows" — but never establish their spatial relationship.

**Recommended Island Geography (to lock now)**:

```
[Island Map — Cardinal Layout]

          N (Mountain Range)
          │
          ├── Kratu's Ridge (Dhanur Vidya)
          ├── Relic of Pride (Sunken Temple — east of mountain base)
          │
W ────────┼──────────── E
(Forest)  │           (Coast/Sea)
          │
├── Marichi's Cliff (Yoga Siddhi) — NW, sunrise-facing
├── Bhrigu's Volcanic Ridge — NE
├── Atri's River Delta — W center
├── Angiras's Observatory — center-high ground
├── Temple of Vows — absolute center island
├── Vashistha's Ancient Temple — S center
├── Pulastya's Forest Retreat — SW
├── Pulaha's Herb Cliff — N coast
├── Daksha's Forge Cave — near volcano (NE)
│
          │
          S (Village Cluster — main civilization zone)
          │
          └── Starting Village (player always born here in first life)
```

The **Relic Locations**:
- Relic of Rage → Volcanic cave (NE, near Daksha/Bhrigu)
- Relic of Pride → Sunken Temple (E coast, beneath shallow water)
- Relic of Desire → Mountain peak (N, requires Bhu Vidya Level 2 to access terrain)

The **Temple of Vows** is at the absolute center. Every Sage can see it from their retreat. The Eclipse passes directly overhead at the temple. This is not a coincidence — the island was shaped around this point.

---

## PART 3: RPG Paper Maker — What the Engine Can and Cannot Do (Reality Check)

This is the honest assessment for your specific situation.

### RPM Strengths for MayaWorld

| RPM Capability | How MayaWorld Uses It |
|---|---|
| 3D maps with 2.5D sprites | Epoch visual layers, Mayasur silhouette scale |
| Condition-based event pages | NPC schedules, epoch transitions, Sage Bond gating |
| Parallel process events | Master Clock, Corruption Spread, Vritti System |
| Custom menu plugins (JS) | Seeker's Journal, Lineage Web, Dream Wing |
| Particle system | Dreaming State void, corruption fog, eclipse overlay |
| Screen tint | Day/night cycle, eclipse amber, Dreaming State indigo |
| Multiple audio channels | Layered ambient + BGM + trigger SFX |

### RPM Limitations You Will Hit (and How to Handle Them)

| Limitation | Reality | Solution |
|---|---|---|
| No native pathfinding | NPCs cannot navigate around obstacles dynamically | Use fixed waypoint routes per profession per epoch; Mayasur flee uses quadrant-based shrine targeting |
| Complex UI | Standard RPM menus are rigid | Build Journal and Lineage Web as custom plugin using RPM's JS plugin API |
| String variables | RPM variable system is numeric-first | Use numeric codes for all named states (Profession: 1=Farmer, etc.). Player name stored as a limited character-select input. |
| Persistent cross-life data | RPM saves handle this but require discipline | Use the `L_` prefix convention for lifetime variables; all cosmic variables unprefixed. Document religiously. |
| Large maps with many events | Performance degrades above ~150 active events per map | Use epoch-gated spawn system (despawn by epoch), never run all NPCs simultaneously. Maximum 40 active NPC events per map. |
| Web export limitations | RPM's web export is functional but has loading time | Optimize: keep map sizes under 100x100 tiles; use instanced sprites for background crowd NPCs |

---

## PART 4: Priority Recommendation

Given everything above, here is the recommended priority for what to design/implement first.

### Do These Before Writing Any RPM Events

1. **Lock the island geography** (Section GAP 7 above gives a starting layout — confirm or modify it). You cannot build maps without knowing where things are.

2. **Answer the five open questions** from `game_design1.md`:
   - Player character appearance: evolving glow system (recommended above)
   - Save slot naming: named at birth, revealed as Samat at end (recommended above)
   - Sound/music: yes, layered audio system (RPM supports this natively)
   - Tutorial: first life, Bhrigu finds you (recommended above)
   - Multiplayer: deferred, design locked above

3. **Build Milestone M0 first** (from the v2.0 expanded doc): One working life cycle with no content. Just: born → can walk → can die → Dreaming State → rebirth. No Sages, no skills, no corruption. If the rebirth loop *feels right*, the rest of the game will feel right. If it doesn't, nothing else will save it.

### The Single Most Important Design Decision You Haven't Made

**How long is one life supposed to feel?**

If a life is 20 minutes of play, the game has a different pace and tone than if it's 3 hours. This determines:
- How many Sages can realistically be found per life
- How many Vidya levels can be reached per life
- Whether the Karma and aging systems feel meaningful or rushed
- How many rebirths a full playthrough requires

A reasonable target: **one life = 60–90 minutes of play**. This means:
- Most players reach 2–3 Sages per life
- A full playthrough is 5–8 lifetimes (6–12 hours total)
- The True Ending feels genuinely earned — not a checklist but a *journey*

Decide this. Write it in the design doc. Let it govern every other pacing decision.

---

*This document should be read alongside MAYAWORLD_EXPANDED_DESIGN.md v2.0.*
*Together they constitute the complete design specification for RPG Paper Maker implementation.*
