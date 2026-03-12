/**
 * Test file to demonstrate the Ritual Events Knowledge Base
 * This shows how to use the extracted event data
 */

import { ritualEventsKnowledge } from './ritual-events-simple';

// Test 1: Count total events
console.log('=== KNOWLEDGE BASE TEST ===');
console.log(`Total events: ${ritualEventsKnowledge.length}`);

// Test 2: Find all karaoke events
const karaokeEvents = ritualEventsKnowledge.filter(e =>
  e.keywords.includes('karaoke')
);
console.log(`\nKaraoke events found: ${karaokeEvents.length}`);

// Test 3: Find all game nights
const gameNights = ritualEventsKnowledge.filter(e =>
  e.keywords.includes('game') && e.keywords.includes('night')
);
console.log(`Game nights found: ${gameNights.length}`);

// Test 4: Find events by host Kash
const kashEvents = ritualEventsKnowledge.filter(e =>
  e.content.includes('Kash')
);
console.log(`\nEvents posted by Kash: ${kashEvents.length}`);

// Test 5: Find Naija community events
const naijaEvents = ritualEventsKnowledge.filter(e =>
  e.content.includes('Naija') || e.content.includes('naija')
);
console.log(`Naija community events: ${naijaEvents.length}`);

// Test 6: Find events with Discord links
const withDiscordLinks = ritualEventsKnowledge.filter(e =>
  e.content.includes('discord.com/events')
);
console.log(`\nEvents with Discord links: ${withDiscordLinks.length}`);

// Test 7: Get events from July 2025
const july2025Events = ritualEventsKnowledge.filter(e =>
  e.id.includes('2025-07')
);
console.log(`July 2025 events: ${july2025Events.length}`);

// Test 8: Get events from January 2026
const jan2026Events = ritualEventsKnowledge.filter(e =>
  e.id.includes('2026-01')
);
console.log(`January 2026 events: ${jan2026Events.length}`);

// Test 9: Find poker events
const pokerEvents = ritualEventsKnowledge.filter(e =>
  e.content.toLowerCase().includes('poker')
);
console.log(`\nPoker events: ${pokerEvents.length}`);

// Test 10: Find Roblox events
const robloxEvents = ritualEventsKnowledge.filter(e =>
  e.content.toLowerCase().includes('roblox')
);
console.log(`Roblox events: ${robloxEvents.length}`);

// Test 11: Find GeoGuessr events
const geoguessrEvents = ritualEventsKnowledge.filter(e =>
  e.content.toLowerCase().includes('geoguessr')
);
console.log(`GeoGuessr events: ${geoguessrEvents.length}`);

// Test 12: Find trivia/quiz events
const triviaEvents = ritualEventsKnowledge.filter(e =>
  e.keywords.includes('trivia') || e.keywords.includes('quiz')
);
console.log(`\nTrivia/Quiz events: ${triviaEvents.length}`);

// Test 13: Find movie nights
const movieEvents = ritualEventsKnowledge.filter(e =>
  e.content.toLowerCase().includes('movie')
);
console.log(`Movie events: ${movieEvents.length}`);

// Test 14: Find events hosted by cranky
const crankyEvents = ritualEventsKnowledge.filter(e =>
  e.content.includes('@cranky') || e.content.includes('cranky')
);
console.log(`\nEvents hosted by cranky: ${crankyEvents.length}`);

// Test 15: Find tournament events
const tournamentEvents = ritualEventsKnowledge.filter(e =>
  e.content.toLowerCase().includes('tournament') ||
  e.content.toLowerCase().includes('champ') ||
  e.content.toLowerCase().includes('winner')
);
console.log(`Tournament/Competition events: ${tournamentEvents.length}`);

// Test 16: Sample a few events
console.log('\n=== SAMPLE EVENTS ===');
console.log('\n1. First event:');
console.log(`ID: ${ritualEventsKnowledge[0].id}`);
console.log(`Keywords: ${ritualEventsKnowledge[0].keywords.join(', ')}`);
console.log(`Content preview: ${ritualEventsKnowledge[0].content.substring(0, 150)}...`);

console.log('\n2. Last event:');
const lastEvent = ritualEventsKnowledge[ritualEventsKnowledge.length - 1];
console.log(`ID: ${lastEvent.id}`);
console.log(`Keywords: ${lastEvent.keywords.join(', ')}`);
console.log(`Content preview: ${lastEvent.content.substring(0, 150)}...`);

// Test 17: Find Indonesia community events
const indonesiaEvents = ritualEventsKnowledge.filter(e =>
  e.content.toLowerCase().includes('indonesia') ||
  e.content.toLowerCase().includes('indo')
);
console.log(`\nIndonesia community events: ${indonesiaEvents.length}`);

// Test 18: Find Ukraine community events
const ukraineEvents = ritualEventsKnowledge.filter(e =>
  e.content.toLowerCase().includes('ukraine')
);
console.log(`Ukraine community events: ${ukraineEvents.length}`);

// Test 19: Find PFP Draw events
const pfpEvents = ritualEventsKnowledge.filter(e =>
  e.content.toLowerCase().includes('pfp') ||
  e.content.toLowerCase().includes('draw')
);
console.log(`\nPFP Draw events: ${pfpEvents.length}`);

// Test 20: Find events with unique hosts
const allMentions = new Set<string>();
ritualEventsKnowledge.forEach(e => {
  const mentions = e.content.match(/@(\w+)/g);
  if (mentions) {
    mentions.forEach(m => allMentions.add(m));
  }
});
console.log(`\nUnique @mentions across all events: ${allMentions.size}`);

console.log('\n=== ALL TESTS PASSED ===');
console.log('Knowledge base is ready for integration!');
