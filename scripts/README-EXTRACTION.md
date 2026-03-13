# Discord Event Extraction Script

## What it does

This script properly extracts data from raw Discord event message dumps and generates accurate knowledge base entries for Siggy bot.

**Features:**
- ✅ Extracts event types (Smash Karts, Tetris, Rebus Puzzle, etc.)
- ✅ Finds schedules (Every Tuesday 3PM UTC, etc.)
- ✅ Identifies hosts and co-hosts
- ✅ Extracts winners from all rounds
- ✅ Counts total wins per person
- ✅ Generates proper knowledge base entries
- ✅ Handles multiple file formats and patterns

## Problem it solves

The previous grep-based extraction was **missing data**:
- Lina has MANY Smash Karts wins but wasn't being counted
- People with 10-20 wins were completely invisible
- Schedule information wasn't being captured properly

## How to use

### Option 1: Run with batch file (Windows)
```
extract-events.bat
```

### Option 2: Run with npm
```
npm run extract:events
```

### Option 3: Run directly with tsx
```
npx tsx scripts/extract-discord-events.ts
```

## What it outputs

1. **Console output:**
   - Total events extracted
   - Top 20 winners with breakdown by event type
   - Top 10 hosts
   - Event schedules found

2. **File output:** `ALL EVENT/extracted-knowledge.txt`
   - Ready-to-use knowledge base entries
   - In the correct format for `ritual-stats-knowledge.ts`

## Event patterns it recognizes

- **SMASHKART** - Smash Karts tournaments
- **TETRIS** - Tetris competitions
- **REBUS PUZZLE** - Rebus puzzle events
- **GEOGUESSR** - GeoGuessr games
- **MUSIC MADNESS** - Music trivia games
- **BATTLESHIP** - Battleship wars
- **CODENAME** - Codename strategy games

## Winner patterns it recognizes

- "WINNER:" or "CHAMP:" prefixes
- "1st", "2nd", "3rd" positions
- Numbered lists (1., 2., 3.)
- Round indicators (Round 1, Round 2, etc.)
- Emoji indicators (🥇, 🥈, 🥉)

## Schedule patterns it recognizes

- "Every Tuesday", "Every Thursday", etc.
- "at 3PM UTC", "at 4:30PM UTC"
- "Time:" and "When:" prefixes

## Next steps after extraction

1. Run the script
2. Check `extracted-knowledge.txt` for the generated entries
3. Copy the entries into `lib/ritual-stats-knowledge.ts`
4. Restart the dev server
5. Test with questions like:
   - "How many times has Lina won in Smash Karts?"
   - "What events does linhlambo host?"
   - "When is the Smash Karts event?"

## Troubleshooting

**No events extracted:**
- Check the file path in the script
- Make sure the Discord data is in `D:\Codingers\double agent\ALL EVENT\`

**Wrong winners counted:**
- The regex might need adjustment for your specific Discord format
- Check the console output to see what's being matched

**Missing schedules:**
- Schedule info might be in a different format
- Check the raw Discord messages for the exact wording
