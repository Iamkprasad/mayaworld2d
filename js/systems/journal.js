// Seeker's Journal & Serialization Save System

export class SeekerJournal {
  constructor() {
    this.saveKey = 'mayaworld_seeker_save';
    
    // Cosmic variables (carried across lives)
    this.data = {
      livesCount: 1,
      karmaLight: 0,
      karmaShadow: 0,
      currentEpoch: 1,
      dreamFragments: [], // Collected IDs
      lineage: [],        // Array of past life summaries
      hasAsthra: false,
      relicRage: false,
      relicPride: false,
      relicDesire: false,
      forgeProgress: 0,
      namesCollected: [],
      maunaMeditationDone: false,
      maunaFleeDone: false,
      maunaSilenceDone: false,
      maunaUnlocked: false
    };

    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.saveKey);
      if (saved) {
        this.data = { ...this.data, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("localStorage is not available. Using in-memory storage instead.", e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.saveKey, JSON.stringify(this.data));
    } catch (e) {
      console.error("Failed to write to localStorage:", e);
    }
  }

  recordLife(name, age, causeOfDeath, dominantVidya) {
    this.data.lineage.push({
      lifeId: this.data.livesCount,
      name: name,
      age: age,
      causeOfDeath: causeOfDeath,
      dominantVidya: dominantVidya,
      epoch: this.data.currentEpoch
    });
    this.data.livesCount += 1;
    this.saveToStorage();
  }

  collectDreamFragment(fragmentId) {
    if (!this.data.dreamFragments.includes(fragmentId)) {
      this.data.dreamFragments.push(fragmentId);
      this.saveToStorage();
    }
  }

  collectMayasurName(name) {
    if (!this.data.namesCollected.includes(name)) {
      this.data.namesCollected.push(name);
      this.saveToStorage();
    }
  }

  // Export Save File (.sav text download)
  exportSave() {
    const jsonStr = JSON.stringify(this.data);
    // Basic base64 encryption to make it look like a binary save file
    const encoded = btoa(jsonStr);
    
    const blob = new Blob([encoded], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `mayaworld_life_${this.data.livesCount}.sav`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Import Save File (.sav text upload)
  importSave(fileText) {
    try {
      const decoded = atob(fileText.trim());
      const parsed = JSON.parse(decoded);
      
      // Basic validation
      if (parsed.livesCount !== undefined && parsed.lineage !== undefined) {
        this.data = parsed;
        this.saveToStorage();
        return true;
      }
    } catch (e) {
      console.error("Invalid save file format:", e);
    }
    return false;
  }

  resetAll() {
    this.data = {
      livesCount: 1,
      karmaLight: 0,
      karmaShadow: 0,
      currentEpoch: 1,
      dreamFragments: [],
      lineage: [],
      hasAsthra: false,
      relicRage: false,
      relicPride: false,
      relicDesire: false,
      forgeProgress: 0,
      namesCollected: [],
      maunaMeditationDone: false,
      maunaFleeDone: false,
      maunaSilenceDone: false,
      maunaUnlocked: false
    };
    try {
      localStorage.removeItem(this.saveKey);
    } catch (e) {}
  }
}
export default SeekerJournal;
