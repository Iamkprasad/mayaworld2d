// MayaWorld Main Game Orchestrator & Launcher

import { TileMap } from './map.js';
import { Camera } from './camera.js';
import { GameClock } from './clock.js';
import { Player } from '../entities/player.js';
import { createSages, createCivilians, createSagesForMap, createCiviliansForMap, NPC } from '../entities/npc.js';
import { SeekerJournal } from '../systems/journal.js';
import { SamsaraSystem } from '../systems/samsara.js';
import { VidyaSystem, VIDYA_METADATA } from '../systems/vidya.js';
import { CorruptionSystem } from '../systems/corruption.js';
import { VrittiSystem } from '../systems/vritti.js';
import { RitualSystem } from '../systems/ritual.js';
import { dialogues } from '../data/dialogues.js';
import { MAPS_CONFIG } from '../data/maps.js';
import { CinematicIntro } from './cinematic.js';
import { BuildMode } from './build_mode.js';

const REGIONS = {
  suryanagar: {
    name: 'Suryanagar Village',
    desc: 'The peaceful south village, home to the farmers and artisans under Sage Bhrigu.',
    image: 'assets/images/suryanagar_village.png'
  },
  sacred_grove: {
    name: 'Sacred Grove of Roots',
    desc: 'A dense, mystical forest filled with ancient trees where Sage Vashistha studies Rta.',
    image: 'assets/images/sacred_grove.png'
  },
  volcanic_peaks: {
    name: "Daksha's Volcanic Peaks",
    desc: "Cracked, scorching earth and active lava streams around Daksha's Volcanic Forge.",
    image: 'assets/images/volcanic_peaks.png'
  },
  sunken_temple: {
    name: 'Sunken Temple of Time',
    desc: 'Ancient coastal columns half-submerged in the turquoise sands, harboring the portal to past cycles.',
    image: 'assets/images/sunken_temple.png'
  },
  mahameru_ridge: {
    name: 'Mahameru Mountain Ridge',
    desc: 'Rugged stone cliffs, icy winds, and rocky hideouts near the high northern peak.',
    image: 'assets/images/mahameru_ridge.png'
  },
  temple_of_vows: {
    name: 'Temple of Vows',
    desc: 'The spiritual anchor of the island, housing the central altar of alignment.',
    image: 'assets/images/cosmic_center.png'
  }
};

