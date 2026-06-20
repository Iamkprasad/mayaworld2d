# MayaWorld — Game Design Bible
### *From Quiet Sanctuary to Living Myth*

---

## 1. Your Core Vision — Restated & Validated

Your concept transforms MayaWorld from a passive spiritual sandbox into a **purpose-driven, death-cycling RPG** with a single mythic goal: **defeat Mayasur, the destroyer of cities.** Here is the skeleton, as I understand it:

- The island is no longer 9 sages in solitude — it is a **living civilization** with farmers, potters, weavers, traders, and families going about daily life.
- The player is **born as a baby**, in a randomly determined time period, family, and gender.
- Over their lifetime, the player must seek out the **9 hidden sages**, each of whom teaches a unique skill.
- The player's ultimate goal is to **kill Mayasur**, a demonic force that periodically destroys cities across the island.
- Mayasur has a **counter to every individual skill** — no single trick can defeat him.
- Only when the player has **mastered all 9 skills** and discovers **the specific conditions** (the curse, the place, the time, the weapon) can Mayasur be killed.
- **When the player dies, they are reborn.** The time period and family of rebirth is determined by the *order* they learned skills and the *time* of their death — creating a loop of discovery across lifetimes.
- The **curse of Mayasur** is a hidden piece of lore that gets revealed through exploration, and is the final key to victory.

**Verdict:** This is a genuinely strong concept. It blends roguelike death-cycling (like *Outer Wilds* and *Hades*) with an apprenticeship RPG (like *Kenshi* meets *Spiritfarer*) and wraps it in Hindu/Vedic mythology. The "fixed-timeline world with random entry" mechanic is the most original element — it turns the world's *history* into a puzzle.

---

## 2. The 9 Sages — Skill Mapping

