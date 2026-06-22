// Final Ritual System - Calculates Resonance and manages ending screens

export class RitualSystem {
  static calculateResonance(player, clock) {
    let resonance = 0;
    
    // 1. Vidyas progress (max 9 * 20 = 180)
    for (const key in player.vidyas) {
      if (key === 'mauna') continue;
      const level = player.vidyas[key];
      if (level === 1) resonance += 5;
      else if (level === 2) resonance += 10;
      else if (level === 3) resonance += 20;
    }

    // 2. Mauna Vidya (30 points)
    const hasMauna = player.vidyas.mauna === 1;
    if (hasMauna) {
      resonance += 30;
    }

    // 3. Asthra of Tamas forged (15 points)
    if (player.hasAsthra) {
      resonance += 15;
    }

    // 4. True Name known (10 points)
    const knowsTrueName = player.trueNameKnown;
    if (knowsTrueName) {
      resonance += 10;
    }

    // 5. Solar Eclipse active (1.5x multiplier)
    const isEclipse = clock.eclipseActive && clock.hours >= clock.eclipseActiveHour && clock.hours < clock.eclipseActiveHour + clock.eclipseDurationHours;
    if (isEclipse) {
      resonance = Math.floor(resonance * 1.5);
    }

    return {
      score: resonance,
      hasMauna,
      hasAsthra: player.hasAsthra,
      knowsTrueName,
      isEclipse
    };
  }

  static getEnding(res) {
    if (res.score < 80) {
      return {
        id: 'unready',
        title: "THE UNREADY",
        text: "The altar remains dark. The cosmic forces do not respond. A whisper echoes in the wind: 'Come back when the circle is complete.' You must seek more Vidyas from the Sages."
      };
    }
    if (res.score < 150) {
      return {
        id: 'compassionate',
        title: "THE COMPASSIONATE ONE",
        text: "The ritual flares. Mayasur screams as his dark energy is repelled. He retreats into the volcanic caves, granting the island 200 years of peace. But the curse remains unbroken. You die knowing you only delayed the inevitable."
      };
    }
    if (res.score < 225 || !res.hasMauna) {
      return {
        id: 'almost_samat',
        title: "ALMOST SAMAT",
        text: "The eclipse covers the sun. Tamas's form becomes visible inside the shadow, reaching toward you. But you lack the Vidya of Silence (Mauna) to ground the cosmic currents. The ritual collapses. Tamas is pulled back into torment."
      };
    }
    return {
      id: 'samat',
      title: "SAMAT (TRUE LIBERATION)",
      text: "You stand still. 30 seconds of absolute silence pass. Mayasur's storm fades into a gentle breeze. Tamas emerges from the shadow—not as a demon, but as a tired Sage. He smiles, dissolves into golden light, and a sapling sprouts. The 9 Sages gather and crown you Samat: the Tenth Sage."
    };
  }
}
export default RitualSystem;
