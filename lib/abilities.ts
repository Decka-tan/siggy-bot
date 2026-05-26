export interface Ability {
  name:   string;
  effect: string;
}

export const ABILITIES: Record<string, Ability> = {
  builder:           { name: 'Forge',    effect: 'Deal 2× damage on next attack' },
  yapper:            { name: 'Spam',     effect: 'Strike twice, each hit at 60% power' },
  threadoor:         { name: 'Thread',   effect: "Boost all allies' ATK +20% for 2 turns" },
  moderator:         { name: 'Timeout',  effect: "Skip opponent's next turn" },
  artist:            { name: 'Illusion', effect: 'Negate 50% of all incoming damage for 1 turn' },
  'event-manager':   { name: 'Rally',    effect: 'Restore 30% max HP to all allies' },
  'event-enjoyoor':  { name: 'Hype',     effect: 'All allies gain an extra action this turn' },
  team:              { name: 'Protocol', effect: 'Next attack is a guaranteed critical hit' },
  ambassador:        { name: 'Envoy',    effect: "Reduce target's ATK and SPD by 25% for 2 turns" },
};

export interface Passive {
  name:   string;
  effect: string;
}

export const PASSIVES: Passive[] = [
  { name: 'Undying',      effect: 'Cannot be destroyed by any single hit below 30% of max HP.' },
  { name: 'Regen',        effect: 'Recover 8% max HP at the start of each round.' },
  { name: 'Thorns',       effect: 'Attacker loses 20% of damage dealt back as ATK reduction (permanent).' },
  { name: 'Momentum',     effect: 'Gain +8% ATK each round this card survives, up to +40%.' },
  { name: 'Last Stand',   effect: 'Once per battle, survive a lethal hit at 1 HP and gain +50% ATK.' },
  { name: 'Aura',         effect: 'All allies in play gain +15% DEF while this card is on the field.' },
  { name: 'Counter',      effect: 'Automatically strike back for 40% of incoming damage on every hit.' },
  { name: 'Drain',        effect: 'Permanently steal 10% of the attacker\'s SPD each time this card is hit.' },
  { name: 'Glass Cannon', effect: '+50% ATK, −50% DEF permanently.' },
  { name: 'Resilience',   effect: 'Reduce all incoming damage by 15%, minimum 1.' },
  { name: 'Lifesteal',    effect: 'Recover HP equal to 25% of all damage dealt.' },
  { name: 'Fortify',      effect: 'Gain +25% DEF for each round this card does not attack, up to +75%.' },
  { name: 'Bloodrage',    effect: 'Gain +1% ATK for every 5 HP lost (no cap).' },
  { name: 'Spellbreak',   effect: 'Immune to all ability and passive effects from enemy cards.' },
  { name: 'Phantom Step', effect: '50% chance to evade any attack if SPD is higher than the attacker\'s ATK.' },
  { name: 'Steadfast',    effect: 'SPD and DEF cannot be reduced by any effect.' },
  { name: 'Shatter',      effect: 'Critical hits permanently reduce the target\'s DEF by 20.' },
  { name: 'Vampiric',     effect: 'All allies in play recover 5% max HP at the start of each round.' },
  { name: 'Execute',      effect: 'Deals 3× damage to any target below 20% HP.' },
  { name: 'Overclock',    effect: 'SPD increases by 10 each round, capped at +80.' },
  { name: 'Eternal Guard',effect: 'Cannot be targeted by attacks while any other ally is alive.' },
  { name: 'Leech',        effect: 'Permanently steal 20 ATK from the enemy each round.' },
  { name: 'Phase',        effect: 'Once per battle, the next attack against this card misses entirely.' },
  { name: 'Rampage',      effect: 'Each kill permanently increases this card\'s ATK by 50.' },
  { name: 'Bulwark',      effect: 'Absorb the first ability used against this card — it has no effect and is negated.' },
];
