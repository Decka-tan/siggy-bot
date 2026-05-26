export interface Ability {
  name:   string;
  effect: string;
}

export const ABILITIES: Record<string, Ability> = {
  builder:           { name: 'Forge',    effect: 'Deal 2× damage on next attack' },
  yapper:            { name: 'Spam',     effect: 'Strike twice, each hit at 60% power' },
  threadoor:         { name: 'Thread',   effect: "Boost all allies' ATK by 30% for 2 turns" },
  moderator:         { name: 'Timeout',  effect: "Skip opponent's next turn" },
  artist:            { name: 'Illusion', effect: 'Negate 50% of all incoming damage for 1 turn' },
  'event-manager':   { name: 'Rally',    effect: "Boost all allies' DEF by 30% for 2 turns" },
  'event-enjoyoor':  { name: 'Hype',     effect: 'Take an extra action this turn' },
  team:              { name: 'Protocol', effect: 'Next attack is a guaranteed critical hit' },
  ambassador:        { name: 'Envoy',    effect: "Reduce opponent's ATK and SPD by 25% for 2 turns" },
};

export interface Passive {
  name:   string;
  effect: string;
}

export const PASSIVES: Passive[] = [
  { name: 'Undying',      effect: "Cannot be destroyed by a hit dealing less than this card's DEF value." },
  { name: 'Regen',        effect: 'Gain +8% DEF at the start of each round, up to +40% total.' },
  { name: 'Thorns',       effect: 'Attacker permanently loses ATK equal to 20% of damage dealt.' },
  { name: 'Momentum',     effect: 'Gain +8% ATK each round this card survives, up to +40%.' },
  { name: 'Last Stand',   effect: 'Survive one lethal hit per battle. Gain +50% ATK afterward.' },
  { name: 'Aura',         effect: 'All allies in play gain +15% DEF while this card is on the field.' },
  { name: 'Counter',      effect: 'Automatically strike back for 40% of incoming damage on every hit.' },
  { name: 'Drain',        effect: "Permanently steal 10% of the attacker's SPD each time this card is hit." },
  { name: 'Glass Cannon', effect: '+50% ATK, −50% DEF permanently.' },
  { name: 'Resilience',   effect: 'Reduce all incoming damage by 15%, minimum 1.' },
  { name: 'Lifesteal',    effect: 'Convert 30% of damage dealt into permanent ATK, capped at +40% base ATK.' },
  { name: 'Fortify',      effect: 'Gain +25% DEF for each round this card does not attack, up to +75%.' },
  { name: 'Bloodrage',    effect: 'Gain +10% ATK each time this card takes a hit this battle, up to +50%.' },
  { name: 'Spellbreak',   effect: 'Immune to all ability and passive effects from enemy cards.' },
  { name: 'Phantom Step', effect: "50% chance to evade any attack if this card's SPD exceeds the attacker's ATK." },
  { name: 'Steadfast',    effect: 'SPD and DEF cannot be reduced by any effect.' },
  { name: 'Shatter',      effect: "Critical hits permanently reduce the target's DEF by 20." },
  { name: 'Vampiric',     effect: 'All allies gain +10% ATK at the start of each round, capped at +30%.' },
  { name: 'Execute',      effect: "Deal 3× damage to any card with ATK lower than this card's SPD." },
  { name: 'Overclock',    effect: 'SPD increases by 10% each round, capped at +50%.' },
  { name: 'Eternal Guard',effect: 'This card cannot be targeted by debuffs or status effects.' },
  { name: 'Leech',        effect: 'Permanently steal 20 ATK from the opponent each round.' },
  { name: 'Phase',        effect: 'Once per battle, the next attack against this card misses entirely.' },
  { name: 'Rampage',      effect: "Each kill permanently increases this card's ATK by 50." },
  { name: 'Bulwark',      effect: 'Absorb the first enemy ability used this battle — it has no effect.' },
];
