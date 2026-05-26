/**
 * Shared card stat computation — used by both API (server) and card generator (client).
 * Keep this file free of Node.js / Next.js imports so it's safe to import anywhere.
 */

export const RARITY_MULT: Record<string, number> = {
  UR: 4.5, SSR: 4, SR: 3, R: 2, common: 1,
};

/** Flat bonus added on top of the formula so same username at higher rarity is always stronger */
export const RARITY_BASE: Record<string, { atk: number; def: number; spd: number }> = {
  common: { atk: 0,   def: 0,   spd: 0   },
  R:      { atk: 80,  def: 30,  spd: 60  },
  SR:     { atk: 200, def: 100, spd: 150 },
  SSR:    { atk: 400, def: 200, spd: 280 },
  UR:     { atk: 520, def: 260, spd: 360 },
};

const round50 = (n: number) => Math.round(n / 50) * 50;

const SD_90 = Math.sqrt(90); // 3-month baseline for minimum threshold

export function computeStats(days: number, roleRank: number, rarity: string) {
  const mult = RARITY_MULT[rarity] ?? 1;
  const base = RARITY_BASE[rarity] ?? RARITY_BASE.common;
  const sd   = Math.sqrt(days); // diminishing returns — 30d≈5.5, 90d≈9.5, 365d≈19, 730d≈27

  const atk = round50(Math.floor(sd    * mult * 12)         + base.atk);
  const def = round50(Math.floor(roleRank * mult * 80)       + base.def);
  const spd = round50(Math.floor(sd    * roleRank * mult * 4) + base.spd);

  // Floor = what a 3-month member at base roleRank (1) would get
  const minAtk = round50(Math.floor(SD_90 * mult * 12)     + base.atk);
  const minDef = round50(Math.floor(1     * mult * 80)      + base.def);
  const minSpd = round50(Math.floor(SD_90 * 1    * mult * 4) + base.spd);

  const finalAtk = Math.max(atk, minAtk);
  const finalDef = Math.max(def, minDef);
  const finalSpd = Math.max(spd, minSpd);
  const rep = finalAtk + finalDef + finalSpd;
  return { rep, atk: finalAtk, def: finalDef, spd: finalSpd };
}