class GameApp {
  constructor() {
    this.canvas = document.getElementById('game-screen');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    
    // Preload location and battle graphics
    this.preloadedImages = {};
    const imagesToPreload = [
      'assets/images/suryanagar_village.png',
      'assets/images/sacred_grove.png',
      'assets/images/volcanic_peaks.png',
      'assets/images/sunken_temple.png',
      'assets/images/mahameru_ridge.png',
      'assets/images/cosmic_center.png',
      'assets/images/mayasur_battle_backdrop.png',
      'assets/images/player_portrait.png'
    ];
    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
      this.preloadedImages[src] = img;
    });

    this.currentRegion = null;
    this.locationCardTimeout = null;
    
    // Virtual Dimensions - Expanded retro scale (960x640 resolution)
    this.tileSize = 64;
    this.camera = new Camera(this.canvas.width, this.canvas.height, 80, 80, this.tileSize);
    
    // Systems Initialization
    this.journal = new SeekerJournal();
    this.clock = new GameClock(
      (h) => this.onHourChange(h),
      () => this.onDayChange()
    );
    this.corruption = new CorruptionSystem(40, 40);
    this.samsara = new SamsaraSystem(this.journal, (aff, ep) => this.onRebirth(aff, ep));

    // Build map cache lazily — only Map 1 at startup, others on demand
    this.mapCache = {};
    this.mapCache[1] = new TileMap(1, this.tileSize);
    this.activeMapId = 1;
    
    // UI elements lookup for Vritti
    this.vritti = new VrittiSystem({
      overlay: document.getElementById('vritti-overlay'),
      text: document.getElementById('vritti-text')
    });

    // Game variables
    this.player = null;
    this.npcs = [];
    this.map = null;
    
    // State machine: 'playing', 'dialogue', 'menu', 'dreaming', 'ending', 'battle'
    this.state = 'playing';
    this.gameAct = 1;          // Story progression act (1-6)
    this.tutorialStep = 0;     // Tutorial popup progress (0 = not started)
    
    // Dialogue management
    this.activeDialogue = null;
    this.activeNPC = null;
    this.dialogueQueue = [];

    // Mayasur Event Loop
    this.mayasurAttackActive = false;
    this.mayasurAttackTimer = 0;
    this.mayasurEntity = null;

    // Keys state
    this.keys = {};
    
    // Speed management
    this.speedMultiplier = 1.0;

    // Build mode (city-builder)
    this.buildMode = new BuildMode();

    // Cinematic intro system
    this.cinematic = new CinematicIntro();

    // Setup bindings
    this.initUI();
    this.restartLife(null, this.journal.data.currentEpoch);

    // Decide whether to play the cinematic or go straight to the title screen.
    // Returning players (livesCount > 0 = they've played before) skip to title.
    const isFirstVisit = this.journal.data.livesCount <= 1;
    if (isFirstVisit) {
      this.state = 'cinematic';
      document.body.classList.add('cinematic-active');
      this.cinematic.start(this.canvas, this.ctx, () => this._onCinematicComplete());
    } else {
      // Returning player — show title overlay immediately
      this.state = 'intro';
      const introOverlay = document.getElementById('intro-overlay');
      if (introOverlay) {
        introOverlay.classList.remove('hidden');
        requestAnimationFrame(() => introOverlay.classList.add('visible'));
      }
    }

    // Start loop
    this.lastTime = 0;
    requestAnimationFrame((t) => this.loop(t));
  }

  /** Called when the cinematic finishes (or is skipped). Shows the title screen. */
  _onCinematicComplete() {
    document.body.classList.remove('cinematic-active');
    this.state = 'intro';
    const introOverlay = document.getElementById('intro-overlay');
    if (introOverlay) {
      introOverlay.classList.remove('hidden');
      requestAnimationFrame(() => introOverlay.classList.add('visible'));
    }
  }

  _ensureMap(mapId) {
    if (!this.mapCache[mapId]) {
      this.mapCache[mapId] = new TileMap(mapId, this.tileSize);
    }
    return this.mapCache[mapId];
  }

  restartLife(affinityKey = null, epochId = 1) {
    this.activeMapId = 1;
    this._ensureMap(1);
    
    // Update map overlays for all cached maps
    for (const mapId in this.mapCache) {
      this.mapCache[mapId].updateEpochOverlays(epochId);
    }
    this.map = this.mapCache[this.activeMapId];
    
    const config = MAPS_CONFIG[this.activeMapId];
    this.player = new Player(config.defaultSpawn.x, config.defaultSpawn.y); // Born in Suryanagar Village Square at default spawn (40, 70)
    this.player.name = `Samat-Life-${this.journal.data.livesCount}`;
    this.player.breath = this.player.breathMax;

    // Apply affinity
    if (affinityKey) {
      this.player.affinities[affinityKey] = 1.8; // 80% training speed boost
      this.player.color = '#c24732'; // Alter robe tint
    }
    
    // Restore persistent variables
    this.player.karmaLight = 0;
    this.player.karmaShadow = 0;
    this.player.karmaBalance = 0;
    this.player.hasAsthra = this.journal.data.hasAsthra;
    
    // Load NPCs for the active map
    this.loadNPCsForActiveMap();

    // Reset clock
    this.clock.reset(epochId * 500 - 400); // Years based on epoch
    
    // Reset camera dimensions matching the current map
    this.camera.mapWidth = this.map.width;
    this.camera.mapHeight = this.map.height;
    this.camera.mapWidthPx = this.map.width * this.tileSize;
    this.camera.mapHeightPx = this.map.height * this.tileSize;
    this.camera.follow(this.player.x, this.player.y);

    // Spawn initial corruption nodes for late epochs
    this.corruption.clearAllNodes();
    this.corruption.width = this.map.width;
    this.corruption.height = this.map.height;
    if (epochId >= 4) {
      // Spawn local corruption on Suryanagar map (Map 1)
      this.corruption.spawnNode(24, 10); // near the northern farm
      this.corruption.spawnNode(12, 30); // south-west outskirts
    }

    this.mayasurAttackActive = false;
    this.mayasurEntity = null;
    this.state = 'playing';

    // Flash LED active green/red representing alive
    const led = document.getElementById('power-led');
    if (led) {
      led.classList.remove('low-batt');
      led.classList.add('active');
    }
    
    this.updateHUD();
  }

  loadNPCsForActiveMap() {
    this.npcs = [];
    const epochId = this.journal.data.currentEpoch;
    
    // Load local Sages for this map
    this.npcs.push(...createSagesForMap(this.activeMapId));
    
    // Load local Civilians for this map (always — epoch gating removed so
    // the village feels alive from the very first life)
    this.npcs.push(...createCiviliansForMap(this.activeMapId));
    
    // Re-add Mayasur if attack is active and this is the active map
    if (this.mayasurAttackActive && this.activeMapId === 1) {
      this.mayasurEntity = new NPC(999, 'mayasur', 'Mayasur', 19, 33);
      this.npcs.push(this.mayasurEntity);
    }
  }

  triggerWarpTransition(warp) {
    this.state = 'transition';
    this.transitionState = {
      warp: warp,
      phase: 'fade-out',
      timer: 0,
      duration: 200 // 200ms transitions
    };
  }

  onRebirth(affinityKey, nextEpoch) {
    this.restartLife(affinityKey, nextEpoch);
  }

  startGameFromIntro() {
    this.state = 'playing';
    this.gameAct = 1;
    this.tutorialStep = 0;
    const introOverlay = document.getElementById('intro-overlay');
    if (introOverlay) {
      introOverlay.classList.remove('visible');
      introOverlay.addEventListener('transitionend', () => {
        introOverlay.classList.add('hidden');
      }, { once: true });
    }
    // Show system action bar now that game has started
    const sysBar = document.querySelector('.system-action-bar');
    if (sysBar) {
      sysBar.classList.remove('hidden');
    }
    const led = document.getElementById('power-led');
    if (led) {
      led.classList.remove('low-batt');
      led.classList.add('active');
    }
    // Begin Act I tutorial sequence
    this.queueDialogue("Journal", ["Movement: Arrow keys or WASD. Z to interact. X for Agni Seal.", "Enter to meditate. Shift opens your Journal.", "Find the villagers and learn about the Sages."]);
  }

  advanceAct(newAct) {
    if (newAct <= this.gameAct) return;
    this.gameAct = newAct;
    if (newAct === 2) {
      this.queueDialogue("Narrator", ["Act II: The First Flame. Seek Bhrigu in the north campfire grove."]);
    } else if (newAct === 3) {
      this.queueDialogue("Narrator", ["Act III: The Nine Disciplines. The world opens before you. Seek the Sages."]);
    } else if (newAct === 4) {
      this.queueDialogue("Narrator", ["Act IV: The Relics of Tamas. Gather the fragments of the Tenth Sage's power."]);
    } else if (newAct === 5) {
      this.queueDialogue("Narrator", ["Act V: The True Name. Seek Vashistha when you are ready to speak it."]);
    } else if (newAct === 6) {
      this.queueDialogue("Narrator", ["Act VI: The Final Ritual. Stand at the Altar of Vows during the Eclipse."]);
    }
  }

  checkRegionTransition() {
    if (!this.player) return;
    let newRegion = 'suryanagar'; // Default fallback

    const id = this.activeMapId;
    if (id >= 1 && id <= 5) {
      newRegion = 'suryanagar';
    } else if (id >= 6 && id <= 9) {
      newRegion = 'sacred_grove';
    } else if (id >= 10 && id <= 13) {
      newRegion = 'volcanic_peaks';
    } else if (id >= 14 && id <= 17) {
      newRegion = 'sunken_temple';
    } else if (id >= 18 && id <= 20) {
      newRegion = 'mahameru_ridge';
    } else if (id >= 21 && id <= 22) {
      newRegion = 'temple_of_vows';
    }

    if (this.currentRegion !== newRegion) {
      this.currentRegion = newRegion;
      this.triggerLocationCard(newRegion);
    }
  }

  triggerLocationCard(regionKey) {
    const region = REGIONS[regionKey];
    if (!region) return;

    const card = document.getElementById('location-card');
    const img = document.getElementById('location-img');
    const title = document.getElementById('location-title');
    const desc = document.getElementById('location-desc');

    if (card && img && title && desc) {
      img.src = region.image;
      title.innerText = region.name;
      desc.innerText = region.desc;

      // Show card
      card.classList.remove('hidden');
      // Allow class reflow
      void card.offsetWidth;
      card.classList.add('show');

      if (this.locationCardTimeout) {
        clearTimeout(this.locationCardTimeout);
      }

      this.locationCardTimeout = setTimeout(() => {
        card.classList.remove('show');
        setTimeout(() => {
          if (!card.classList.contains('show')) {
            card.classList.add('hidden');
          }
        }, 500); // Wait for transition out
      }, 3500); // Show for 3.5s
    }
  }

  initUI() {
    // 1. Keyboard mappings
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      this.handleKeyDown(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // 2. Virtual console action buttons
    const bindBtn = (id, code) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.keys[code] = true;
        this.handleKeyDown(code);
      });
      btn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        this.keys[code] = false;
      });
      btn.addEventListener('mouseleave', () => {
        this.keys[code] = false;
      });
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys[code] = true;
        this.handleKeyDown(code);
      }, { passive: false });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys[code] = false;
      }, { passive: false });
    };

    bindBtn('btn-a', 'KeyZ');
    bindBtn('btn-b', 'KeyX');
    bindBtn('btn-select', 'ShiftLeft');
    bindBtn('btn-start', 'Enter');

    // 2b. Unified D-Pad sliding & drag panel
    const dpad = document.querySelector('.dpad-panel');
    if (dpad) {
      const buttons = {
        'btn-up': 'ArrowUp',
        'btn-down': 'ArrowDown',
        'btn-left': 'ArrowLeft',
        'btn-right': 'ArrowRight'
      };

      const handlePointer = (e) => {
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const target = document.elementFromPoint(clientX, clientY);
        
        // Clear direction keys first
        for (const code of Object.values(buttons)) {
          this.keys[code] = false;
        }

        if (target && target.id && buttons[target.id]) {
          const code = buttons[target.id];
          this.keys[code] = true;
          // Apply active styling
          Object.keys(buttons).forEach(id => {
            const btnEl = document.getElementById(id);
            if (btnEl) btnEl.classList.toggle('active', id === target.id);
          });
        } else {
          Object.keys(buttons).forEach(id => {
            const btnEl = document.getElementById(id);
            if (btnEl) btnEl.classList.remove('active');
          });
        }
      };

      const endPointer = () => {
        for (const code of Object.values(buttons)) {
          this.keys[code] = false;
        }
        Object.keys(buttons).forEach(id => {
          const btnEl = document.getElementById(id);
          if (btnEl) btnEl.classList.remove('active');
        });
      };

      let isMouseDown = false;
      dpad.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        handlePointer(e);
      });
      window.addEventListener('mousemove', (e) => {
        if (isMouseDown) {
          handlePointer(e);
        }
      });
      window.addEventListener('mouseup', () => {
        if (isMouseDown) {
          isMouseDown = false;
          endPointer();
        }
      });

      dpad.addEventListener('touchstart', (e) => {
        handlePointer(e);
      }, { passive: false });
      dpad.addEventListener('touchmove', (e) => {
        handlePointer(e);
      }, { passive: false });
      dpad.addEventListener('touchend', (e) => {
        endPointer();
      }, { passive: false });
      dpad.addEventListener('touchcancel', (e) => {
        endPointer();
      }, { passive: false });
    }

    // 2c. Clear keys on window blur
    window.addEventListener('blur', () => {
      this.keys = {};
    });

    // 7. Intro start game button
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startGameFromIntro();
      });
    }

    // 3. Slider speed control
    const slider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-display');
    slider.addEventListener('input', (e) => {
      this.speedMultiplier = parseFloat(e.target.value);
      speedVal.innerText = `${this.speedMultiplier.toFixed(1)}x`;
    });

    // 4. Save file handles
    document.getElementById('download-sav-btn').addEventListener('click', () => {
      this.journal.exportSave();
    });
    
    const fileInput = document.getElementById('sav-file-input');
    document.getElementById('upload-sav-btn').addEventListener('click', () => {
      fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const success = this.journal.importSave(evt.target.result);
          if (success) {
            alert("Save file loaded successfully! Restarting life...");
            this.restartLife(null, this.journal.data.currentEpoch);
          } else {
            alert("Failed to load save file.");
          }
        };
        reader.readAsText(file);
      }
    });

    // 5. Journal close button
    document.getElementById('close-journal-btn').addEventListener('click', () => {
      this.toggleJournal();
    });

    // 6. Tabs logic inside Journal
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        document.getElementById(targetId).classList.add('active');
        
        this.renderJournalTab(targetId);
      });
    });

    // Build mode canvas mouse interactions
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      this.buildMode.handleMouseMove(cx, cy, this.camera);
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.buildMode.handleMouseLeave();
    });
    this.canvas.addEventListener('click', (e) => {
      if (this.buildMode.active && this.state === 'playing') {
        e.preventDefault();
        this.buildMode.place(this.map, this.player);
      }
    });
    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.buildMode.active) {
        e.preventDefault();
        // Right-click selects Remove tool
        this.buildMode.select(6);
        this.buildMode.place(this.map, this.player);
      }
    });
  }

  handleKeyDown(code) {
    // During cinematic the CinematicIntro class manages its own Escape/Enter handler.
    if (this.state === 'cinematic') return;

    if (this.state === 'intro') {
      if (code === 'Enter' || code === 'KeyZ') {
        this.startGameFromIntro();
      }
      return;
    }

    if (this.state === 'dialogue') {
      if (code === 'KeyZ') {
        this.nextDialogue();
      }
      return;
    }

    if (this.state === 'playing') {
      if (code === 'ShiftLeft') {
        this.toggleJournal();
      }
      else if (code === 'Enter') {
        this.toggleMeditation();
      }
      else if (code === 'KeyZ') {
        if (!this.buildMode.active) this.interact();
      }
      else if (code === 'KeyX' && this.player.vidyas.agni >= 2) {
        this.triggerAgniSeal();
      }
      else if (code === 'KeyB') {
        this.buildMode.toggle();
      }
      else if (this.buildMode.active && code.startsWith('Digit')) {
        const num = parseInt(code.replace('Digit', ''), 10);
        if (num >= 1 && num <= 7) this.buildMode.select(num - 1);
      }
      else if (this.buildMode.active && code === 'Escape') {
        this.buildMode.toggle();
      }
    }
    
    else if (this.state === 'menu') {
      if (code === 'ShiftLeft' || code === 'KeyX') {
        this.toggleJournal();
      }
    }

    else if (this.state === 'battle') {
      this.handleBattleInput(code);
    }
  }

  toggleMeditation() {
    this.player.isMeditating = !this.player.isMeditating;
    if (this.player.isMeditating) {
      console.log("Meditating...");
      this.player.curiosity = "Meditating";
      
      // Trigger Vritti thought checking overlay
      if (Math.random() < 0.4) {
        setTimeout(() => {
          if (this.player.isMeditating) {
            this.vritti.trigger(
              () => {
                // Successfully observed: Smriti +1
                this.player.smriti += 1;
                this.player.gainKarmaLight(2);
                this.journal.data.maunaMeditationDone = true;
                this.journal.saveToStorage();
                console.log("Thought observed: Smriti increased.");
              },
              () => {
                // Interrupted
                this.player.isMeditating = false;
                console.log("Meditation interrupted by thought.");
              }
            );
          }
        }, 1500);
      }
    } else {
      console.log("Meditation ended.");
      this.player.curiosity = "None";
    }
  }

  triggerAgniSeal() {
    const px = this.player.x;
    const py = this.player.y;
    const cleaned = this.corruption.purify(px, py, 3, this.map);
    if (cleaned > 0) {
      this.player.gainKarmaLight(cleaned);
      this.player.deductBreath(10); // costs breath
      console.log(`Purified ${cleaned} tiles using Agni Seal.`);
    }
  }

  interact() {
    // Check tile in front of player
    let targetX = this.player.x;
    let targetY = this.player.y;
    
    switch(this.player.direction) {
      case 0: targetY += 1; break; // down
      case 1: targetY -= 1; break; // up
      case 2: targetX -= 1; break; // left
      case 3: targetX += 1; break; // right
    }

    // Check NPCs
    const npc = this.npcs.find(n => n.x === targetX && n.y === targetY);
    if (npc) {
      this.startConversation(npc);
      return;
    }

    // Check landmarks
    const deco = this.map.decoGrid[targetY * this.map.width + targetX];
    if (deco === this.map.DECOS.ALTAR) {
      this.attemptRitual();
    } else if (deco === this.map.DECOS.CHEST) {
      this.collectRelic("chest");
    } else if (deco === this.map.DECOS.PORTAL) {
      this.collectRelic("Volcano");
    } else if (deco === this.map.DECOS.SHRINE) {
      this.performDailyWork('sadhana');
    } else if (deco === this.map.DECOS.CROPS) {
      this.performDailyWork('farming');
    } else if (deco === this.map.DECOS.FORGE) {
      this.performDailyWork('forging');
    } else if (deco === this.map.DECOS.BOOKSHELF) {
      this.performDailyWork('studying');
    }
  }

  collectRelic(zoneName) {
    if (zoneName === "Volcano" && !this.journal.data.relicRage) {
      this.journal.data.relicRage = true;
      this.journal.collectDreamFragment(1);
      this.journal.saveToStorage();
      if (this.gameAct < 4) this.advanceAct(4);
      this.queueDialogue("Relic System", ["You found the Relic of Rage! It carries a heavy, pulsing volcanic heat. Bring it to Daksha."]);
    } else if (zoneName === "chest") {
      if (this.activeMapId === 17 && !this.journal.data.relicPride) {
        const hour = this.clock ? this.clock.hour : 12;
        if (hour >= 18 && hour <= 19) {
          this.journal.data.relicPride = true;
          this.journal.collectDreamFragment(3);
          this.journal.saveToStorage();
          if (this.gameAct < 4) this.advanceAct(4);
          this.queueDialogue("Relic System", ["You found the Relic of Pride! It shimmers with ancient arrogance. Bring it to Daksha."]);
        } else {
          this.queueDialogue("Tidal Ruins", ["The chest is sealed by the tide. Return between 18:00 and 19:00 when the waters recede."]);
        }
      } else if (this.activeMapId === 20 && !this.journal.data.relicDesire) {
        this.journal.data.relicDesire = true;
        this.journal.collectDreamFragment(4);
        this.journal.saveToStorage();
        if (this.gameAct < 4) this.advanceAct(4);
        this.queueDialogue("Relic System", ["You found the Relic of Desire! It pulses with a longing that is not your own. Bring it to Daksha."]);
      }
    }
    // Check if all 3 relics collected → Act V
    if (this.journal.data.relicRage && this.journal.data.relicPride && this.journal.data.relicDesire) {
      if (this.gameAct === 4) this.advanceAct(5);
    }
  }

  attemptRitual() {
    const res = RitualSystem.calculateResonance(this.player, this.clock);
    const ending = RitualSystem.getEnding(res);

    // Advance story when ritual is first attempted during eclipse
    const isEclipse = this.clock && this.clock.eclipseActive;
    if (isEclipse && this.gameAct < 6) this.advanceAct(6);

    if (ending.id === 'unready') {
      this.queueDialogue("ALTAR OF VOWS", [ending.text]);
    } else if (ending.id === 'compassionate') {
      this.queueDialogue("ALTAR OF VOWS", [ending.text]);
      this.dialogueQueue.push(() => this.triggerDeath(true)); // Rebirth triggered
    } else if (ending.id === 'almost_samat') {
      this.queueDialogue("ALTAR OF VOWS", [ending.text]);
      this.dialogueQueue.push(() => this.triggerDeath(true));
    } else if (ending.id === 'samat') {
      // True Ending: 30-second silence
      this.state = 'ending';
      document.getElementById('dialogue-box').classList.add('hidden');
      
      const overlay = document.getElementById('vritti-overlay');
      const text = document.getElementById('vritti-text');
      const instruction = document.getElementById('vritti-instruction');
      
      text.innerText = "Chanting: TAMAS... The altar glows. Complete silence falls.";
      instruction.innerText = "Do not touch any key. Remain still for 30s.";
      overlay.classList.remove('hidden');

      let timer = 0;
      const interval = setInterval(() => {
        timer += 1;
        instruction.innerText = `Stillness: ${30 - timer}s remaining.`;
        
        // Check if player pressed keys
        if (Object.values(this.keys).some(k => k === true)) {
          timer = Math.max(0, timer - 3); // penalize movement
        }

        if (timer >= 30) {
          clearInterval(interval);
          overlay.classList.add('hidden');
          this.triggerTrueEnding();
        }
      }, 1000);
    }
  }

  triggerTrueEnding() {
    this.state = 'ending';
    this.queueDialogue("Vashistha", [
      "The circle is complete. You have achieved what Tamas could not.",
      "From this day forth, you are Samat: the Tenth Sage. May peace remain on this island."
    ]);
  }

  startConversation(npc) {
    this.activeNPC = npc;
    this.dialogueQueue = [];
    
    // Retrieve dialogues
    const db = dialogues.sages[npc.dialogueKey] || dialogues.civilians[npc.dialogueKey];
    if (!db) {
      this.queueDialogue(npc.name, ["Silence is sometimes the best answer."]);
      return;
    }

    if (npc.type === 'sage') {
      // Sage interaction logic
      const currentLevel = this.player.vidyas[npc.dialogueKey];
      
      if (currentLevel === 0) {
        // Learn Level 1
        this.queueDialogue(npc.name, [db.meet, db.teachLevel1]);
        this.dialogueQueue.push(() => {
          VidyaSystem.teach(this.player, npc.dialogueKey, 1);
          if (this.gameAct === 1) this.advanceAct(2);
        });
      } else if (currentLevel === 1) {
        // Advance to Level 2
        this.queueDialogue(npc.name, [db.bondLow, db.teachLevel2]);
        this.dialogueQueue.push(() => {
          VidyaSystem.teach(this.player, npc.dialogueKey, 2);
        });
      } else if (currentLevel === 2) {
        // Advance to Level 3
        this.queueDialogue(npc.name, [db.bondMid, db.teachLevel3]);
        this.dialogueQueue.push(() => {
          VidyaSystem.teach(this.player, npc.dialogueKey, 3);
        });
      } else {
        // Mastered conversation
        this.queueDialogue(npc.name, [db.bondHigh]);
      }
    } else {
      // Civilian dialogues
      if (this.mayasurAttackActive) {
        this.queueDialogue(npc.name, [db.flee]);
      } else if (this.player.profession === npc.profession) {
        this.queueDialogue(npc.name, [db.work, db.rumor]);
      } else {
        this.queueDialogue(npc.name, [db.work]);
      }
    }
  }

  queueDialogue(speaker, lines) {
    this.state = 'dialogue';
    const box = document.getElementById('dialogue-box');
    const speakerEl = document.getElementById('dialogue-speaker');
    
    speakerEl.innerText = speaker;
    box.classList.remove('hidden', 'fade-out');
    box.classList.add('fade-in');

    this.dialogueQueue.push(...lines);
    this.nextDialogue();
  }

  nextDialogue() {
    if (this.dialogueQueue.length === 0) {
      this.closeDialogue();
      return;
    }

    const current = this.dialogueQueue.shift();
    if (typeof current === 'function') {
      current();
      this.nextDialogue();
      return;
    }

    const textEl = document.getElementById('dialogue-text');
    textEl.innerText = current;
  }

  closeDialogue() {
    const box = document.getElementById('dialogue-box');
    box.classList.remove('fade-in');
    box.classList.add('fade-out');
    box.addEventListener('animationend', () => {
      box.classList.add('hidden');
      box.classList.remove('fade-out');
    }, { once: true });
    this.state = 'playing';
    this.activeNPC = null;
  }

  toggleJournal() {
    const journal = document.getElementById('journal-overlay');
    if (this.state === 'playing') {
      this.state = 'menu';
      journal.classList.remove('hidden', 'fade-out');
      journal.classList.add('fade-in');
      this.renderJournalTab('status-tab');
    } else if (this.state === 'menu') {
      journal.classList.remove('fade-in');
      journal.classList.add('fade-out');
      journal.addEventListener('animationend', () => {
        journal.classList.add('hidden');
        journal.classList.remove('fade-out');
      }, { once: true });
      this.state = 'playing';
    }
  }

  renderJournalTab(tabId) {
    if (tabId === 'status-tab') {
      document.getElementById('stat-name').innerText = this.player.name;
      document.getElementById('stat-age').innerText = this.player.age;
      document.getElementById('stat-epoch').innerText = this.getEpochName(this.journal.data.currentEpoch);
      document.getElementById('stat-breath').innerText = `${Math.ceil(this.player.breath)}/${this.player.breathMax}`;
      document.getElementById('stat-karma-light').innerText = this.journal.data.karmaLight + this.player.karmaLight;
      document.getElementById('stat-karma-shadow').innerText = this.journal.data.karmaShadow + this.player.karmaShadow;
      document.getElementById('stat-curiosity').innerText = this.player.curiosity;
      
      const vList = document.getElementById('status-vidyas-list');
      vList.innerHTML = '';
      for (const k in this.player.vidyas) {
        if (this.player.vidyas[k] > 0) {
          const item = document.createElement('div');
          item.className = 'mini-list-item';
          item.innerHTML = `<span>${VIDYA_METADATA[k].name}</span><span>Lvl ${this.player.vidyas[k]}</span>`;
          vList.appendChild(item);
        }
      }
    }
    
    else if (tabId === 'vidyas-tab') {
      const grid = document.getElementById('vidyas-grid');
      grid.innerHTML = '';
      for (const k in this.player.vidyas) {
        const lvl = this.player.vidyas[k];
        const card = document.createElement('div');
        card.className = `vidya-card ${lvl === 3 ? 'mastered' : ''}`;
        card.innerHTML = `
          <div class="vidya-card-header">
            <span>${VIDYA_METADATA[k].name}</span>
            <span class="vidya-card-level">Level ${lvl}/3</span>
          </div>
          <div class="vidya-card-progress">
            <div class="vidya-card-bar" style="width: ${(lvl/3)*100}%"></div>
          </div>
        `;
        grid.appendChild(card);
      }
    }

    else if (tabId === 'dreams-tab') {
      const list = document.getElementById('dreams-list');
      list.innerHTML = '';
      if (this.journal.data.dreamFragments.length === 0) {
        list.innerHTML = "<p>No fragments found yet. Meditate near Sages or ancient monuments to recall past cycles.</p>";
      } else {
        this.journal.data.dreamFragments.forEach(fid => {
          const item = document.createElement('div');
          item.className = 'dream-item';
          item.innerHTML = `<strong>Fragment #${fid}:</strong> A vision of Tamas carrying the forge tools to the crater.`;
          list.appendChild(item);
        });
      }
    }

    else if (tabId === 'lineage-tab') {
      this.drawLineageWeb();
    }
  }

  drawLineageWeb() {
    const svg = document.getElementById('lineage-svg');
    svg.innerHTML = '';
    const lineage = this.journal.data.lineage;

    if (lineage.length === 0) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '200');
      text.setAttribute('y', '100');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#8fa39e');
      text.setAttribute('font-size', '10');
      text.textContent = 'This is your first life. No ancestor threads recorded.';
      svg.appendChild(text);
      return;
    }

    // Render nodes
    const spacing = 400 / (lineage.length + 1);
    lineage.forEach((life, idx) => {
      const cx = spacing * (idx + 1);
      const cy = 100 + (idx % 2 === 0 ? -30 : 30);

      // Node circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(cx));
      circle.setAttribute('cy', String(cy));
      circle.setAttribute('r', '14');
      circle.setAttribute('fill', '#cc9c23');
      circle.setAttribute('stroke', '#fff');
      circle.setAttribute('stroke-width', '1.5');
      svg.appendChild(circle);

      // Label text
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', String(cx));
      txt.setAttribute('y', String(cy + 4));
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('fill', '#fff');
      txt.setAttribute('font-size', '9');
      txt.setAttribute('font-weight', 'bold');
      txt.textContent = `L${life.lifeId}`;
      svg.appendChild(txt);

      // Line connection
      if (idx > 0) {
        const prevCx = spacing * idx;
        const prevCy = 100 + ((idx - 1) % 2 === 0 ? -30 : 30);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(prevCx));
        line.setAttribute('y1', String(prevCy));
        line.setAttribute('x2', String(cx));
        line.setAttribute('y2', String(cy));
        line.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)');
        line.setAttribute('stroke-width', '2');
        svg.insertBefore(line, circle);
      }
    });
  }

  // Single, always-visible goal that reflects the current act and where to head
  // on the map — keeps the branching story readable without a quest log.
  getCurrentObjective() {
    const d = this.journal.data;
    switch (this.gameAct) {
      case 1:
        return this.player && this.player.vidyas.agni < 1
          ? 'Speak with Sage Bhrigu on the village path (press Z).'
          : 'Leave Suryanagar — head north to the Sacred Grove.';
      case 2:
        return 'Go north to the Sacred Grove and meet the Sages.';
      case 3:
        return 'Learn the Disciplines — seek the Sages across the island.';
      case 4: {
        const need = [];
        if (!d.relicRage) need.push('Rage (Volcano)');
        if (!d.relicPride) need.push('Pride (Tidal Ruins)');
        if (!d.relicDesire) need.push('Desire (Summit)');
        return need.length
          ? 'Find the Relics of Tamas: ' + need.join(', ') + '.'
          : 'Bring the three Relics back to Daksha at the Forge.';
      }
      case 5:
        return 'Return to Vashistha in the Sacred Grove for the True Name.';
      case 6:
        return 'Reach the Altar of Vows at the centre during the Eclipse.';
      default:
        return 'Explore Suryanagar.';
    }
  }

  getEpochName(id) {
    const names = [
      "", "Age of First Fire", "Age of Roots", "Age of Rivers", 
      "Age of Temples", "Age of Fracture", "Age of Embers", "Age of Silence"
    ];
    return names[id] || "Unknown Era";
  }

  onHourChange(hour) {
    this.updateHUD();
    
    // Check Mayasur Attacks: every 5 days, Mayasur shadow emerges
    if (this.clock.days % 5 === 0 && hour === 12 && !this.mayasurAttackActive) {
      this.triggerMayasurAttack();
    }
  }

  onDayChange() {
    // Spread Corruption nodes
    this.corruption.spreadCorruption(this.map);
    
    // Deduct player age (Aging logic)
    this.player.age += 1;
    this.player.deductBreath(2); // daily base breath drain
    
    this.warningShownThisDay = false;

    // Check aging warnings
    if (this.player.age === 40) {
      this.queueDialogue("Age of Fading Strength", [
        "Your hair is turning grey. You have reached 40 years of age.",
        "Your physical body begins to weaken. Daily activities cost more energy. Focus on your spiritual path."
      ]);
    } else if (this.player.age === 50) {
      this.queueDialogue("Age of the Sage", [
        "You have reached 50 years of age. The weight of years bends your spine.",
        "Breath runs low. The mortal vessel decays. Complete the vows before the silence takes you."
      ]);
    } else if (this.player.age === 60) {
      this.queueDialogue("Age of Silence", [
        "You are 60 years old. Your breath is fading fast. Every day is a gift.",
        "Seek the Altar of Vows at the center of the island before your final breath."
      ]);
    }
    
    if (this.player.breath < 40 && !this.warningShownThisDay) {
      this.warningShownThisDay = true;
      this.queueDialogue("Breath Warning", [
        "Warning: Your breath is dangerously low (below 40).",
        "Perform Sadhana at the South Shrine to restore your energy, or rest at a village home."
      ]);
    }

    if (this.player.breath <= 0) {
      this.triggerDeath(false); // Died of old age
    }
    
    this.updateHUD();
  }

  triggerMayasurAttack() {
    this.mayasurAttackActive = true;
    this.mayasurAttackTimer = 0;
    this.mayasurEntity = new NPC(999, 'mayasur', 'Mayasur', 19, 33);
    this.npcs.push(this.mayasurEntity);

    console.log("Mayasur is attacking the village!");
    this.clock.eclipseActive = true; // Temporary eclipse tint during battle

    // Spawn corruption nodes
    this.corruption.spawnNode(17, 33);
    this.corruption.spawnNode(21, 33);

    // Shake console screen (lightweight class toggle instead of CSS animation)
    const frame = document.getElementById('emu-screen-container') || document.getElementById('screen-frame');
    if (frame) {
      frame.classList.add('screen-shake');
      setTimeout(() => { frame.classList.remove('screen-shake'); }, 500);
    }
  }

  stopMayasurAttack() {
    this.mayasurAttackActive = false;
    this.npcs = this.npcs.filter(n => n.type !== 'mayasur');
    this.mayasurEntity = null;
    this.clock.eclipseActive = false;
    
    for (let i = 0; i < this.map.ruinsGrid.length; i++) {
      if (this.map.ruinsGrid[i] > 0 && Math.random() < 0.5) {
        this.map.ruinsGrid[i] = 0;
      }
    }
    this.map.invalidateCache(); // ruins changed → refresh the tile cache
    console.log("Mayasur has retreated.");
  }

  triggerDeath(byMayasur = false) {
    this.state = 'dreaming';
    this.player.isMeditating = false;
    this.samsara.triggerDreamingState(this.player);

    // Set LED to low battery blinking red representing death/void state
    const led = document.getElementById('power-led');
    if (led) {
      led.classList.remove('active');
      led.classList.add('low-batt');
    }
  }

  updateHUD() {
    document.getElementById('stat-age').innerText = this.player ? this.player.age : 0;
    document.getElementById('stat-breath').innerText = this.player ? `${Math.ceil(this.player.breath)}/260` : "0/260";
    
    // Persistent gameplay HUD
    if (this.player) {
      const hud = document.getElementById('game-hud');
      if (hud) {
        hud.classList.toggle('hidden', this.state !== 'playing' && this.state !== 'transition' && this.state !== 'dialogue');
        document.getElementById('hud-age-value').innerText = this.player.age;
        const breathPct = Math.max(0, Math.min(100, (this.player.breath / this.player.breathMax) * 100));
        document.getElementById('hud-breath-fill').style.width = breathPct + '%';
        document.getElementById('hud-breath-text').innerText = `${Math.ceil(this.player.breath)}/${this.player.breathMax}`;
        const totalLight = this.journal.data.karmaLight + this.player.karmaLight;
        const totalShadow = this.journal.data.karmaShadow + this.player.karmaShadow;
        document.getElementById('hud-karma-light-val').innerText = totalLight;
        document.getElementById('hud-karma-shadow-val').innerText = totalShadow;
        const actNames = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
        document.getElementById('hud-act-value').innerText = actNames[this.gameAct] || 'I';

        const objEl = document.getElementById('hud-objective-text');
        if (objEl) {
          if (this.buildMode.active) {
            const sel = this.buildMode.selected;
            objEl.innerText = `[BUILD] ${sel.name} (♰${sel.cost}) — ${sel.desc} | 1-7: select, Click: place, RClick: remove, Esc: exit`;
          } else {
            objEl.innerText = this.getCurrentObjective();
          }
        }
      }
    }

    // Apply Tint class to match clock hour
    const tintEl = document.getElementById('screen-tint');
    tintEl.className = this.clock.getTintClass();
  }

  loop(timestamp) {
    const deltaTime = Math.min(timestamp - this.lastTime, 100);
    this.lastTime = timestamp;

    // Apply speed scaling multiplier
    const scaledDelta = deltaTime * this.speedMultiplier;

    this.update(scaledDelta);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(deltaTime) {
    // Cinematic state: delegate update to the cinematic system
    if (this.state === 'cinematic') {
      this.cinematic.update(deltaTime);
      return;
    }

    this.updateVFX(deltaTime);

    if (this.state === 'transition') {
      const ts = this.transitionState;
      ts.timer += deltaTime;
      if (ts.phase === 'fade-out') {
        if (ts.timer >= ts.duration) {
          ts.phase = 'warp';
          ts.timer = 0;
          
          // Switch map
          this.activeMapId = ts.warp.targetMapId;
          this.map = this._ensureMap(this.activeMapId);
          
          // Move player
          this.player.x = ts.warp.targetX;
          this.player.y = ts.warp.targetY;
          this.player.targetX = ts.warp.targetX;
          this.player.targetY = ts.warp.targetY;
          this.player.movingProgress = 0;
          
          // Update camera limits
          this.camera.mapWidth = this.map.width;
          this.camera.mapHeight = this.map.height;
          this.camera.mapWidthPx = this.map.width * this.tileSize;
          this.camera.mapHeightPx = this.map.height * this.tileSize;
          this.camera.follow(this.player.x, this.player.y, 1.0); // center instantly
          
          // Set corruption bounds
          this.corruption.width = this.map.width;
          this.corruption.height = this.map.height;
          
          // Reload local NPCs
          this.loadNPCsForActiveMap();
          
          // Trigger the location card check
          this.checkRegionTransition();
        }
      } else if (ts.phase === 'warp') {
        if (ts.timer >= 50) { // short delay on black screen
          ts.phase = 'fade-in';
          ts.timer = 0;
        }
      } else if (ts.phase === 'fade-in') {
        if (ts.timer >= ts.duration) {
          this.state = 'playing';
          this.transitionState = null;
        }
      }
      return;
    }

    if (this.state === 'working_anim') {
      this.workingTimer += deltaTime;
      if (this.player) {
        this.player.walkFrame = Math.floor(Date.now() / 80) % 5 + 1;
      }
      if (this.workingTimer >= 1200) {
        this.state = 'playing';
        if (this.player) this.player.walkFrame = 0;
        this.completeDailyWork(this.workingType);
      }
    }

    if (this.state === 'playing') {
      // 1. Clock Ticks
      this.clock.update(deltaTime);

      // 1b. Vritti thought timer
      this.vritti.update(deltaTime);

      // 2. Input handling (WASD / Arrows) — disabled in build mode
      let dx = 0;
      let dy = 0;
      if (!this.buildMode.active) {
        if (this.keys['ArrowUp'] || this.keys['KeyW']) dy = -1;
        else if (this.keys['ArrowDown'] || this.keys['KeyS']) dy = 1;
        else if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx = -1;
        else if (this.keys['ArrowRight'] || this.keys['KeyD']) dx = 1;
      }

      if (dx !== 0 || dy !== 0) {
        this.player.requestMove(dx, dy, this.map);
      }

      // 3. Player Updates
      const wasMoving = this.player.isMoving();
      this.player.update(deltaTime, this.speedMultiplier);
      const isMoving = this.player.isMoving();

      // If player just finished moving to a new tile, check for warps
      if (wasMoving && !isMoving) {
        const warp = this.map.warps.find(w => w.x === this.player.x && w.y === this.player.y);
        if (warp) {
          this.triggerWarpTransition(warp);
        }
      }

      // 4. Corruption ticks
      this.corruption.update(deltaTime, this.speedMultiplier, this.map);

      // 5. NPC schedule actions
      this.npcs.forEach(npc => {
        npc.update(deltaTime, this.clock, this.mayasurAttackActive, this.journal.data.currentEpoch, this.map);
      });

      // 6. Camera follows player — use interpolated mid-step position for smooth scroll
      const _interp = this.player.movingProgress;
      const _camX = this.player.x + (this.player.targetX - this.player.x) * _interp;
      const _camY = this.player.y + (this.player.targetY - this.player.y) * _interp;
      this.camera.follow(_camX, _camY);

      // 6b. Track region transitions
      this.checkRegionTransition();

      // 7. Check if player overlaps with Mayasur (Battle trigger)
      if (this.mayasurAttackActive && this.mayasurEntity) {
        const dist = Math.hypot(this.player.x - this.mayasurEntity.x, this.player.y - this.mayasurEntity.y);
        if (dist < 1.5) {
          this.triggerMayasurBattle();
        }
        
        // Attack timer duration
        this.mayasurAttackTimer += deltaTime;
        if (this.mayasurAttackTimer >= 30000) { // 30 real seconds = ~5 hours of attack
          this.stopMayasurAttack();
        }
      }
    }
    
    else if (this.state === 'battle') {
      this.updateBattle(deltaTime);
    }
  }

  updateVFX(deltaTime) {
    if (this.activeVFX) {
      this.vfxTimer += deltaTime;
      if (this.vfxTimer >= 1000) {
        this.activeVFX = null;
      }
    }
    // Update ambient particles
    this.updateAmbientParticles(deltaTime);
  }

  triggerVisualVFX(vfxType) {
    this.activeVFX = vfxType;
    this.vfxTimer = 0;
  }

  // Ambient particle system for atmosphere (disabled for performance)
  initAmbientParticles() {
    this.ambientParticles = [];
  }

  updateAmbientParticles(deltaTime) {
    if (!this.ambientParticles) this.initAmbientParticles();
    const dt = deltaTime / 16.67;
    this.ambientParticles.forEach(p => {
      p.x += p.speedX * dt + Math.sin(Date.now() * 0.001 + p.phase) * 0.15;
      p.y += p.speedY * dt;
      p.phase += 0.01 * dt;
      if (p.y < -10) { p.y = this.canvas.height + 10; p.x = Math.random() * this.canvas.width; }
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;
    });
  }

  renderAmbientParticles() {
    if (!this.ambientParticles) return;
    const hour = this.clock ? this.clock.hours : 12;
    const isNight = hour >= 20 || hour < 6;
    const isDusk = hour >= 17 && hour < 20;
    
    this.ambientParticles.forEach(p => {
      const flicker = Math.sin(Date.now() * 0.003 + p.phase) * 0.5 + 0.5;
      if (p.type === 'firefly' && (isNight || isDusk)) {
        this.ctx.fillStyle = `rgba(180, 255, 120, ${p.opacity * flicker})`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        // Glow
        this.ctx.fillStyle = `rgba(180, 255, 120, ${p.opacity * flicker * 0.2})`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'leaf') {
        const leafColor = isNight ? `rgba(100, 180, 160, ${p.opacity * 0.4})` : `rgba(120, 200, 100, ${p.opacity * 0.5})`;
        this.ctx.fillStyle = leafColor;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(Math.sin(Date.now() * 0.002 + p.phase) * 0.5);
        this.ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
        this.ctx.restore();
      }
    });
  }

  triggerMayasurBattle() {
    this.state = 'battle';
    this.player.isMeditating = false;
    this.battleState = {
      phase: 'menu', // 'menu', 'player-action', 'enemy-turn', 'resolved'
      menuIndex: 0, // 0=Fight, 1=Observe, 2=Status, 3=Flee
      subMenu: null, // null, 'fight'
      subIndex: 0,
      text: "Mayasur blocks your path! The atmosphere grows heavy.",
      text2: null,
      damage: 0,
      maunaTurns: 0,
      shieldActive: false,
      dodgedTurn: false,
      timer: 0
    };
    console.log("Battle with Mayasur triggered!");
  }

  updateBattle(deltaTime) {
    // Battle ticks (mostly static menu, can add animations)
  }

  handleBattleInput(code) {
    const s = this.battleState;
    if (!s) return;

    if (s.phase === 'menu') {
      if (s.subMenu === null) {
        if (code === 'ArrowDown' || code === 'KeyS') {
          s.menuIndex = (s.menuIndex + 2) % 4;
        } else if (code === 'ArrowUp' || code === 'KeyW') {
          s.menuIndex = (s.menuIndex - 2 + 4) % 4;
        } else if (code === 'ArrowRight' || code === 'KeyD') {
          s.menuIndex = s.menuIndex % 2 === 0 ? s.menuIndex + 1 : s.menuIndex - 1;
        } else if (code === 'ArrowLeft' || code === 'KeyA') {
          s.menuIndex = s.menuIndex % 2 === 1 ? s.menuIndex - 1 : s.menuIndex + 1;
        } else if (code === 'KeyZ') {
          this.confirmBattleMenuOption();
        }
      } else if (s.subMenu === 'fight') {
        const vidyas = this.getBattleVidyas();
        if (vidyas.length === 0) {
          s.subMenu = null;
          return;
        }
        if (code === 'ArrowDown' || code === 'KeyS') {
          s.subIndex = Math.min(vidyas.length - 1, s.subIndex + 2);
        } else if (code === 'ArrowUp' || code === 'KeyW') {
          s.subIndex = Math.max(0, s.subIndex - 2);
        } else if (code === 'ArrowRight' || code === 'KeyD') {
          s.subIndex = Math.min(vidyas.length - 1, s.subIndex + 1);
        } else if (code === 'ArrowLeft' || code === 'KeyA') {
          s.subIndex = Math.max(0, s.subIndex - 1);
        } else if (code === 'KeyX') {
          s.subMenu = null;
        } else if (code === 'KeyZ') {
          this.executeVidyaAction(vidyas[s.subIndex]);
        }
      }
    } else {
      if (code === 'KeyZ' || code === 'KeyX') {
        this.advanceBattlePhase();
      }
    }
  }

  getBattleVidyas() {
    const list = [];
    for (const key in this.player.vidyas) {
      if (this.player.vidyas[key] > 0 && key !== 'mauna') {
        list.push(key);
      }
    }
    return list;
  }

  confirmBattleMenuOption() {
    const s = this.battleState;
    if (s.menuIndex === 0) {
      const vidyas = this.getBattleVidyas();
      if (vidyas.length === 0) {
        s.text = "You know no combat Vidyas! You stand defenseless. (Press Z)";
        s.phase = 'player-action';
      } else {
        s.subMenu = 'fight';
        s.subIndex = 0;
      }
    } else if (s.menuIndex === 1) {
      s.phase = 'player-action';
      s.maunaTurns += 1;
      s.text = `You sit in silent contemplation, observing the thought patterns of fear. (Press Z)`;
      s.text2 = `Your inner stillness expands. Mayasur is confused by your passivity (Silence Step ${s.maunaTurns}/3). (Press Z)`;
      
      this.triggerVisualVFX('yoga');
      
      if (s.maunaTurns >= 3) {
        s.phase = 'resolved';
      }
    } else if (s.menuIndex === 2) {
      s.phase = 'player-action';
      s.text = `Seeker Stats: Age ${this.player.age} | Breath ${Math.ceil(this.player.breath)} | Light Karma ${this.player.karmaLight} (Press Z)`;
      s.text2 = null;
    } else if (s.menuIndex === 3) {
      s.phase = 'player-action';
      s.text = "You retreat to the village shrine, gasping for breath. (Press Z)";
      s.timer = -1; // Fled flag
      s.text2 = null;
    }
  }

  executeVidyaAction(vidyaKey) {
    const s = this.battleState;
    s.subMenu = null;
    s.phase = 'player-action';
    
    this.triggerVisualVFX(vidyaKey);

    if (vidyaKey === 'agni') {
      s.text = "You trace the Agni Seal! Red fire waves spin outward. (Press Z)";
      s.text2 = "Mayasur counters! 'Fire is consumed by my void.' Drains 30 breath! (Press Z)";
      s.damage = 30;
    } else if (vidyaKey === 'dhanur') {
      s.text = "You loose a piercing Dhanur arrow of light! (Press Z)";
      s.text2 = "Mayasur deflects it into the void. Drains 25 breath! (Press Z)";
      s.damage = 25;
    } else if (vidyaKey === 'brahma') {
      s.text = "You chant Brahma Vidya, erecting a protective golden dome. (Press Z)";
      s.shieldActive = true;
      s.text2 = "Mayasur strikes! The golden dome glows bright, absorbing the shadow strike. (Press Z)";
      s.damage = 10;
    } else if (vidyaKey === 'yoga') {
      s.text = "You control your breath with Yoga, slowing down perception. (Press Z)";
      s.dodgedTurn = true;
      s.text2 = "Mayasur strikes, but you gracefully step aside, taking no damage! (Press Z)";
      s.damage = 0;
    } else {
      s.text = `You attempt to use ${vidyaKey.toUpperCase()} Vidya to reason with the shadow. (Press Z)`;
      s.text2 = "Mayasur ignores your arguments and lashes out! Drains 20 breath. (Press Z)";
      s.damage = 20;
    }
  }

  advanceBattlePhase() {
    const s = this.battleState;
    if (s.phase === 'player-action') {
      if (s.timer === -1) {
        this.player.deductBreath(40);
        this.state = 'playing';
        this.stopMayasurAttack();
        return;
      }
      
      if (s.text2) {
        s.text = s.text2;
        s.text2 = null;
        
        let dmg = s.damage || 0;
        if (s.shieldActive) {
          dmg = Math.floor(dmg / 2);
          s.shieldActive = false;
        }
        if (s.dodgedTurn) {
          dmg = 0;
          s.dodgedTurn = false;
        }
        this.player.deductBreath(dmg);
        
        if (this.player.breath <= 0) {
          s.phase = 'resolved';
          s.text = "Your breath fades... The shadow consumes your physical body. (Press Z)";
        }
      } else {
        s.phase = 'menu';
        s.text = "What will you do?";
      }
    } else if (s.phase === 'resolved') {
      if (this.player.breath <= 0) {
        this.state = 'playing';
        this.triggerDeath(true);
      } else {
        // Mauna Silence resolution
        this.state = 'playing';
        this.stopMayasurAttack();
        
        this.journal.data.maunaMeditationDone = true;
        this.journal.collectDreamFragment(2);
        this.journal.data.karmaLight += 50; // Light karma bonus
        this.journal.saveToStorage();
        
        this.queueDialogue("Mayasur's Retreat", [
          "Mayasur hesitates. Your complete stillness has mirrored the void back onto itself.",
          "A whisper fills your ears: 'I am Tamas... the Tenth Sage who desired to conquer Rta...'",
          "The shadow dissolves. The eclipse lifts. You have survived, Seeker."
        ]);
      }
    }
  }

  performDailyWork(workType) {
    if (this.player.breath < 20 && workType !== 'sadhana') {
      this.queueDialogue("Exhaustion", ["You are too weak to work today. Perform Sadhana at the Shrine or sleep first."]);
      return;
    }

    // Lock player in working animation state
    this.state = 'working_anim';
    this.workingTimer = 0;
    this.workingType = workType;

    // Trigger visual VFX immediately during animation
    if (workType === 'farming') {
      this.triggerVisualVFX('yoga');
    } else if (workType === 'forging') {
      this.triggerVisualVFX('agni');
    } else if (workType === 'studying') {
      this.triggerVisualVFX('brahma');
    } else if (workType === 'sadhana') {
      this.triggerVisualVFX('yoga');
    }
  }

  completeDailyWork(workType) {
    if (workType === 'farming') {
      this.player.deductBreath(20);
      this.player.vidyas.bhu = Math.min(3, this.player.vidyas.bhu + 0.25 * this.player.affinities.bhu);
      this.player.gainKarmaLight(3);
      this.queueDialogue("Village Crops", [
        "You work the fields, tending to the crop shoots.",
        "Your understanding of Bhu Vidya (Earth Science) grows. Sages smile at your industriousness."
      ]);
    } else if (workType === 'forging') {
      this.player.deductBreath(30);
      this.player.vidyas.shilpa = Math.min(3, this.player.vidyas.shilpa + 0.25 * this.player.affinities.shilpa);
      this.player.gainKarmaLight(4);
      this.queueDialogue("Daksha's Forge", [
        "You stoke the embers and forge iron hammers under Daksha's anvil.",
        "Your understanding of Shilpa Vidya (Crafting) increases. Heat warms your spirit."
      ]);
    } else if (workType === 'studying') {
      this.player.deductBreath(15);
      const chooseBrahma = Math.random() < 0.5;
      if (chooseBrahma) {
        this.player.vidyas.brahma = Math.min(3, this.player.vidyas.brahma + 0.25 * this.player.affinities.brahma);
      } else {
        this.player.vidyas.niti = Math.min(3, this.player.vidyas.niti + 0.25 * this.player.affinities.niti);
      }
      this.player.gainKarmaLight(2);
      this.queueDialogue("Temple Library", [
        "You study ancient Vedic manuscripts detailing the nature of the cosmos (Rta).",
        chooseBrahma ? "Brahma Vidya (Spiritual Truth) expands your consciousness." : "Niti Vidya (Ethics & Law) sharpens your analytical mind."
      ]);
    } else if (workType === 'sadhana') {
      // Home Ritual Sadhana restores breath
      this.player.healBreath(80);
      // Advance game clock hours by 2
      this.clock.hours = (this.clock.hours + 2) % 24;
      this.player.gainKarmaLight(1);
      this.queueDialogue("Sadhana Ritual", [
        "You sit before the stone shrine, chanting the sacred Gayatri mantra and performing breathing exercises (Pranayama).",
        "Your mental channels are purified. 80 points of Breath restored. 2 hours pass in deep meditation."
      ]);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'cinematic') {
      // Cinematic state: delegate rendering entirely to the cinematic system
      this.cinematic.render();
      return;
    }

    if (this.state === 'intro') {
      // Intro state renders a calm dark canvas with ambient teal stars behind the overlay
      this.ctx.fillStyle = '#05050f';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = 'rgba(117, 209, 186, 0.35)';
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(Date.now() * 0.0005 + i) * 0.5 + 0.5) * this.canvas.width;
        const y = (Math.cos(Date.now() * 0.0004 + i * 2.5) * 0.5 + 0.5) * this.canvas.height;
        this.ctx.fillRect(x, y, 2.5, 2.5);
      }
      return;
    }

    if (this.state === 'dreaming') {
      // Dreaming state renders custom dark canvas behind overlay
      this.ctx.fillStyle = '#05050f';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Draw cosmic particles on canvas
      this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 15; i++) {
        const x = (Math.sin(Date.now()*0.001 + i)*0.5 + 0.5) * this.canvas.width;
        const y = (Math.cos(Date.now()*0.0008 + i*2)*0.5 + 0.5) * this.canvas.height;
        this.ctx.fillRect(x, y, 1.5, 1.5);
      }
      return;
    }

    if (this.state === 'battle') {
      this.renderBattle();
      return;
    }

    // 0. Dark canvas fill — prevents bright transparent areas during gameplay
    this.ctx.fillStyle = '#0a1f16';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw Map grid
    this.map.draw(this.ctx, this.camera);

    // 2. Draw NPCs
    this.npcs.forEach(npc => {
      npc.draw(this.ctx, this.camera);
    });

    // 3. Draw Player
    this.player.draw(this.ctx, this.camera);

    // 4. Render Active Overworld VFX (Meditation/purifications)
    this.renderVFX(null);

    // 5. Build mode overlays (grid, cursor preview, palette)
    if (this.state !== 'transition' && this.buildMode.active) {
      this.buildMode._mapRef = this.map;
      this.buildMode._playerRef = this.player;
      this.buildMode.drawGrid(this.ctx, this.camera);
      this.buildMode.drawCursorPreview(this.ctx, this.camera);
      this.buildMode.drawPalette(this.ctx, this.canvas);
    }

    // 6. Draw Transition Mask
    if (this.state === 'transition' && this.transitionState) {
      const ts = this.transitionState;
      let opacity = 0;
      if (ts.phase === 'fade-out') {
        opacity = Math.min(1, ts.timer / ts.duration);
      } else if (ts.phase === 'warp') {
        opacity = 1;
      } else if (ts.phase === 'fade-in') {
        opacity = Math.max(0, 1 - (ts.timer / ts.duration));
      }
      this.ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  renderBattle() {
    // 1. Dark background
    this.ctx.fillStyle = '#090a12';
    this.ctx.fillRect(0, 0, 960, 640);

    // Draw preloaded battle backdrop illustration
    const bg = this.preloadedImages['assets/images/mayasur_battle_backdrop.png'];
    if (bg && bg.complete) {
      this.ctx.drawImage(bg, 12, 12, 936, 426);
    }

    // 2. Gold borders
    this.ctx.strokeStyle = '#ae905d';
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(12, 12, 936, 616);

    // 3. Draw Biome floor arena
    this.ctx.fillStyle = 'rgba(233, 196, 130, 0.08)';
    this.ctx.beginPath();
    this.ctx.ellipse(480, 380, 320, 90, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 4. Draw Player status on bottom-left with portrait
    const portrait = this.preloadedImages['assets/images/player_portrait.png'];
    if (portrait && portrait.complete) {
      // Draw gold portrait frame
      this.ctx.strokeStyle = '#ae905d';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(40, 275, 54, 54);
      this.ctx.drawImage(portrait, 42, 277, 50, 50);

      this.ctx.fillStyle = '#e0f2ed';
      this.ctx.font = 'bold 20px "Outfit"';
      this.ctx.fillText(this.player.name, 108, 295);
      this.ctx.font = '15px "Outfit"';
      this.ctx.fillText(`Age: ${this.player.age} Years`, 108, 318);
      
      // Breath Bar (smaller width to avoid overlap)
      this.ctx.fillStyle = '#1e382d';
      this.ctx.fillRect(108, 330, 130, 12);
      const breathPct = Math.max(0, this.player.breath / this.player.breathMax);
      this.ctx.fillStyle = breathPct > 0.4 ? '#47cc82' : '#d23d3d';
      this.ctx.fillRect(108, 330, 130 * breathPct, 12);
      this.ctx.strokeStyle = '#ebd09b';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(108, 330, 130, 12);
    } else {
      // Fallback
      this.ctx.fillStyle = '#e0f2ed';
      this.ctx.font = 'bold 22px "Outfit"';
      this.ctx.fillText(this.player.name, 100, 290);
      this.ctx.font = '16px "Outfit"';
      this.ctx.fillText(`Age: ${this.player.age} Years`, 100, 315);
      
      // Breath Bar
      this.ctx.fillStyle = '#1e382d';
      this.ctx.fillRect(100, 330, 200, 16);
      const breathPct = Math.max(0, this.player.breath / this.player.breathMax);
      this.ctx.fillStyle = breathPct > 0.4 ? '#47cc82' : '#d23d3d';
      this.ctx.fillRect(100, 330, 200 * breathPct, 16);
      this.ctx.strokeStyle = '#ebd09b';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(100, 330, 200, 16);
    }

    const pX = 180;
    const pY = 360;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      this.player.spriteSheet, 
      this.player.spriteWidth * this.player.direction,
      this.player.spriteHeight * this.player.walkFrame,
      this.player.spriteWidth, this.player.spriteHeight, 
      pX, pY, 64, 64
    );

    // 5. Draw Mayasur on top-right
    this.ctx.fillStyle = '#d23d3d';
    this.ctx.font = 'bold 24px "Outfit"';
    this.ctx.fillText("MAYASUR", 650, 100);
    this.ctx.font = '16px "Outfit"';
    this.ctx.fillStyle = '#ebd09b';
    this.ctx.fillText("Demonic Shadow of Tamas", 650, 125);

    // Giant shadow vortex
    const mX = 720;
    const mY = 240;
    this.ctx.fillStyle = 'rgba(28, 10, 42, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(mX, mY, 150 + Math.sin(Date.now()*0.005)*15, 0, Math.PI * 2);
    this.ctx.fill();

    // Pulse shockwave
    this.ctx.strokeStyle = '#9636c7';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(mX, mY, 160 + Math.sin(Date.now()*0.008)*25, 0, Math.PI * 2);
    this.ctx.stroke();

    // Red eyes
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(mX - 25, mY - 15, 16, 16);
    this.ctx.fillRect(mX + 10, mY - 15, 16, 16);

    // 6. Draw visual VFX if active
    this.renderVFX({ pX: pX + 40, pY: pY + 60, mX, mY });

    // 7. Draw battle panels at bottom
    // Dialogue box
    this.ctx.fillStyle = 'rgba(11, 26, 21, 0.98)';
    this.ctx.strokeStyle = '#ebd09b';
    this.ctx.lineWidth = 3;
    this.ctx.fillRect(40, 450, 520, 140);
    this.ctx.strokeRect(40, 450, 520, 140);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '18px "Outfit"';
    
    // Split text into two lines
    const text = this.battleState.text;
    const lines = text.split('(Press Z)');
    this.ctx.fillText(lines[0] || '', 60, 490);
    if (lines.length > 1) {
      this.ctx.fillStyle = '#75d1ba';
      this.ctx.font = 'italic 16px "Outfit"';
      this.ctx.fillText("[Press Z to confirm]", 60, 540);
    }

    // Command Menu box
    this.ctx.fillStyle = 'rgba(11, 26, 21, 0.98)';
    this.ctx.fillRect(580, 450, 340, 140);
    this.ctx.strokeRect(580, 450, 340, 140);

    const s = this.battleState;
    if (s.subMenu === null) {
      // Main options: FIGHT, OBSERVE, STATUS, FLEE
      const options = ["FIGHT", "OBSERVE", "STATUS", "FLEE"];
      this.ctx.font = 'bold 20px "Outfit"';
      options.forEach((opt, idx) => {
        const x = 620 + (idx % 2) * 150;
        const y = 495 + Math.floor(idx / 2) * 60;
        this.ctx.fillStyle = s.menuIndex === idx ? '#ebd09b' : '#8fa39e';
        this.ctx.fillText((s.menuIndex === idx ? '▶ ' : '') + opt, x, y);
      });
    } else if (s.subMenu === 'fight') {
      // Draw sub-menu Vidyas
      const vidyas = this.getBattleVidyas();
      this.ctx.font = 'bold 16px "Outfit"';
      vidyas.forEach((v, idx) => {
        if (idx < 4) { // limit display
          const x = 620 + (idx % 2) * 150;
          const y = 495 + Math.floor(idx / 2) * 60;
          this.ctx.fillStyle = s.subIndex === idx ? '#ebd09b' : '#8fa39e';
          this.ctx.fillText((s.subIndex === idx ? '▶ ' : '') + v.toUpperCase(), x, y);
        }
      });
      // Back helper
      this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
      this.ctx.font = '12px "Outfit"';
      this.ctx.fillText("Press X to return", 700, 575);
    }
  }

  renderVFX(battlePositions) {
    if (!this.activeVFX) return;

    if (this.state === 'battle' && battlePositions) {
      const { pX, pY, mX, mY } = battlePositions;

      if (this.activeVFX === 'agni') {
        // Agni fire rings expanding at Mayasur
        const progress = this.vfxTimer / 1000;
        this.ctx.strokeStyle = `rgba(210, 70, 30, ${1 - progress})`;
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.arc(mX, mY, progress * 250, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.strokeStyle = `rgba(235, 208, 155, ${1 - progress})`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(mX, mY, progress * 150, 0, Math.PI * 2);
        this.ctx.stroke();
      } 
      
      else if (this.activeVFX === 'brahma') {
        // Golden shield pulsing around the player
        const progress = Math.sin((this.vfxTimer / 1000) * Math.PI * 4) * 0.5 + 0.5;
        this.ctx.fillStyle = `rgba(235, 208, 155, ${0.1 + progress * 0.1})`;
        this.ctx.beginPath();
        this.ctx.arc(pX, pY, 70, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = `rgba(235, 208, 155, ${0.4 + progress * 0.4})`;
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
      } 
      
      else if (this.activeVFX === 'yoga') {
        // Floating Sanskrit elements
        const progress = this.vfxTimer / 1000;
        this.ctx.fillStyle = `rgba(117, 209, 186, ${1 - progress})`;
        this.ctx.font = '24px "Outfit"';
        this.ctx.fillText("ॐ", pX - 30, pY - 80 - progress * 100);
        this.ctx.fillText("शान्तिः", pX + 20, pY - 60 - progress * 130);
      }
    } else {
      // Overworld active VFX (underneath hud)
      if (this.activeVFX) {
        const screenPos = this.camera.toScreenSpace(this.player.x, this.player.y);
        const ts = this.tileSize;
        const progress = this.vfxTimer / 1000;
        
        if (this.activeVFX === 'agni') {
          this.ctx.strokeStyle = `rgba(210, 70, 30, ${1 - progress})`;
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          this.ctx.arc(screenPos.x + ts/2, screenPos.y + ts/2, progress * ts * 2, 0, Math.PI*2);
          this.ctx.stroke();
        } else if (this.activeVFX === 'brahma') {
          this.ctx.fillStyle = `rgba(235, 208, 155, ${0.2 * (1 - progress)})`;
          this.ctx.beginPath();
          this.ctx.arc(screenPos.x + ts/2, screenPos.y + ts/2, ts * 1.5, 0, Math.PI*2);
          this.ctx.fill();
        } else if (this.activeVFX === 'yoga') {
          this.ctx.fillStyle = `rgba(117, 209, 186, ${1 - progress})`;
          this.ctx.font = '16px "Outfit"';
          this.ctx.fillText("ॐ", screenPos.x + ts/2 - 8, screenPos.y - progress * 40);
        }
      }
    }
  }
}

// Launch app
window.addEventListener('load', () => {
  new GameApp();
});
