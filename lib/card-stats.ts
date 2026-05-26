/**
 * Shared card stat computation — used by both API (server) and card generator (client).
 * Keep this file free of Node.js / Next.js imports so it's safe to import anywhere.
 */

export const RARITY_MULT: Record<string, number> = {
  UR: 5, SSR: 4, SR: 3, R: 2, common: 1,
};

/** Flat bonus added on top of the formula so same username at higher rarity is always stronger */
export const RARITY_BASE: Record<string, { atk: number; def: number; spd: number }> = {
  common: { atk: 0,   def: 0,   spd: 0   },
  R:      { atk: 80,  def: 30,  spd: 60  },
  SR:     { atk: 200, def: 100, spd: 150 },
  SSR:    { atk: 400, def: 200, spd: 280 },
  UR:     { atk: 650, def: 320, spd: 430 },
};

export function computeStats(days: number, roleRank: number, rarity: string) {
  const mult = RARITY_MULT[rarity] ?? 1;
  const base = RARITY_BASE[rarity] ?? RARITY_BASE.common;
  const atk  = Math.floor(days * mult) + base.atk;
  const def  = Math.floor(roleRank * mult * 80) + base.def;
  const spd  = Math.floor(days * roleRank * mult * 0.3) + base.spd;
  const rep  = atk + def + spd;
  return { rep, atk, def, spd };
}
