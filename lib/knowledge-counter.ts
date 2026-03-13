/**
 * KNOWLEDGE COUNT UTILITY
 * Returns actual counts from knowledge files
 */

import { SIGGY_KNOWLEDGE } from './siggy-knowledge';
import { RITUAL_COMMUNITY_KNOWLEDGE } from './ritual-community-knowledge';
import { RITUAL_DISCORD_KNOWLEDGE } from './ritual-discord-knowledge';
import { RITUAL_WEB_KNOWLEDGE } from './ritual-web-knowledge';
import { MANUAL_KNOWLEDGE } from './manual-knowledge';

export interface KnowledgeCounts {
  lore: number;
  tech: number;
  community: number;
  events: number;
  total: number;
}

export function getKnowledgeCounts(): KnowledgeCounts {
  const lore = SIGGY_KNOWLEDGE.length;
  const tech = RITUAL_WEB_KNOWLEDGE.length;
  const community = RITUAL_COMMUNITY_KNOWLEDGE.length;
  const events = RITUAL_DISCORD_KNOWLEDGE.length;
  const total = lore + tech + community + events + MANUAL_KNOWLEDGE.length;

  return {
    lore,
    tech,
    community,
    events,
    total
  };
}

export function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}
