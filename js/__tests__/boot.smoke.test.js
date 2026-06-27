// Browser-free boot smoke test.
// Boots the full game in jsdom with a stubbed 2D canvas context and asserts it
// reaches the intro state without throwing — the closest proof, short of a real
// browser, that the title/intro actually appears (a throw during map build is
// exactly what would hide the intro overlay).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

// A no-op 2D context: every method is a function, every property settable.
function makeCtx() {
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      // return a callable for method-style access; harmless for property reads
      const fn = () => {};
      return fn;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

describe('game boot', () => {
  let dom;
  beforeEach(() => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });
    const { window } = dom;

    // Canvas 2D context stub
    window.HTMLCanvasElement.prototype.getContext = () => makeCtx();
    // Image stub that "loads" immediately
    window.Image = class {
      constructor() { this.complete = true; }
      set src(v) { this._src = v; if (this.onload) this.onload(); }
      get src() { return this._src; }
    };
    // Don't actually run the animation loop
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

    // Expose globals the modules expect
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Image = window.Image;
    globalThis.requestAnimationFrame = window.requestAnimationFrame;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame;
    globalThis.navigator = window.navigator;
    globalThis.localStorage = window.localStorage;
    globalThis.HTMLElement = window.HTMLElement;
  });

  it('boots to intro state without throwing', async () => {
    // Importing game.js registers a window 'load' handler that constructs GameApp.
    await import('../engine/game.js');

    let threw = null;
    try {
      dom.window.dispatchEvent(new dom.window.Event('load'));
    } catch (e) {
      threw = e;
    }
    expect(threw, threw && threw.stack).toBeNull();

    // Intro overlay should be visible (not hidden) right after boot.
    const overlay = dom.window.document.getElementById('intro-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.classList.contains('hidden')).toBe(false);
  });
});
