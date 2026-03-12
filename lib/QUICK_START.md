# Ritual Events Knowledge Base - Quick Start Guide

## 🚀 Getting Started

### Import the Knowledge Base
```typescript
import { ritualEventsKnowledge, KnowledgeEntry } from './lib/ritual-events-complete-knowledge';
```

### Basic Usage Examples

#### 1. Count Total Events
```typescript
console.log(`Total events: ${ritualEventsKnowledge.length}`);
// Output: Total events: 803
```

#### 2. Find All Game Nights
```typescript
const gameNights = ritualEventsKnowledge.filter(e =>
  e.keywords.includes('game') && e.keywords.includes('night')
);
console.log(`Game nights: ${gameNights.length}`);
```

#### 3. Find Events by Host
```typescript
const crankyEvents = ritualEventsKnowledge.filter(e =>
  e.content.includes('@cranky')
);
```

#### 4. Get Events from Specific Month
```typescript
const july2025 = ritualEventsKnowledge.filter(e =>
  e.id.includes('2025-07')
);
```

#### 5. Find Karaoke Events
```typescript
const karaoke = ritualEventsKnowledge.filter(e =>
  e.keywords.includes('karaoke')
);
```

#### 6. Find Naija Community Events
```typescript
const naijaEvents = ritualEventsKnowledge.filter(e =>
  e.content.toLowerCase().includes('naija')
);
```

#### 7. Find Events with Discord Links
```typescript
const withLinks = ritualEventsKnowledge.filter(e =>
  e.content.includes('discord.com/events')
);
```

#### 8. Find Tournament Events
```typescript
const tournaments = ritualEventsKnowledge.filter(e =>
  e.content.toLowerCase().includes('tournament') ||
  e.content.toLowerCase().includes('champ')
);
```

#### 9. Search by Keyword
```typescript
const triviaEvents = ritualEventsKnowledge.filter(e =>
  e.keywords.includes('trivia')
);
```

#### 10. Get Recent Events
```typescript
const recentEvents = ritualEventsKnowledge
  .filter(e => e.id.startsWith('ritual-event-2026'))
  .sort((a, b) => b.id.localeCompare(a.id));
```

## 📊 Knowledge Entry Structure

```typescript
interface KnowledgeEntry {
  id: string;           // Unique ID: ritual-event-YYYY-MM-DD-eventname-host
  category: string;     // Always "events"
  keywords: string[];   // Auto-generated tags: ["event", "ritual", "discord", ...]
  content: string;      // Full event description (up to 1,500 chars)
  priority: number;     // Always 8 (high importance)
  source: string;       // Always "ritual-discord-events-complete"
}
```

## 🎯 Common Queries

### Find All Event Types
```typescript
const eventTypes = new Set();
ritualEventsKnowledge.forEach(e => {
  e.keywords.forEach(k => eventTypes.add(k));
});
console.log(Array.from(eventTypes));
```

### Get Events by Community
```typescript
const communities = {
  naija: ritualEventsKnowledge.filter(e => e.content.toLowerCase().includes('naija')),
  indonesia: ritualEventsKnowledge.filter(e => e.content.toLowerCase().includes('indonesia')),
  ukraine: ritualEventsKnowledge.filter(e => e.content.toLowerCase().includes('ukraine')),
};
```

### Find Events with Specific Host
```typescript
function findByHost(hostName: string) {
  return ritualEventsKnowledge.filter(e =>
    e.content.toLowerCase().includes(hostName.toLowerCase())
  );
}

// Usage
const kashEvents = findByHost('Kash');
const zellaEvents = findByHost('ZELLA');
```

### Get Events from Date Range
```typescript
function getEventsFromRange(startMonth: string, endMonth: string) {
  return ritualEventsKnowledge.filter(e => {
    const date = e.id.match(/ritual-event-(\d{4}-\d{2})/)?.[1];
    return date && date >= startMonth && date <= endMonth;
  });
}

// Usage
const q42025 = getEventsFromRange('2025-10', '2025-12');
```

## 🔍 Advanced Search

