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
  'event-enjoyoor':  { name: 'Hype',     effect: 'Boost all ally stats +10% for 2 turns' },
  team:              { name: 'Protocol', effect: 'Next attack is a guaranteed critical hit' },
  ambassador:        { name: 'Envoy',    effect: 'Raise all ally stats +15% for 2 turns' },
};
