/**
 * Shared card stat computation — used by both API (server) and card generator (client).
 * Keep this file free of Node.js / Next.js imports so it's safe to import anywhere.
 */

export const RARITY_MULT: Record<string, number> = {
  UR: 5, SSR: 4, SR: 3, R: 2, common: 1,
};

/** Flat bonus added on top of the formula so same username at higher rarity is always stronger */
export const RARITY_BASE: Record<string, { atk: number; def: number; spd: number }> = {
  common: { atk: 0,    def: 0,   spd: 0   },
  R:      { atk: 100,  def: 50,  spd: 80  },
  SR:     { atk: 300,  def: 150, spd: 200 },
  SSR:    { atk: 600,  def: 300, spd: 400 },
  UR:     { atk: 1000, def: 500, spd: 650 },
};

export function computeStats(days: number, roleRank: number, rarity: string) {
  const mult = RARITY_MULT[rarity] ?? 1;
  const base = RARITY_BASE[rarity] ?? RARITY_BASE.common;
  const rep  = Math.floor(days * mult);
  return {
    rep,
    atk: rep + base.atk,
    def: Math.floor(roleRank * mult * 80) + base.def,
    spd: Math.floor(days * roleRank * mult * 0.3) + base.spd,
  };
}