### Multi-Filter Search
```typescript
function searchEvents(filters: {
  keywords?: string[];
  host?: string;
  community?: string;
  startDate?: string;
  endDate?: string;
}) {
  return ritualEventsKnowledge.filter(e => {
    if (filters.keywords && !filters.keywords.some(k => e.keywords.includes(k))) {
      return false;
    }
    if (filters.host && !e.content.toLowerCase().includes(filters.host.toLowerCase())) {
      return false;
    }
    if (filters.community && !e.content.toLowerCase().includes(filters.community.toLowerCase())) {
      return false;
    }
    if (filters.startDate && !e.id.startsWith(`ritual-event-${filters.startDate}`)) {
      return false;
    }
    return true;
  });
}

// Usage
const results = searchEvents({
  keywords: ['game', 'night'],
  community: 'naija',
  startDate: '2025-12'
});
```

### Full-Text Search
```typescript
function searchContent(query: string) {
  const lowerQuery = query.toLowerCase();
  return ritualEventsKnowledge.filter(e =>
    e.content.toLowerCase().includes(lowerQuery) ||
    e.id.toLowerCase().includes(lowerQuery)
  );
}

// Usage
const pokerResults = searchContent('poker');
const karaokeResults = searchContent('karaoke');
```

## 📈 Analytics

### Event Statistics
```typescript
const stats = {
  total: ritualEventsKnowledge.length,
  byKeyword: {},
  byMonth: {},
  byCommunity: {}
};

ritualEventsKnowledge.forEach(e => {
  // By keyword
  e.keywords.forEach(k => {
    stats.byKeyword[k] = (stats.byKeyword[k] || 0) + 1;
  });
  
  // By month
  const month = e.id.match(/ritual-event-(\d{4}-\d{2})/)?.[1];
  if (month) {
    stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
  }
  
  // By community
  if (e.content.toLowerCase().includes('naija')) {
    stats.byCommunity.naija = (stats.byCommunity.naija || 0) + 1;
  }
  if (e.content.toLowerCase().includes('indonesia')) {
    stats.byCommunity.indonesia = (stats.byCommunity.indonesia || 0) + 1;
  }
});

console.table(stats);
```

## 🎨 Sample Event Display

```typescript
function displayEvent(entry: KnowledgeEntry) {
  console.log(`\n📅 ${entry.id}`);
  console.log(`🏷️  Keywords: ${entry.keywords.join(', ')}`);
  console.log(`📝 Content:\n${entry.content.substring(0, 200)}...`);
}

// Display first event
displayEvent(ritualEventsKnowledge[0]);
```

## 💡 Tips

1. **Use keywords for broad searches** - They're auto-generated and consistent
2. **Use content for specific searches** - Contains full event details
3. **Parse ID for dates** - Format is `ritual-event-YYYY-MM-DD-...`
4. **Check for Discord links** - `content.includes('discord.com/events')`
5. **Community tags in content** - @Naija, @Indonesia, @Ukraine, etc.

## 📚 Related Files

- `ritual-events-complete-knowledge.ts` - Main knowledge base
- `RITUAL_EVENTS_EXTRACTION_SUMMARY.md` - Detailed documentation
- `FINAL_EXTRACTION_REPORT.md` - Complete extraction report
- `EXTRACTION_VERIFICATION.txt` - Verification metrics
- `test-knowledge-base.ts` - More examples

## 🆘 Troubleshooting

### Import Errors
```typescript
// Make sure to use correct path
import { ritualEventsKnowledge } from './lib/ritual-events-complete-knowledge';
```

### Type Errors
```typescript
// Import the interface if needed
import { ritualEventsKnowledge, KnowledgeEntry } from './lib/ritual-events-complete-knowledge';
```

### Empty Results
```typescript
// Check your search terms
console.log(`Total events: ${ritualEventsKnowledge.length}`);
console.log(`Keywords sample: ${ritualEventsKnowledge[0].keywords}`);
```

---

**Generated**: March 12, 2026
**Total Events**: 803
**Status**: Production Ready ✅
