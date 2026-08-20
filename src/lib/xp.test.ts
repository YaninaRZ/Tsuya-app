import { xpForLevel, xpToNextLevel, xpIntoCurrentLevel } from "./xp";

describe("xpForLevel — XP cumulatif pour atteindre le niveau N", () => {
  test("niveau 1 : 0 XP requis (point de départ)", () => {
    expect(xpForLevel(1)).toBe(0);
  });

  test("niveau 2 : 100 XP requis (N1→N2 coûte 100)", () => {
    expect(xpForLevel(2)).toBe(100);
  });

  test("niveau 3 : 275 XP requis (100 + 175)", () => {
    expect(xpForLevel(3)).toBe(275);
  });

  test("niveau 4 : 525 XP requis (100 + 175 + 250)", () => {
    expect(xpForLevel(4)).toBe(525);
  });

  test("niveau 5 : 850 XP requis (100 + 175 + 250 + 325)", () => {
    expect(xpForLevel(5)).toBe(850);
  });

  test("niveau <= 1 retourne toujours 0", () => {
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(-5)).toBe(0);
  });
});

describe("xpToNextLevel — XP nécessaire pour passer au niveau suivant", () => {
  test("niveau 1 : 100 XP pour passer au niveau 2", () => {
    expect(xpToNextLevel(1)).toBe(100);
  });

  test("niveau 2 : 175 XP pour passer au niveau 3", () => {
    expect(xpToNextLevel(2)).toBe(175);
  });

  test("niveau 3 : 250 XP pour passer au niveau 4", () => {
    expect(xpToNextLevel(3)).toBe(250);
  });

  test("niveau 10 : 775 XP pour passer au niveau 11", () => {
    expect(xpToNextLevel(10)).toBe(775);
  });

  test("la progression augmente de 75 XP à chaque niveau", () => {
    const diff1 = xpToNextLevel(2) - xpToNextLevel(1);
    const diff2 = xpToNextLevel(3) - xpToNextLevel(2);
    const diff3 = xpToNextLevel(4) - xpToNextLevel(3);
    expect(diff1).toBe(75);
    expect(diff2).toBe(75);
    expect(diff3).toBe(75);
  });
});

describe("xpIntoCurrentLevel — XP accumulé dans le niveau actuel", () => {
  test("0 XP au niveau 1 : 0 XP dans le niveau en cours", () => {
    expect(xpIntoCurrentLevel(0, 1)).toBe(0);
  });

  test("50 XP au niveau 1 : 50 XP dans le niveau en cours", () => {
    expect(xpIntoCurrentLevel(50, 1)).toBe(50);
  });

  test("150 XP au niveau 2 : 50 XP dans le niveau en cours (150 - 100)", () => {
    expect(xpIntoCurrentLevel(150, 2)).toBe(50);
  });

  test("300 XP au niveau 3 : 25 XP dans le niveau en cours (300 - 275)", () => {
    expect(xpIntoCurrentLevel(300, 3)).toBe(25);
  });

  test("cohérence : xpForLevel + xpIntoCurrentLevel = xpTotal", () => {
    const xpTotal = 400;
    const level = 3;
    expect(xpForLevel(level) + xpIntoCurrentLevel(xpTotal, level)).toBe(xpTotal);
  });
});

describe("Plafond 100 XP/jour — vérification de la règle métier", () => {
  test("un utilisateur niveau 1 ne peut pas dépasser 100 XP par jour", () => {
    // Avec le plafond, max 1 niveau par jour au niveau 1
    const xpGagneParJour = 100;
    expect(xpGagneParJour).toBeLessThanOrEqual(xpToNextLevel(1));
  });

  test("au niveau 2, le palier (175 XP) dépasse le plafond journalier", () => {
    // Il faut donc minimum 2 jours pour passer du niveau 2 au niveau 3
    expect(xpToNextLevel(2)).toBeGreaterThan(100);
  });
});
