// Dialogues Data Bank for MayaWorld Sages, Civilians, and the Wanderer

export const dialogues = {
  // Sages and their bond-specific/epoch-specific lines
  sages: {
    bhrigu: {
      name: "Sage Bhrigu",
      title: "Master of Agni Vidya",
      meet: "Who wanders into the fire's range? Stand still. The embers do not tolerate impatience.",
      bondLow: "You sit by my fire, yet your mind is elsewhere. Stillness is not the absence of movement; it is the presence of absolute attention.",
      bondMid: "You ask about the shadow that passes over this land. It is called Mayasur now. In my youth, we called him brother. I carries the weight of my silence.",
      bondHigh: "Tamas was the greatest of us. When he claimed that we should rule instead of serve, I remained silent, hoping he would see reason. That silence was my betrayal. Forge the Ember, Seeker.",
      teachLevel1: "I will teach you to build a fire. Not to burn, but to gather. Let the heat remind you of your center. (Agni Vidya Level 1 unlocked)",
      teachLevel2: "You have placed a fire in the heart of corruption. That is the Agni Seal. Fire does not destroy darkness; it purifies the vessel. (Agni Vidya Level 2 unlocked)",
      teachLevel3: "The cosmic fire burns inside you. You are ready to light the Asthra. Go to Daksha when the pieces are gathered. (Agni Vidya Level 3 unlocked)"
    },
    pulastya: {
      name: "Sage Pulastya",
      title: "Master of Niti Shastra",
      meet: "Ah! A new face. Or is it a very old face in a new body? The threads of Samsara are so beautifully tangled.",
      bondLow: "To defeat an enemy, you must not strike him. You must read his pattern. What moves, must eventually rest.",
      bondMid: "Mayasur's movements are not random. He follows the cracks in our collective consciousness. He strikes where the community forgets its vows.",
      bondHigh: "We do not speak Tamas's name because it hurts to remember. He was the tenth, the connector. Without him, the circle has nine edges. Complete the Vidya.",
      teachLevel1: "Let us discuss strategy. Observe the wind, the path, the rhythm. Know when to walk and when to wait. (Niti Shastra Level 1 unlocked)",
      teachLevel2: "You have learned to predict the shadow's strikes. That is the Strategy of Warning. (Niti Shastra Level 2 unlocked)",
      teachLevel3: "You see the pattern of the entire cycle. The eclipse approaches. (Niti Shastra Level 3 unlocked)"
    },
    pulaha: {
      name: "Sage Pulaha",
      title: "Master of Vaidya Kala",
      meet: "Careful where you step. The herbs on this cliff are delicate. They heal what is broken.",
      bondLow: "The body is a vessel of clay. It requires care, not attachment. Eat what the earth provides, and rest when the sun sets.",
      bondMid: "Mayasur strikes with a poison that cannot be cured by leaves alone. It is a wound of the soul. One must hold still to survive it.",
      bondHigh: "Tamas sought to cure mortality itself. In his pride, he forgot that change is the only eternal law. His corruption is a sickness of holding on.",
      teachLevel1: "I teach you to recognize the bitter leaf. It heals the breath and cools the blood. (Vaidya Kala Level 1 unlocked)",
      teachLevel2: "You have purified a corrupted villager. That is the Healing Touch. (Vaidya Kala Level 2 unlocked)",
      teachLevel3: "You have mastered the art of restoration. Your breath will last longer in this life. (Vaidya Kala Level 3 unlocked)"
    },
    kratu: {
      name: "Sage Kratu",
      title: "Master of Dhanur Vidya",
      meet: "Stand tall! If the body is weak, the spirit has no pillar. What is your aim, traveler?",
      bondLow: "You draw the bow, but you look at the target. The target is already inside you. Align the breath first.",
      bondMid: "Mayasur regenerates faster than any spear can pierce. Do not try to damage him. Try to stand firm while the village escapes.",
      bondHigh: "Tamas was resolute. When he fell, his resolve became a crushing wall. Only absolute yield can pass through it. Master the body to let it go.",
      teachLevel1: "Learn to Condition the Vessel. Stand against the wind. Let your steps be heavy and sure. (Dhanur Vidya Level 1 unlocked)",
      teachLevel2: "You have held the stance. The Earthen Stillness shockwave is yours. (Dhanur Vidya Level 2 unlocked)",
      teachLevel3: "Your martial form is complete. You can move without friction. (Dhanur Vidya Level 3 unlocked)"
    },
    angiras: {
      name: "Sage Angiras",
      title: "Master of Jyotish Vidya",
      meet: "The stars tell stories that the ground has forgotten. Look up, Seeker. What do you see?",
      bondLow: "The sky is a clock. The Sun, the Moon, and the Eclipse. Everything returns to its origin.",
      bondMid: "The shadow has a cycle. It attacks when the sky goes dark. The eclipse approaches once every 4000 in-game years.",
      bondHigh: "Tamas's true name is recorded in the stars. It is the Tenth Glyph. Combined with Vashistha's sacred chants, the name is the key.",
      teachLevel1: "Learn to read the sky. Note the hour, the season, the solar cycle. (Jyotish Vidya Level 1 unlocked)",
      teachLevel2: "You can read the omens. You will receive a warning before the shadow strikes. (Jyotish Vidya Level 2 unlocked)",
      teachLevel3: "The solar paths are clear. You know the timing of the eclipse. (Jyotish Vidya Level 3 unlocked)"
    },
    marichi: {
      name: "Sage Marichi",
      title: "Master of Yoga Siddhi",
      meet: "...", // Only meets if player is meditating or arrives at 06:00
      bondLow: "Why did you come? You search for a teacher. The teacher is the silence between your questions.",
      bondMid: "Time is a fluctuation of the mind. Slow the mind, and the world slows with it. Even the shadow cannot escape the present moment.",
      bondHigh: "I was the one who suggested exiling Tamas. I believed we could isolate the decay. My judgment was a separation. I stayed behind to wait for a connector. You.",
      teachLevel1: "Sit with me. Observe the breath. Do not search, do not hold. Just remain. (Yoga Siddhi Level 1 unlocked)",
      teachLevel2: "You have slowed your perception. Time Dilation is unlocked. (Yoga Siddhi Level 2 unlocked)",
      teachLevel3: "Your mind has left the vessel. You can project your sight across the map. (Yoga Siddhi Level 3 unlocked)"
    },
    atri: {
      name: "Sage Atri",
      title: "Master of Bhu Vidya",
      meet: "The river has shaped this stone over a thousand years. Listen to the water.",
      bondLow: "The earth remembers every footprint. The sand, the clay, the volcanic ash. Each tells a different history.",
      bondMid: "Mayasur changes the terrain when he strikes. He splits the earth. You must read the land's lines to find safe passages.",
      bondHigh: "The Temple of Vows is the island's anchor. It is where Tamas was bound. It is the only place where the ritual can stabilize.",
      teachLevel1: "Understand the soil. Learn to walk without sliding on the wet clay. (Bhu Vidya Level 1 unlocked)",
      teachLevel2: "You have synced with the earth. You can sense the location of corruption nodes. (Bhu Vidya Level 2 unlocked)",
      teachLevel3: "You have mastered the terrain. You can traverse the mountain ridge. (Bhu Vidya Level 3 unlocked)"
    },
    vashistha: {
      name: "Sage Vashistha",
      title: "Master of Brahma Vidya",
      meet: "You come seeking Vashistha. But who voutches for your character? The sacred laws do not yield to strangers.",
      bondLow: "Chant the mantras. Not for power, but for alignment. Sound is the first layer of creation.",
      bondMid: "The curse of Mayasur was written by my own hand. It was a cosmic contract. A contract cannot be torn; it must be fulfilled by sacrifice.",
      bondHigh: "The True Name is Tamas. Combined with the Agni Cosmic Ember, the Asthra, and the solar alignment, you must chant the Name to unlock the binding. I am terrified you might fail as the others did.",
      teachLevel1: "Learn the basic mantra. It creates a small shield of sound. (Brahma Vidya Level 1 unlocked)",
      teachLevel2: "You can cleanse your shadow karma by sacrificing a portion of your life force. (Brahma Vidya Level 2 unlocked)",
      teachLevel3: "The mantra is complete. The True Name can be spoken at the altar. (Brahma Vidya Level 3 unlocked)"
    },
    daksha: {
      name: "Sage Daksha",
      title: "Master of Shilpa Vidya",
      meet: "The forge is cold. I need relic fragments. What did you bring me?",
      bondLow: "To build a tool, you must understand the material. Wood, copper, iron. Each has a spirit.",
      bondMid: "I am examining the relic you brought. It carries a heavy resonance. It belonged to the Tenth. We must gather all three.",
      bondHigh: "The forge is ready. The three relics of Tamas are here: Rage, Pride, and Desire. I will forge the Asthra. It is a tool of sacrifice, not war.",
      teachLevel1: "Learn to build a simple wooden trap to halt wild beasts. (Shilpa Vidya Level 1 unlocked)",
      teachLevel2: "You can repair broken structures in the village. (Shilpa Vidya Level 2 unlocked)",
      teachLevel3: "The Asthra of Tamas is forged. It is yours. (Shilpa Vidya Level 3 unlocked)"
    }
  },

  // The Wanderer (Mayasur in human form)
  wanderer: {
    dialogues: [
      "I was a teacher once. Nobody remembers what I taught.",
      "You seem to be searching for something. So am I. I have been searching for a very long time.",
      "There is a place on this island where the sky once fell. I was there. I cannot explain the pain.",
      "You have spoken with Bhrigu. He was a student of mine, once. A long time ago. Tell me — does he seem well?"
    ],
    reveal: "We have met before. You were kind to me, when I did not deserve it. That kindness was part of why you succeeded."
  },

  // Civilians based on profession and rumors
  civilians: {
    farmer: {
      name: "Reva (Farmer)",
      work: "The rice fields require constant weeding. The sun is hot today.",
      rumor: "I've seen herb bundles drying on the north cliff. Someone lives up there — never comes down. (Points to Sage Pulaha)",
      flee: "The crops are burning! The shadow is here!"
    },
    potter: {
      name: "Deva (Potter)",
      work: "The clay must be worked until it has no bubbles. A bubble will shatter the pot in the kiln.",
      rumor: "A traveler brought clay from the volcanic ridge. Strange markings on his tools. Like nothing I've seen. (Points to Sage Daksha)",
      flee: "My pots are breaking! The earth is shaking!"
    },
    weaver: {
      name: "Kala (Weaver)",
      work: "The loom sings a steady song. Warp and weft, life and death.",
      rumor: "The elders speak of a wise man who stands by the river delta, reading the water's flow. (Points to Sage Atri)",
      flee: "The threads are snapping! Run to the shrine!"
    },
    trader: {
      name: "Hari (Trader)",
      work: "Copper from the north, spices from the coast. Everything has a price.",
      rumor: "The eastern mountain pass is dangerous. Animals avoid it. Some old warrior lives up on the ridge. (Points to Sage Kratu)",
      flee: "Abandon the goods! Save your life!"
    },
    guard: {
      name: "Rudra (Guard)",
      work: "Keep watch. The forests are dark, and the shadow grows closer each year.",
      rumor: "The ancient temple in the south has a cold gate. Vashistha sits inside, but he only speaks to those who know the other sages.",
      flee: "Hold the line! Protect the children! Get to the shrine!"
    }
  }
};
