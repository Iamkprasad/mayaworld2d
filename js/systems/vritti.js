// Vritti (Mental Interruption) System

export const VRITTI_POOL = [
  "Are you sure this life has been enough?",
  "You have forgotten something. What was it?",
  "Mayasur is watching your progress. He knows.",
  "The next eclipse is closer than you think.",
  "Is knowledge a tool for saving others, or saving yourself?",
  "He was once your teacher. Do you hate him, or pity him?",
  "A shadow is only cast where there is light.",
  "Silence is not empty. It is full of answers you refuse to hear.",
  "Your breath is fading. Time moves. Do you feel the hurry?",
  "Who is the one meditating? The body, or the memory?",
  "A tree does not hold its leaves. Why do you hold your past lives?",
  "You cannot destroy a curse by fighting it. A knot must be untied.",
  "Bhrigu carries guilt. Vashistha carries fear. What do you carry?",
  "The river delta always changes shape. Stand firm."
];

export class VrittiSystem {
  constructor(uiElements) {
    this.uiOverlay = uiElements.overlay;
    this.uiText = uiElements.text;
    
    this.active = false;
    this.timer = 0;
    this.durationMs = 5000; // 5 seconds to observe
    this.onComplete = null;
    this.onInterrupt = null;
  }

  trigger(onComplete, onInterrupt) {
    if (this.active) return;
    
    this.active = true;
    this.timer = 0;
    this.onComplete = onComplete;
    this.onInterrupt = onInterrupt;

    // Pick random thought
    const thought = VRITTI_POOL[Math.floor(Math.random() * VRITTI_POOL.length)];
    this.uiText.innerText = `"${thought}"`;
    this.uiOverlay.classList.remove('hidden');
  }

  update(deltaTime) {
    if (!this.active) return;
    
    this.timer += deltaTime;
    if (this.timer >= this.durationMs) {
      this.resolveObserve();
    }
  }

  resolveDismiss() {
    if (!this.active) return;
    this.close();
    if (this.onInterrupt) this.onInterrupt(); // Interrupted meditation
  }

  resolveObserve() {
    if (!this.active) return;
    this.close();
    if (this.onComplete) this.onComplete(); // Successfully observed (+1 Smriti)
  }

  close() {
    this.active = false;
    this.uiOverlay.classList.add('hidden');
  }
}
export default VrittiSystem;
