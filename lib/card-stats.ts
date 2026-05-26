/**
 * Shared card stat computation — used by both API (server) and card generator (client).
 * Keep this file free of Node.js / Next.js imports so it's safe to import anywhere.
 */

export const RARITY_MULT: Record<string, number> = {
  UR: 4.5, SSR: 4, SR: 3, R: 2, common: 1,
};

const round50 = (n: number) => Math.round(n / 50) * 50;

const SD_90 = Math.sqrt(90); // 3-month baseline — floor for all rarities

export function computeStats(days: number, roleRank: number, rarity: string) {
  const mult = RARITY_MULT[rarity] ?? 1;
  const sd   = Math.sqrt(days); // diminishing returns — 30d≈5.5, 90d≈9.5, 365d≈19, 730d≈27

  const atk = round50(Math.floor(sd       * mult * 12));
  const def = round50(Math.floor(roleRank * mult * 80));
  const spd = round50(Math.floor(sd       * roleRank * mult * 4));

  // Floor = what a 3-month member at roleRank 1 would get — derived from the same formula
  const minAtk = round50(Math.floor(SD_90 * mult * 12));
  const minDef = round50(Math.floor(1     * mult * 80));
  const minSpd = round50(Math.floor(SD_90 * 1    * mult * 4));

  const finalAtk = Math.max(atk, minAtk);
  const finalDef = Math.max(def, minDef);
  const finalSpd = Math.max(spd, minSpd);
  const rep = finalAtk + finalDef + finalSpd;
  return { rep, atk: finalAtk, def: finalDef, spd: finalSpd };
}
