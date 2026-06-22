// Seeker's Journal & Serialization Save System

export class SeekerJournal {
  static SCHEMA_VERSION = 1;

  constructor() {
    this.saveKey = 'mayaworld_seeker_save';
    
    // Cosmic variables (carried across lives)
    this.data = {
      version: SeekerJournal.SCHEMA_VERSION,
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
      maunaUnlocked: false,
      trueNameKnown: false
    };

    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.saveKey);
      if (saved) {
        this.data = { ...this.data, ...JSON.parse(saved) };
        this._migrateSaveData();
      }
    } catch (e) {
      console.warn("localStorage is not available. Using in-memory storage instead.", e);
    }
  }

  _migrateSaveData() {
    const v = this.data.version || 0;
    if (v < SeekerJournal.SCHEMA_VERSION) {
      this.data.version = SeekerJournal.SCHEMA_VERSION;
      this.saveToStorage();
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
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    
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
      const decoded = decodeURIComponent(escape(atob(fileText.trim())));
      const parsed = JSON.parse(decoded);
      
      if (this._validateSaveData(parsed)) {
        this.data = { ...this.data, ...parsed };
        this._migrateSaveData();
        this.saveToStorage();
        return true;
      }
    } catch (e) {
      console.error("Invalid save file format:", e);
    }
    return false;
  }

  _validateSaveData(parsed) {
    if (typeof parsed !== 'object' || parsed === null) return false;
    if (typeof parsed.livesCount !== 'number' || parsed.livesCount < 1 || parsed.livesCount > 9999) return false;
    if (!Array.isArray(parsed.lineage)) return false;
    if (typeof parsed.karmaLight !== 'number' || typeof parsed.karmaShadow !== 'number') return false;
    if (typeof parsed.currentEpoch !== 'number' || parsed.currentEpoch < 1 || parsed.currentEpoch > 7) return false;
    if (!Array.isArray(parsed.dreamFragments)) return false;
    if (typeof parsed.hasAsthra !== 'boolean') parsed.hasAsthra = false;
    if (typeof parsed.forgeProgress !== 'number') parsed.forgeProgress = 0;
    return true;
  }

  resetAll() {
    this.data = {
      version: SeekerJournal.SCHEMA_VERSION,
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
      maunaUnlocked: false,
      trueNameKnown: false
    };
    try {
      localStorage.removeItem(this.saveKey);
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
  }
}
export default SeekerJournal;
