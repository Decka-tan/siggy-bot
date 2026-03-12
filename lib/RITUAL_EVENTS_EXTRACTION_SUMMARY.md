# Ritual Discord Events - Complete Extraction Summary

## Overview
Successfully extracted **803 unique event entries** from the Ritual Discord server's complete event history spanning July 2025 through March 2026.

## File Information
- **Source File**: `C:\Codingers\ALL EVENT\ALL_EVENTS_COMPLETE.txt` (25,547 lines)
- **Output File**: `C:\Codingers\siggy-bot\nextjs-version\lib\ritual-events-complete-knowledge.ts`
- **Total Lines**: 6,441 lines of TypeScript code
- **File Size**: ~500KB

## Statistics

### Event Coverage
- **Total Events Extracted**: 803
- **Discord Event Links**: 714
- **Total @mentions**: 4,937
- **Unique Hosts/Members**: 654
- **Date Range**: July 2025 - March 2026

### Event Types Found
- **Game Nights**: 1,236 mentions
- **General Night Events**: 669 mentions
- **Tournaments**: 117
- **Trivia Events**: 62
- **Quiz Events**: 425
- **Karaoke Nights**: 199
- **Movie Nights**: 114
- **Poker Games**: 174
- **Roblox Events**: 198
- **GeoGuessr Sessions**: 69

## Event Categories

### 1. Recurring Weekly Events
- **Pure Madness Tuesdays** - PFP making, games, quizzes
- **GeoGuessr Tuesdays** - Geography guessing game
- **Tetris Tuesdays** - Competitive Tetris
- **Music Madness** - 5-second song challenges
- **Roblox Nights** - Various Roblox games
- **Poker Nights** - Texas Hold'em tournaments

### 2. Community Events
- **Karaoke Nights** (Multiple language editions: Naija, Indonesia, etc.)
- **Movie Nights** (Community-specific: Ukraine, Naija, Indonesia)
- **Trivia/Quiz Nights**
- **Art/PFP Drawing Sessions**
- **Game Nights** (Various platforms)

### 3. Special Events
- **Tournaments** (Poker, gaming competitions)
- **Holiday Events**
- **Community Milestones**
- **Guess the Ritualist** games
- **Scavenger Hunts**

## Knowledge Base Structure

Each entry contains:
```typescript
{
  id: 'ritual-event-YYYY-MM-DD-eventname-host',
  category: 'events',
  keywords: ['event', 'ritual', 'discord', ...],  // Auto-generated based on content
  content: "Complete event details with dates, times, hosts, links, rules...",
  priority: 8,
  source: 'ritual-discord-events-complete'
}
```

## Sample Entries

### Example 1: Pure Madness Event
```typescript
{
  id: "ritual-event-2025-07-15-pure-madness-chaos-creativity-Events",
  category: "events",
  keywords: ["event", "ritual", "discord", "game", "night", "trivia", "quiz"],
  content: "🌀 PURE MADNESS: Chaos, Creativity & Comic Nerd Battles! 🎨🦸‍♂️🧠
  Hosted by: Oscar Draws and Pure Soul
  Discord Event: https://discord.com/events/1210468736205852672/1393612705440596039
  Ritual community PFPs making, fun games, quizes, vibes and special guests every Tuesday!",
  priority: 8,
  source: "ritual-discord-events-complete"
}
```

### Example 2: GeoGuessr Night
```typescript
{
  id: "ritual-event-2025-07-15-so-pack-your-virtual-bags-zoo-Events",
  category: "events",
  keywords: ["event", "ritual", "discord", "night"],
  content: "Join us for GeoGuessr Night, where we drop you somewhere random on the planet...
  Time: Every Tuesday, 1PM UTC
  Hosted by: @cranky
  Discord Event: https://discord.com/events/1210468736205852672/1392450590851989554",
  priority: 8,
  source: "ritual-discord-events-complete"
}
```

### Example 3: Naija Community Karaoke
```typescript
{
  id: "ritual-event-2026-08-03-ritual-karaoke-night-naija-ed-Oluwasegun",
  category: "events",
  keywords: ["event", "ritual", "discord", "night", "karaoke"],
  content: "🎤 RITUAL KARAOKE NIGHT NAIJA EDITION 🇳🇬
  Hosts: @Oluwasegun (❖,❖) @Browny 🧸 (❖,❖)
  Location: voice naija
  Come drop your Burna Boy growl, your Ayra Starr softness...",
  priority: 8,
  source: "ritual-discord-events-complete"
}
```

## Notable Hosts & Organizers

### Regular Hosts
- **Kash** - NPC LEADER [GRIT], Ritualist
- **Pure Soul** - Quiz master
- **Oscar Draws** - Art events
- **Cranky** - GeoGuessr host
- **Augustine** - Music Madness host
- **Keybi** - Roblox Host

### Community Hosts
- **Naija Community**: @Oluwasegun, @Browny, @ZUMA
- **Indonesia Community**: @MondJazz, @Senjuro
- **Ukraine Community**: @Liora
- And 650+ other unique hosts

## Geographic/Community Sections
- **Naija Community** (Nigeria) - Karaoke, Movie Nights
- **Indonesia Community** - Game Nights, Stumble Guys battles
- **Ukraine Community** - Cinema Nights
- **Latin American Community** - Various events
- **Global/English** - Main events

## Discord Server Details
- **Server**: Ritual Discord
- **Event Channel**: @Events
- **Voice Channels**: Multiple (by community)
- **Event System**: Discord native events with links

## Usage in Siggy Bot

This knowledge base can be imported and used for:
- Answering questions about past events
- Providing event schedules
- Identifying event hosts
- Finding event rules and formats
- Locating Discord event links
- Understanding community event patterns

```typescript
import { ritualEventsKnowledge } from './lib/ritual-events-complete-knowledge';

// Search for events
const gameNights = ritualEventsKnowledge.filter(e =>
  e.keywords.includes('game') && e.keywords.includes('night')
);

// Find by host
const crankyEvents = ritualEventsKnowledge.filter(e =>
  e.content.includes('@cranky')
);

// Get recent events
const recentEvents = ritualEventsKnowledge
  .filter(e => e.id.startsWith('ritual-event-2026'))
  .sort((a, b) => b.id.localeCompare(a.id));
```

## Data Quality Notes

### Strengths
- ✅ Comprehensive coverage (803 events)
- ✅ Full event details extracted
- ✅ Discord event links preserved
- ✅ Host mentions captured
- ✅ Date/time information included
- ✅ Community-specific events tagged
- ✅ Game/platform links included

### Limitations
- Content truncated to 1,500 characters per entry for file size
- Some events may have incomplete information if original announcement was brief
- Dates normalized but format varies in original
- Some @mentions may be bots or roles

## Future Enhancements
- Add event categorization by type
- Extract and structure win/loss records
- Parse recurring event schedules
- Build event calendar view
- Add search by date range functionality
- Create event analytics dashboard

---

**Generated**: March 12, 2026
**Total Processing Time**: ~2 minutes
**Extraction Method**: Python script with regex parsing
**Output Format**: TypeScript KnowledgeEntry[] array