Your existing sages already have rich personalities in [constants.ts](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/constants.ts#L28-L38). Here is how I propose mapping each to a gameplay skill domain, rooted in their temperament and existing personality weights:

| Sage | Temperament | Existing Personality | **Proposed Skill Domain** | **Skill Name** |
|------|------------|---------------------|--------------------------|----------------|
| **Bhrigu** | Fiery | High spiritualDepth (0.8), moderate calm | **Weapons — Sacred Fire** | *Agni Vidya* — Mastery of divine weapons and fire-based combat |
| **Pulastya** | Social | High curiosity (0.7), high movement (0.8) | **Strategy & Espionage** | *Niti Shastra* — Tactical thinking, deception, reading enemy patterns |
| **Pulaha** | Gentle | High calm (0.8), low curiosity (0.3) | **Healing & Herbalism** | *Vaidya Kala* — Medicine, poison antidotes, stamina restoration |
| **Kratu** | Resolute | Highest movement (0.9), moderate all | **Martial Arts & Body** | *Dhanur Vidya* — Physical combat, archery, body conditioning |
| **Angiras** | Luminous | Highest curiosity (0.9), low calm (0.3) | **Knowledge & Lore** | *Jyotish Vidya* — History, astronomy, reading omens, finding the curse |
| **Marichi** | Radiant | Highest spiritualDepth (0.95), lowest movement | **Yoga & Inner Power** | *Yoga Siddhi* — Meditation powers, time-sense, slowing perception |
| **Atri** | Contemplative | Balanced, high spiritualDepth (0.8) | **Elemental Geography** | *Bhu Vidya* — Terrain mastery, finding hidden paths, reading the land |
| **Vashistha** | Wise | High calm (0.8), highest spiritualDepth (0.9) | **Mantra & Cosmic Law** | *Brahma Vidya* — Sacred chants, shields, understanding the curse's nature |
| **Daksha** | Industrious | High curiosity (0.6), moderate all | **Crafting & Engineering** | *Shilpa Vidya* — Weapon forging, building, traps, the sacred weapon |

### Why This Mapping Works

Each skill is essential to defeat Mayasur, and each has a **counter** that Mayasur exploits:

| Skill | What It Gives You | **Mayasur's Counter** |
|-------|-------------------|----------------------|
| Agni Vidya (Fire) | Ranged divine attacks | He absorbs fire — he was born from a cosmic fire ritual |
| Niti Shastra (Strategy) | Predict his attack patterns | He changes patterns every cycle — chaos incarnate |
| Vaidya Kala (Healing) | Survive his strikes | He inflicts a "soul wound" that herbs cannot heal |
| Dhanur Vidya (Martial) | Physical combat damage | His body regenerates faster than you can damage it |
| Jyotish Vidya (Knowledge) | Read his weaknesses | He has illusory weaknesses — traps for scholars |
| Yoga Siddhi (Inner Power) | Slow time, enhanced perception | He exists partly outside time — your slowing barely works |
| Bhu Vidya (Geography) | Fight on favorable terrain | He reshapes terrain when he attacks a city |
| Brahma Vidya (Mantra) | Shields and cosmic law | His curse was *given by a god* — human mantras can't override it alone |
| Shilpa Vidya (Crafting) | Build the weapon | Without knowing *what* to build, you build the wrong thing |

**The lesson:** Every skill alone leads to a clever failure. Only the combination, applied with the *right knowledge*, wins.

---

## 3. Enhancements I Propose

### 3A. The Living World — Civilian AI System

Your idea of "a world full of people living their daily life" is the biggest scope expansion. Here is how to approach it without making the engine unmanageable:

**Population Tiers:**
- **Named NPCs** (~30–50): These have unique dialogue, schedules, and relationships. They include village elders, a blacksmith, a potter, a farmer family, traders, a storyteller, children, etc.
- **Background Crowd** (~100–200): These are simplified agents rendered as generic sprites — they walk between homes, fields, and markets on fixed schedules. They don't have dialogue trees but react to world events (fleeing Mayasur attacks, celebrating festivals).
- **Ghosts of the Past** (during Night/Mist): Translucent figures from previous eras, visible only with certain Sutras unlocked — this reuses existing rendering code from your Sutra visual effects in [sutraSystem.ts](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/sutraSystem.ts).

**Daily Life Cycles:**
- Morning: Farmers go to fields, potters to kilns, children play near the river
- Day: Market activity, fishing at the lake, construction at the village
- Evening: Gathering at the temple, storytelling at the central clearing
- Night: Homes glow, guards patrol, the world grows quiet and dangerous

**Enhancement: Economy System**
- The player can take up a profession (farming, pottery, etc.) as a **cover identity** each life. This earns food and shelter but also determines which NPCs they interact with, and therefore which *rumors about the sages* they overhear.
- A potter might hear about Daksha's location. A farmer might learn of Pulaha's herb garden. This ties profession to discovery.

---

### 3B. Mayasur — The Antagonist Design

Mayasur should not be a final boss sitting in a room. He should be a **recurring catastrophe** — a force of nature that the player witnesses destroying cities, *motivating* the quest.

**The Mayasur Cycle:**
- Mayasur attacks a different settlement every **N in-game years** (configurable, e.g., every 20 years of world-time).
- The attack is a terrifying event: the sky turns red, the ground shakes, buildings collapse, NPCs flee or die.
- The player might *die* in a Mayasur attack — this is one of the death triggers for rebirth.
- Over multiple lives, the player witnesses multiple attacks and starts to see the *pattern* (which settlements, what time of year, what weather).

**Mayasur's Presence:**
- He is not always visible. Between attacks, he exists as a **dark presence** — ominous signs: dead crops near the mountain, birds flying in wrong directions, red moonrises.
- NPCs speak of him in hushed tones. Different eras have different names for him. Piecing together that they're all the same entity is itself a discovery.

**Enhancement: Mayasur Has a Human Form**
- Between attacks, Mayasur walks among the people. He might appear as a traveler, a priest, or a merchant. In some lifetimes, the player might unknowingly *help* him.
- A late-game revelation: Mayasur is not purely evil. He is *cursed* to destroy. He was once a sage himself — the **Tenth Sage** who was cast out. This adds moral complexity and sets up the curse revelation.

---

### 3C. The Rebirth System — Temporal Mechanics

This is the most mechanically complex system. Here is my proposed design:

**What Determines the Next Life:**

| Factor | Effect on Rebirth |
|--------|------------------|
| **Time of Death** | Determines the *era* you're born into. Die young → born in a later era (the world has moved on). Die old → born in a nearby era. |
| **Number of Skills Learned** | More skills = born into a more "advanced" era with larger settlements but harder access to remaining sages. Fewer skills = simpler era, sages are more accessible but Mayasur attacks are more devastating. |
| **Order of Skills Learned** | Determines *family type*. If your first skill was Dhanur Vidya (martial), you're born into a warrior family. If it was Vaidya Kala (healing), into a healer's family. This gives you an affinity bonus for re-learning that skill faster. |
| **Karma Score** | High karma → born into a family with advantages (closer to a sage, wealthier). Low karma → born in a remote area, harder start. |
| **Gender** | Alternates or is weighted by actions. Some sages are more accessible to certain genders in certain eras (reflects historical cultural structures — a design choice worth discussing). |

**What Carries Between Lives:**

> [!IMPORTANT]
> This is a critical design decision. Too much carryover makes death meaningless. Too little makes progress feel erased.

My recommendation: **Nothing mechanical carries over. Only KNOWLEDGE carries over.**

- The player keeps their **understanding** of the world (because the human player remembers).
- They do NOT keep skills, items, or stats — they must re-learn everything each life.
- However: **Affinity** — re-learning a skill from a previous life is faster (50% time reduction). This rewards persistence without trivializing death.
- The player's **Journal** (a UI element) persists across lives, accumulating notes, hints, and fragments of the curse story.

---

### 3D. The Curse of Mayasur — The Hidden Narrative

This is the narrative spine that ties everything together. Here is my proposed lore:

**The Full Story (revealed in fragments across lives):**

> Long before the island had a name, there were not nine sages but **ten**. The tenth was **Tamas**, the most powerful of all — master of all nine disciplines. But Tamas grew proud. He declared that the sages were wasted guiding mortals and should instead *rule* them.
>
> The nine sages opposed him. Unable to defeat him in combat (for he knew everything they knew), they appealed to the **cosmic law** — Rta itself. Rta does not take sides. Instead, it offered a bargain: Tamas would be bound to the island, his power turned to destruction. He would be compelled to destroy what he once sought to rule, eternally. This is the curse.
>
> But Rta, being impartial, left a **flaw** in the curse: Tamas can be freed (killed) if a mortal achieves what Tamas himself achieved — mastery of all nine skills — and then does what Tamas refused to do: **uses them not to rule, but to sacrifice.**
>
> The weapon that kills Mayasur is not a sword. It is an **offering** — a ritual that requires:
> 1. All 9 skills mastered
> 2. Performed at the **Temple of Vows** (the original temple from your world generator at the top of the map)
> 3. During a **solar eclipse** (a rare celestial event)
> 4. Using the **Asthra of Tamas** — a weapon forged from Tamas's own belongings scattered across the island, assembled via Shilpa Vidya
> 5. The player must know the **True Name of Tamas** — discovered through Jyotish Vidya and Brahma Vidya combined

**How the Curse is Discovered:**
- Fragment 1: Found in the **Ruins** — ancient carvings mention "ten, not nine"
- Fragment 2: Pulastya (the social sage) lets slip a reference to "the one who left"
- Fragment 3: Marichi, in deep meditation bond (relationship 80+), reveals the name "Tamas"
- Fragment 4: Vashistha teaches the story of the cosmic bargain when Bond is maxed
- Fragment 5: Angiras reveals the timing — the eclipse — through astronomical knowledge
- Fragment 6: Daksha, when given the right artifact fragments, recognizes them as "belonging to someone who came before me"
- Fragment 7: The player discovers Tamas's cave (currently the **Cave of Marichi** in world gen — could be renamed or doubled) containing his personal effects
- Fragment 8: Bhrigu teaches the fire-ritual that combines the fragments into the Asthra
- Fragment 9: Atri reveals the location — the Temple of Vows is not just a temple; it's the site of Tamas's original exile

---

## 4. Corrections & Potential Pitfalls

### 4A. "Fixed Time World" Needs Careful Scope

> [!WARNING]
> Designing a full world history with distinct eras is an enormous content burden. You'd need art, dialogue, NPC schedules, and building layouts for each era.

**My Correction:** Instead of radically different eras, use **three epochs** that differ in tone and scale:

| Epoch | Name | World State | Key Difference |
|-------|------|-------------|----------------|
| 1 | **Age of Seeds** | Small settlements, dense forest, sages are openly among people | Sages are easier to find but teach only basic skill levels |
| 2 | **Age of Cities** | Towns have grown, trade routes exist, some forest cleared | Sages have retreated to remote locations; civilization is richer but sages distrust people |
| 3 | **Age of Ruin** | Mayasur has destroyed major cities, rubble everywhere, refugees | Sages are in hiding; the world is dangerous but the curse fragments are most accessible |

The same map, the same tile engine, but with **overlay data** that changes which buildings exist, which NPCs are present, and how the world feels. This is achievable without rebuilding the renderer.

### 4B. Difficulty Curve Risk

If Mayasur "has a remedy to every trick," the player might feel hopeless before learning the full solution. 

**Correction:** Give partial victories. Each skill should let the player *wound* Mayasur or *delay* an attack. The player should feel their skills matter even before they have all nine. Examples:
- With Agni Vidya alone, the player can protect a single building from destruction during an attack.
- With Dhanur Vidya, the player can evacuate civilians faster.
- With Bhu Vidya, the player can predict *where* the next attack will strike and warn the settlement.

These partial victories reward the player emotionally and mechanically (karma, NPC trust) even when they can't yet win.

### 4C. Gender Mechanic Sensitivity

Your mention of gender-based rebirth tied to skill order is interesting mechanically but needs thoughtful handling. 

**Correction:** Rather than restricting content by gender, use it as a **narrative lens**. In Epoch 1, a female character might learn from Pulaha (healing) through a different quest than a male character — not because of capability, but because of *social access* (who will talk to you, which spaces you can enter). This creates replay variety without implying gender-based power differences. The sages themselves should teach anyone.

---

## 5. New Mechanics I'd Add

### 5A. The Dreaming State (Between Lives)

When the player dies, they don't immediately respawn. They enter a **Dreaming State** — a liminal space rendered as the world map but washed in indigo, with only the sages visible as golden silhouettes.

In this space:
- The player reviews their Journal entries
- They can hear echoes of important conversations from the life that just ended
- They receive a cryptic hint about the next life ("You will be born where the river bends...")
- They can choose to **sacrifice karma** to influence one aspect of their rebirth (e.g., spend 50 karma to guarantee being born near a specific sage)

This turns death from a punishment into a **contemplative moment** that fits the spiritual DNA of Manomaya.

### 5B. The Memory Leaf System

Your existing item system already has [Memory Leaf](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/constants.ts#L110) as an item. Expand this:

- Memory Leaves are rare items found at clearings and forests.
- When a player holds a Memory Leaf and stands at a significant location (a ruin, a shrine, the cave), they see a **vision** — a brief cutscene narration of what happened at that location in a different epoch.
- This is the primary mechanism for discovering curse fragments and lore.
- Memory Leaves persist in the Journal across lives (as recorded visions, not physical items).

### 5C. Sage Companion System

Instead of just visiting sages to learn, some skill training should require **traveling with the sage** over multiple in-game days. This deepens the relationship system already in [tileContexts.ts](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/tileContexts.ts) (bond thresholds: new → known → warm → deep).

- Bond < 20: The sage acknowledges you but won't teach
- Bond 20–50: The sage teaches the *theory* of their skill (passive knowledge)
- Bond 50–80: The sage teaches the *practice* (active skill unlocked)
- Bond 80+: The sage reveals their **personal connection to Tamas** (curse fragment)

### 5D. The Sutra Transformation

Your existing [Sutra System](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/sutraSystem.ts) (visual abilities unlocked at bond 80) maps perfectly to the skill system. Rename Sutras to **Vidyas** in the game context, and make each Sutra the *visual proof* that a skill has been mastered:

- Bhrigu's Karma Drishti → unlocked alongside Agni Vidya
- Pulastya's Sanga Sutra → unlocked alongside Niti Shastra
- etc.

This means your existing Sutra rendering code (auras, threads, glowing tiles) becomes the game's skill-mastery feedback, with zero wasted work.

---

## 6. Win Condition — The Final Ritual

The game has **one true ending** and several **false endings** (attempts that fail because the player is missing one element):

### The Five Requirements

```
┌─────────────────────────────────────────────────┐
│             DEFEAT MAYASUR (TAMAS)              │
├─────────────────────────────────────────────────┤
│ 1. Master ALL 9 Vidyas                          │
│ 2. Forge the Asthra of Tamas (Shilpa Vidya)     │
│    └─ Requires 3 relic fragments from the Cave, │
│       the Ruins, and the Mountain               │
│ 3. Know the True Name (Jyotish + Brahma)        │
│ 4. Be at the Temple of Vows                     │
│ 5. Perform the ritual during a Solar Eclipse     │
│    └─ Eclipses occur every ~5 cycles of the     │
│       day/night system (predictable with         │
│       Jyotish Vidya)                             │
└─────────────────────────────────────────────────┘
```

### False Endings (Partial Attempts)

| What the Player Tries | What Happens |
|----------------------|--------------|
| Fight Mayasur with 8/9 skills | Mayasur overwhelms the gap. Player dies. A narration reveals which skill was missing. |
| Right place, wrong time | The ritual fizzles. Mayasur laughs. "You know where, but not *when*." |
| Right time, wrong weapon | The generic weapon shatters. "Only what was his can unmake him." |
| All conditions met but doesn't know the name | The ritual begins but cannot *bind* — "You command a force you cannot name." |
| **All five conditions met** | The true ending triggers. |

### The True Ending

The ritual does not *kill* Tamas. It **frees** him. The curse is broken. Tamas appears as the sage he once was — old, weary, grateful. He speaks to the player, acknowledges the nine sages, and dissolves into light. The island heals. Cities that were destroyed begin to regrow. The end screen is the island at dawn, peaceful, with a single new sapling growing where Tamas stood.

> [!TIP]
> This ending aligns with the spiritual philosophy of Manomaya — the game is not about killing evil but about understanding and releasing suffering. Tamas is not a villain; he is a prisoner. The player's mastery is not violence but compassion-through-knowledge.

---

## 7. Technical Feasibility — Building on What Exists

Your current codebase is well-structured for this expansion:

| Existing System | How It Extends |
|----------------|---------------|
| [worldGenerator.ts](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/worldGenerator.ts) — Procedural island with biomes | Add epoch overlays: settlement density, ruin tiles, NPC spawn points per epoch |
| [agentEngine.ts](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/agentEngine.ts) — Needs-based AI for sages | Extend to civilian NPCs with simpler needs (just hunger + sleep + work schedule) |
| [sutraSystem.ts](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/sutraSystem.ts) — 9 Sutras with visual effects | Rename to Vidya system; add skill-tree progression within each |
| [dialogueBank.ts](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/dialogueBank.ts) — Narration templates | Add per-sage lore dialogue, curse fragments, and epoch-specific narrations |
| [sessionController.ts](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/sessionController.ts) — Session state | Add rebirth state, life counter, persistent journal, epoch tracker |
| [renderer.ts](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/renderer.ts) — Pixel sprite rendering | Add civilian sprites (recolor existing sage sprites), Mayasur sprite, attack VFX |
| [constants.ts](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/constants.ts) — Items, Moments, Karma | Add relic fragments, Asthra crafting recipe, eclipse timing constants |
| [tileContexts.ts](file:///c:/Users/DELL/Desktop/AIprojects/manomaya/src/mayaworld/tileContexts.ts) — Tile aura text | Add epoch-specific tile descriptions ("This village once stood proud. Now only ash remains.") |

---

## 8. Recommended Implementation Phases

```mermaid
graph LR
    A["Phase 1<br/>Living World"] --> B["Phase 2<br/>Skill System"]
    B --> C["Phase 3<br/>Mayasur"]
    C --> D["Phase 4<br/>Rebirth Cycle"]
    D --> E["Phase 5<br/>Curse & Ending"]
```

| Phase | Scope | Estimated Complexity |
|-------|-------|---------------------|
| **Phase 1** | Civilian NPCs, daily schedules, profession system, populated villages | High — new agent type, schedule system |
| **Phase 2** | 9 Vidya skill trees, sage teaching quests, bond-gated learning | Medium — extends existing Sutra/bond system |
| **Phase 3** | Mayasur as world event, attack cycle, partial victories, human form | High — new event system, boss AI, VFX |
| **Phase 4** | Death → Dreaming → Rebirth, epoch system, journal persistence | Medium — new session lifecycle, epoch overlays |
| **Phase 5** | Curse fragments, relic collection, Asthra forging, final ritual, endings | Medium — narrative content, ritual sequence |

---

## 9. Open Questions for You

1. **Scope priority:** Do you want to build this as a full standalone game or as an extended mode within the existing Manomaya spiritual site?

2. **Art style:** The current renderer uses pixel-art canvas sprites. Do you want to keep this style for the RPG, or move to the Three.js 3D renderer already started in your `three/` directory?

3. **Save system:** Rebirth implies persistent state across sessions. Are you comfortable with localStorage / Supabase for saving life-state and journal data?

4. **Mayasur's human form:** Do you like the idea that Mayasur is the cursed Tenth Sage (Tamas), or do you prefer him as a purely demonic/external force?

5. **Multiplayer consideration:** Should other players ever inhabit the same world instance (seeing each other as "fellow wanderers" in different lives), or is this strictly single-player?

6. **Epoch content depth:** Three epochs as proposed, or do you want more granularity (5–7 distinct time periods)?

---

*This document is a living design. It should be revised as decisions are made and implementation reveals new constraints.*
