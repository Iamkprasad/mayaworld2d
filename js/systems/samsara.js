// Rebirth (Samsara) and Dreaming State System

import { createSages } from '../entities/npc.js';

export class SamsaraSystem {
  constructor(journal, onRebirthComplete) {
    this.journal = journal;
    this.onRebirthComplete = onRebirthComplete;
    this.dreamingOverlay = document.getElementById('dreaming-overlay');
    this.echoesList = document.getElementById('echoes-list');
    this.maunaBtn = document.getElementById('mauna-rebirth-btn');
    
    this.selectedAffinity = null;

    // Attach listeners
    this.maunaBtn.addEventListener('click', () => {
      this.resolveRebirth(null);
    });
  }

  triggerDreamingState(player) {
    this._lastPlayerAge = player.age;
    let dominantVidya = 'None';
    let maxLvl = 0;
    for (const key in player.vidyas) {
      if (player.vidyas[key] > maxLvl) {
        maxLvl = player.vidyas[key];
        dominantVidya = key;
      }
    }
    
    // Save to journal
    this.journal.recordLife(
      player.name,
      player.age,
      player.breath <= 0 ? "Old Age" : "Catastrophe",
      dominantVidya
    );

    // Save current karma to persistent state
    this.journal.data.karmaLight += player.karmaLight;
    this.journal.data.karmaShadow += player.karmaShadow;
    this.journal.saveToStorage();

    // 2. Populate the Council of Echoes based on player bonds in this life
    this.echoesList.innerHTML = '';
    
    // Create temporary sages list to check bonds (mimics encounter memory)
    const sages = createSages();
    let hasBonds = false;

    sages.forEach(sage => {
      // Simulate bond level check (in game loop, bonds are increased)
      // Retrieve bond from player data (in game we save these per life)
      const currentBond = player.karmaLight > 10 ? 40 : 0; // fallback mock bond
      
      if (currentBond >= 20 || player.vidyas[this.getVidyaKeyBySage(sage.name)] > 0) {
        hasBonds = true;
        const btn = document.createElement('button');
        btn.className = 'echo-btn';
        btn.innerText = `${sage.name} (${this.getVidyaNameBySage(sage.name)}): "Carry my voice. Relearn the path fast."`;
        btn.addEventListener('click', () => {
          this.resolveRebirth(this.getVidyaKeyBySage(sage.name));
        });
        this.echoesList.appendChild(btn);
      }
    });

    if (!hasBonds) {
      const p = document.createElement('p');
      p.innerText = "You wander the void alone. No Sage whispers back. Seek them in the next life.";
      p.style.fontSize = '0.65rem';
      p.style.color = '#8fa39e';
      this.echoesList.appendChild(p);
    }

    // Show overlay with fade-in
    this.dreamingOverlay.classList.remove('hidden');
    requestAnimationFrame(() => this.dreamingOverlay.classList.add('visible'));
  }

  resolveRebirth(vidyaKey) {
    this.dreamingOverlay.classList.remove('visible');
    this.dreamingOverlay.addEventListener('transitionend', () => {
      this.dreamingOverlay.classList.add('hidden');
    }, { once: true });
    
    // Triggers Mauna condition 3 if player walks away and sits in silence (chooses no voice)
    if (vidyaKey === null) {
      this.journal.data.maunaSilenceDone = true;
      console.log("Mauna condition: Sat in silence.");
      // Check if all Mauna conditions are met to unlock 10th Vidya
      if (this.journal.data.maunaMeditationDone && this.journal.data.maunaFleeDone && this.journal.data.maunaSilenceDone) {
        this.journal.data.maunaUnlocked = true;
        console.log("Mauna Vidya unlocked!");
      }
      this.journal.saveToStorage();
    }

    const currentEpoch = this.journal.data.currentEpoch;
    let nextEpoch = currentEpoch;
    const age = this._lastPlayerAge || 30;
    if (age < 20) {
      nextEpoch = Math.min(7, currentEpoch + 2);
    } else if (age >= 50) {
      nextEpoch = currentEpoch;
    } else {
      nextEpoch = currentEpoch + 1;
    }
    if (nextEpoch > 7) nextEpoch = 1;

    this.journal.data.currentEpoch = nextEpoch;
    this.journal.saveToStorage();

    if (this.onRebirthComplete) {
      this.onRebirthComplete(vidyaKey, nextEpoch);
    }
  }

  getVidyaKeyBySage(sageName) {
    const mapping = {
      'Bhrigu': 'agni', 'Pulastya': 'niti', 'Pulaha': 'vaidya',
      'Kratu': 'dhanur', 'Angiras': 'jyotish', 'Marichi': 'yoga',
      'Atri': 'bhu', 'Vashistha': 'brahma', 'Daksha': 'shilpa'
    };
    return mapping[sageName] || 'agni';
  }

  getVidyaNameBySage(sageName) {
    const mapping = {
      'Bhrigu': 'Agni Vidya', 'Pulastya': 'Niti Shastra', 'Pulaha': 'Vaidya Kala',
      'Kratu': 'Dhanur Vidya', 'Angiras': 'Jyotish Vidya', 'Marichi': 'Yoga Siddhi',
      'Atri': 'Bhu Vidya', 'Vashistha': 'Brahma Vidya', 'Daksha': 'Shilpa Vidya'
    };
    return mapping[sageName] || 'Agni';
  }
}
export default SamsaraSystem;
