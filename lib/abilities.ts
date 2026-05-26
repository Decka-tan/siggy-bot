export interface Ability {
  name:   string;
  effect: string;
}

export const ABILITIES: Record<string, Ability> = {
  builder:           { name: 'Forge',    effect: 'Next attack deals 2x damage' },
  yapper:            { name: 'Spam',     effect: 'Strike twice at 60% power' },
  threadoor:         { name: 'Thread',   effect: "All allies gain +30% ATK, 2 turns" },
  moderator:         { name: 'Timeout',  effect: "Skip opponent's next turn" },
  artist:            { name: 'Illusion', effect: 'Take 50% less damage this turn' },
  'event-manager':   { name: 'Rally',    effect: "All allies gain +30% DEF, 2 turns" },
  'event-enjoyoor':  { name: 'Hype',     effect: 'Take an extra action this turn' },
  team:              { name: 'Protocol', effect: 'Next attack always crits' },
  ambassador:        { name: 'Envoy',    effect: "Enemy loses 25% ATK/SPD, 2 turns" },
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
    sr:  'At 0 DEF, revive with 30% DEF once.',
    ssr: 'At 0 DEF, revive with 40% DEF once.',
    ur:  'At 0 DEF, revive with 50% DEF once.',
  },
  {
    name: 'Regen',
    sr:  '+8% DEF each round, max +40%.',
    ssr: '+11% DEF each round, max +55%.',
    ur:  '+14% DEF each round, max +70%.',
  },
  {
    name: 'Thorns',
    sr:  'Attacker loses ATK equal to 20% damage.',
    ssr: 'Attacker loses ATK equal to 27% damage.',
    ur:  'Attacker loses ATK equal to 35% damage.',
  },
  {
    name: 'Momentum',
    sr:  '+8% ATK each round, max +40%.',
    ssr: '+11% ATK each round, max +55%.',
    ur:  '+14% ATK each round, max +70%.',
  },
  {
    name: 'Last Stand',
    sr:  'Survive lethal once, then +50% ATK.',
    ssr: 'Survive lethal once, then +65% ATK.',
    ur:  'Survive lethal once, then +80% ATK.',
  },
  {
    name: 'Aura',
    sr:  'All allies gain +15% DEF.',
    ssr: 'All allies gain +20% DEF.',
    ur:  'All allies gain +25% DEF.',
  },
  {
    name: 'Counter',
    sr:  'Counter for 40% incoming damage.',
    ssr: 'Counter for 52% incoming damage.',
    ur:  'Counter for 65% incoming damage.',
  },
  {
    name: 'Drain',
    sr:  "Steal 10% attacker's SPD when hit.",
    ssr: "Steal 14% attacker's SPD when hit.",
    ur:  "Steal 18% attacker's SPD when hit.",
  },
  {
    name: 'Glass Cannon',
    sr:  '+50% ATK, -50% DEF.',
    ssr: '+50% ATK, -50% DEF.',
    ur:  '+50% ATK, -50% DEF.',
  },
  {
    name: 'Resilience',
    sr:  'Reduce incoming damage by 15%.',
    ssr: 'Reduce incoming damage by 20%.',
    ur:  'Reduce incoming damage by 25%.',
  },
  {
    name: 'Lifesteal',
    sr:  'Gain ATK from 30% damage, max +40%.',
    ssr: 'Gain ATK from 38% damage, max +52%.',
    ur:  'Gain ATK from 46% damage, max +65%.',
  },
  {
    name: 'Fortify',
    sr:  '+25% DEF when not attacking, max +75%.',
    ssr: '+33% DEF when not attacking, max +100%.',
    ur:  '+40% DEF when not attacking, max +120%.',
  },
  {
    name: 'Bloodrage',
    sr:  '+10% ATK each hit taken, max +50%.',
    ssr: '+14% ATK each hit taken, max +70%.',
    ur:  '+18% ATK each hit taken, max +90%.',
  },
  {
    name: 'Spellbreak',
    sr:  'Immune to enemy abilities/passives.',
    ssr: 'Immune to enemy abilities/passives.',
    ur:  'Immune to enemy abilities/passives.',
  },
  {
    name: 'Phantom Step',
    sr:  '50% evade if SPD beats enemy ATK.',
    ssr: '62% evade if SPD beats enemy ATK.',
    ur:  '75% evade if SPD beats enemy ATK.',
  },
  {
    name: 'Steadfast',
    sr:  'SPD and DEF cannot be reduced.',
    ssr: 'SPD and DEF cannot be reduced.',
    ur:  'SPD and DEF cannot be reduced.',
  },
  {
    name: 'Shatter',
    sr:  'Critical hits reduce DEF by 20.',
    ssr: 'Critical hits reduce DEF by 28.',
    ur:  'Critical hits reduce DEF by 36.',
  },
  {
    name: 'Vampiric',
    sr:  'All allies gain +10% ATK, max +30%.',
    ssr: 'All allies gain +13% ATK, max +40%.',
    ur:  'All allies gain +16% ATK, max +50%.',
  },
  {
    name: 'Execute',
    sr:  'Deal 3x damage if SPD beats enemy ATK.',
    ssr: 'Deal 3.5x damage if SPD beats enemy ATK.',
    ur:  'Deal 4x damage if SPD beats enemy ATK.',
  },
  {
    name: 'Overclock',
    sr:  '+10% SPD each round, max +50%.',
    ssr: '+14% SPD each round, max +70%.',
    ur:  '+18% SPD each round, max +90%.',
  },
  {
    name: 'Eternal Guard',
    sr:  'Cannot be debuffed or statused.',
    ssr: 'Cannot be debuffed or statused.',
    ur:  'Cannot be debuffed or statused.',
  },
  {
    name: 'Leech',
    sr:  'Steal 20 ATK each round.',
    ssr: 'Steal 27 ATK each round.',
    ur:  'Steal 35 ATK each round.',
  },
  {
    name: 'Phase',
    sr:  'Next attack misses once per battle.',
    ssr: 'Next attack misses once per battle.',
    ur:  'Next attack misses once per battle.',
  },
  {
    name: 'Rampage',
    sr:  '+50 ATK after each kill.',
    ssr: '+68 ATK after each kill.',
    ur:  '+85 ATK after each kill.',
  },
  {
    name: 'Bulwark',
    sr:  'Cancel first enemy ability.',
    ssr: 'Cancel first enemy ability.',
    ur:  'Cancel first enemy ability.',
  },
];
