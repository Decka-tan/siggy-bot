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
  name: string;
  sr:   string;
  ssr:  string;
  ur:   string;
}

export const PASSIVES: Passive[] = [
  {
    name: 'Rebirth',
    sr:  'When this card reaches 0 DEF, restore it to 30% base DEF once per battle.',
    ssr: 'When this card reaches 0 DEF, restore it to 40% base DEF once per battle.',
    ur:  'When this card reaches 0 DEF, restore it to 50% base DEF once per battle.',
  },
  {
    name: 'Regen',
    sr:  'Gain +8% DEF at the start of each round, up to +40% total.',
    ssr: 'Gain +11% DEF at the start of each round, up to +55% total.',
    ur:  'Gain +14% DEF at the start of each round, up to +70% total.',
  },
  {
    name: 'Thorns',
    sr:  'Attacker permanently loses ATK equal to 20% of damage dealt.',
    ssr: 'Attacker permanently loses ATK equal to 27% of damage dealt.',
    ur:  'Attacker permanently loses ATK equal to 35% of damage dealt.',
  },
  {
    name: 'Momentum',
    sr:  'Gain +8% ATK each round this card survives, up to +40%.',
    ssr: 'Gain +11% ATK each round this card survives, up to +55%.',
    ur:  'Gain +14% ATK each round this card survives, up to +70%.',
  },
  {
    name: 'Last Stand',
    sr:  'Survive one lethal hit per battle. Gain +50% ATK afterward.',
    ssr: 'Survive one lethal hit per battle. Gain +65% ATK afterward.',
    ur:  'Survive one lethal hit per battle. Gain +80% ATK afterward.',
  },
  {
    name: 'Aura',
    sr:  'All allies in play gain +15% DEF while this card is on the field.',
    ssr: 'All allies in play gain +20% DEF while this card is on the field.',
    ur:  'All allies in play gain +25% DEF while this card is on the field.',
  },
  {
    name: 'Counter',
    sr:  'Automatically strike back for 40% of incoming damage on every hit.',
    ssr: 'Automatically strike back for 52% of incoming damage on every hit.',
    ur:  'Automatically strike back for 65% of incoming damage on every hit.',
  },
  {
    name: 'Drain',
    sr:  "Permanently steal 10% of the attacker's SPD each time this card is hit.",
    ssr: "Permanently steal 14% of the attacker's SPD each time this card is hit.",
    ur:  "Permanently steal 18% of the attacker's SPD each time this card is hit.",
  },
  {
    name: 'Glass Cannon',
    sr:  '+50% ATK, −50% DEF permanently.',
    ssr: '+50% ATK, −50% DEF permanently.',
    ur:  '+50% ATK, −50% DEF permanently.',
  },
  {
    name: 'Resilience',
    sr:  'Reduce all incoming damage by 15%, minimum 1.',
    ssr: 'Reduce all incoming damage by 20%, minimum 1.',
    ur:  'Reduce all incoming damage by 25%, minimum 1.',
  },
  {
    name: 'Lifesteal',
    sr:  'Convert 30% of damage dealt into permanent ATK, capped at +40% base ATK.',
    ssr: 'Convert 38% of damage dealt into permanent ATK, capped at +52% base ATK.',
    ur:  'Convert 46% of damage dealt into permanent ATK, capped at +65% base ATK.',
  },
  {
    name: 'Fortify',
    sr:  'Gain +25% DEF for each round this card does not attack, up to +75%.',
    ssr: 'Gain +33% DEF for each round this card does not attack, up to +100%.',
    ur:  'Gain +40% DEF for each round this card does not attack, up to +120%.',
  },
  {
    name: 'Bloodrage',
    sr:  'Gain +10% ATK each time this card takes a hit this battle, up to +50%.',
    ssr: 'Gain +14% ATK each time this card takes a hit this battle, up to +70%.',
    ur:  'Gain +18% ATK each time this card takes a hit this battle, up to +90%.',
  },
  {
    name: 'Spellbreak',
    sr:  'Immune to all ability and passive effects from enemy cards.',
    ssr: 'Immune to all ability and passive effects from enemy cards.',
    ur:  'Immune to all ability and passive effects from enemy cards.',
  },
  {
    name: 'Phantom Step',
    sr:  "50% chance to evade any attack if this card's SPD exceeds the attacker's ATK.",
    ssr: "62% chance to evade any attack if this card's SPD exceeds the attacker's ATK.",
    ur:  "75% chance to evade any attack if this card's SPD exceeds the attacker's ATK.",
  },
  {
    name: 'Steadfast',
    sr:  'SPD and DEF cannot be reduced by any effect.',
    ssr: 'SPD and DEF cannot be reduced by any effect.',
    ur:  'SPD and DEF cannot be reduced by any effect.',
  },
  {
    name: 'Shatter',
    sr:  "Critical hits permanently reduce the target's DEF by 20.",
    ssr: "Critical hits permanently reduce the target's DEF by 28.",
    ur:  "Critical hits permanently reduce the target's DEF by 36.",
  },
  {
    name: 'Vampiric',
    sr:  'All allies gain +10% ATK at the start of each round, capped at +30%.',
    ssr: 'All allies gain +13% ATK at the start of each round, capped at +40%.',
    ur:  'All allies gain +16% ATK at the start of each round, capped at +50%.',
  },
  {
    name: 'Execute',
    sr:  "Deal 3× damage to any card with ATK lower than this card's SPD.",
    ssr: "Deal 3.5× damage to any card with ATK lower than this card's SPD.",
    ur:  "Deal 4× damage to any card with ATK lower than this card's SPD.",
  },
  {
    name: 'Overclock',
    sr:  'SPD increases by 10% each round, capped at +50%.',
    ssr: 'SPD increases by 14% each round, capped at +70%.',
    ur:  'SPD increases by 18% each round, capped at +90%.',
  },
  {
    name: 'Eternal Guard',
    sr:  'This card cannot be targeted by debuffs or status effects.',
    ssr: 'This card cannot be targeted by debuffs or status effects.',
    ur:  'This card cannot be targeted by debuffs or status effects.',
  },
  {
    name: 'Leech',
    sr:  'Permanently steal 20 ATK from the opponent each round.',
    ssr: 'Permanently steal 27 ATK from the opponent each round.',
    ur:  'Permanently steal 35 ATK from the opponent each round.',
  },
  {
    name: 'Phase',
    sr:  'Once per battle, the next attack against this card misses entirely.',
    ssr: 'Once per battle, the next attack against this card misses entirely.',
    ur:  'Once per battle, the next attack against this card misses entirely.',
  },
  {
    name: 'Rampage',
    sr:  "Each kill permanently increases this card's ATK by 50.",
    ssr: "Each kill permanently increases this card's ATK by 68.",
    ur:  "Each kill permanently increases this card's ATK by 85.",
  },
  {
    name: 'Bulwark',
    sr:  'Absorb the first enemy ability used this battle — it has no effect.',
    ssr: 'Absorb the first enemy ability used this battle — it has no effect.',
    ur:  'Absorb the first enemy ability used this battle — it has no effect.',
  },
];
