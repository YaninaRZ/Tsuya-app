// XP cumulatif pour atteindre le niveau N
// Niveau N→N+1 coûte 100 + (N-1)*75 XP
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return (n - 1) * 100 + 75 * ((n - 1) * (n - 2)) / 2;
}

// XP nécessaire pour passer du niveau actuel au suivant
export function xpToNextLevel(level: number): number {
  return 100 + (level - 1) * 75;
}

// XP accumulé dans le niveau actuel
export function xpIntoCurrentLevel(xpTotal: number, level: number): number {
  return xpTotal - xpForLevel(level);
}
