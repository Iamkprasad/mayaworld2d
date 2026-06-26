import { describe, it, expect } from 'vitest';
import { RitualSystem } from '../systems/ritual.js';

describe('RitualSystem', () => {
  function makePlayer(overrides = {}) {
    return {
      vidyas: { agni: 0, niti: 0, vaidya: 0, dhanur: 0, jyotish: 0, yoga: 0, bhu: 0, brahma: 0, shilpa: 0, mauna: 0 },
      hasAsthra: false,
      trueNameKnown: false,
      karmaBalance: 0,
      ...overrides,
    };
  }

  function makeClock(overrides = {}) {
    return { eclipseActive: false, hours: 12, eclipseActiveHour: 0, eclipseDurationHours: 0, ...overrides };
  }

  it('returns unready for score < 80', () => {
    const player = makePlayer();
    const clock = makeClock();
    const res = RitualSystem.calculateResonance(player, clock);
    const ending = RitualSystem.getEnding(res);
    expect(ending.id).toBe('unready');
  });

  it('returns compassionate for score 80-149', () => {
    const player = makePlayer();
    player.vidyas.agni = 2; // +10
    player.vidyas.dhanur = 2; // +10
    player.vidyas.yoga = 2; // +10
    player.vidyas.bhu = 2; // +10
    player.vidyas.niti = 2; // +10
    player.vidyas.vaidya = 2; // +10
    player.vidyas.jyotish = 2; // +10
    player.vidyas.brahma = 2; // +10
    player.vidyas.shilpa = 2; // +10
    // 9 * 10 = 90
    const clock = makeClock();
    const res = RitualSystem.calculateResonance(player, clock);
    expect(res.score).toBe(90);
    const ending = RitualSystem.getEnding(res);
    expect(ending.id).toBe('compassionate');
  });

  it('returns almost_samat for score 150-224 without mauna', () => {
    const player = makePlayer();
    player.vidyas.agni = 3; // +20
    player.vidyas.dhanur = 3; // +20
    player.vidyas.yoga = 3; // +20
    player.vidyas.bhu = 3; // +20
    player.vidyas.niti = 3; // +20
    player.vidyas.vaidya = 3; // +20
    player.vidyas.jyotish = 3; // +20
    player.vidyas.brahma = 3; // +20
    player.vidyas.shilpa = 3; // +20
    player.hasAsthra = true; // +15
    // 9 * 20 + 15 = 195
    const clock = makeClock();
    const res = RitualSystem.calculateResonance(player, clock);
    expect(res.score).toBe(195);
    const ending = RitualSystem.getEnding(res);
    expect(ending.id).toBe('almost_samat');
  });

  it('returns samat for score >=225 with mauna and trueNameKnown', () => {
    const player = makePlayer();
    player.vidyas.agni = 3;
    player.vidyas.dhanur = 3;
    player.vidyas.yoga = 3;
    player.vidyas.bhu = 3;
    player.vidyas.niti = 3;
    player.vidyas.vaidya = 3;
    player.vidyas.jyotish = 3;
    player.vidyas.brahma = 3;
    player.vidyas.shilpa = 3;
    player.vidyas.mauna = 1; // +30
    player.hasAsthra = true; // +15
    player.trueNameKnown = true; // +10
    // 9 * 20 + 30 + 15 + 10 = 235
    const clock = makeClock();
    const res = RitualSystem.calculateResonance(player, clock);
    expect(res.score).toBe(235);
    const ending = RitualSystem.getEnding(res);
    expect(ending.id).toBe('samat');
  });

  it('applies 1.5x eclipse multiplier', () => {
    const player = makePlayer();
    player.vidyas.mauna = 1; // +30
    player.trueNameKnown = true; // +10
    // 30 + 10 = 40
    const clock = makeClock({ eclipseActive: true, hours: 14, eclipseActiveHour: 12, eclipseDurationHours: 6 });
    const res = RitualSystem.calculateResonance(player, clock);
    expect(res.score).toBe(Math.floor(40 * 1.5));
  });
});
