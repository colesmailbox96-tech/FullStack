export interface Needs {
  hunger: number;
  energy: number;
  social: number;
  curiosity: number;
  safety: number;
}

export function createDefaultNeeds(rand: () => number): Needs {
  return {
    hunger: 0.6 + rand() * 0.3,
    energy: 0.6 + rand() * 0.3,
    social: 0.6 + rand() * 0.3,
    curiosity: 0.6 + rand() * 0.3,
    safety: 0.6 + rand() * 0.3,
  };
}

export function getMostUrgentNeed(needs: Needs): keyof Needs {
  let lowest: keyof Needs = 'hunger';
  let lowestVal = needs.hunger;

  const keys: (keyof Needs)[] = ['energy', 'social', 'curiosity', 'safety'];
  for (const key of keys) {
    if (needs[key] < lowestVal) {
      lowestVal = needs[key];
      lowest = key;
    }
  }
  return lowest;
}

export function getMood(needs: Needs): 'happy' | 'content' | 'worried' | 'distressed' {
  const avg = (needs.hunger + needs.energy + needs.social + needs.curiosity + needs.safety) / 5;
  if (avg > 0.7) return 'happy';
  if (avg > 0.5) return 'content';
  if (avg > 0.3) return 'worried';
  return 'distressed';
}
