# CURRENT ISSUES - FIX PLAN

## Issue 1: Feature Parity - Discord vs Website
**Problem:** When adding Discord bot commands, website doesn't get updated with UI/UX (command list, dropdown)

**Files to modify:**
- `app/chat/page.tsx` - Add new commands to `availableCommands` array
- Add proper dropdown handling for each new command type

**Fix:**
1. Audit all Discord commands vs website commands
2. Add missing commands to website `availableCommands` array
3. Add dropdown handlers for commands with options (like `/leaderboard`, `/gas`, etc.)
4. Ensure all commands return properly formatted responses

---

## Issue 2: Slash Command Highlight Inconsistency
**Problem:** `/check` and `/research` have yellow highlight when typing, but other slash commands don't

**Files to modify:**
- `app/chat/page.tsx` - Command highlight logic

**Fix:**
1. Find the highlight logic for `/check` and `/research`
2. Apply same logic to ALL slash commands
3. Currently checks: `input.toLowerCase().startsWith('/check') || input.toLowerCase().startsWith('/research')`
4. Change to: detect ANY command starting with `/`

---

## Issue 3: Chart Link Broken
**Problem:** `/chart btc` gives wrong link: `https://www.tradingview.com/chart/?symbol=BINANCE%3ABITCOINUSDT` (extra BTC)
**Should be:** `https://www.tradingview.com/chart/?symbol=BINANCE%3ABTCUSDT`

**Files to modify:**
- `app/api/chat/route.ts` - Chart command handler
- `discord-bot/commands/crypto.cjs` - Discord chart handler

**Fix:**
1. Check `getChartEmbed()` function - it's adding the coin name to the symbol
2. Should only use: `BINANCE:<TICKER>USDT` format without adding coin name

---

## Issue 4: Discord Slash Commands Not Appearing
**Problem:** Commands disappear even after clearing env var and redeploying

**Root cause:** Command registration may be failing or not persisting

**Files to check:**
- `discord-bot/vps-server.cjs` - Command registration
- `discord-bot/clear-commands.cjs` - Command clearing

**Fix:**
1. Check if `registerCommands()` is being called properly
2. Add debug logging to command registration
3. Ensure `CLIENT_ID` and `GUILD_ID` env vars are set
4. May need to manually call `/register` command

---

## EXECUTION ORDER (DO NOT PUSH UNTIL ALL DONE)
- [x] **Issue 3** - Fix chart link (quick fix) ✅ DONE
- [x] **Issue 2** - Fix slash command highlight (medium) ✅ DONE
- [x] **Issue 1** - Add missing website commands (biggest task) ✅ DONE
- [x] **Issue 4** - Debug Discord command registration ✅ DONE (added better error handling & logging)

## Test checklist before push:
- [x] Test `/chart btc` on website - link should be correct
- [x] Test all slash commands on website - should have yellow highlight
- [x] Test new commands (hug, slap, gas, rank, etc.) on website
- [x] Discord command registration improved with detailed logging

## Issue 4 Fix Details:
- Added detailed logging to registerCommands() function
- Added specific error messages for common issues (invalid token, missing access, etc.)
- Added configuration check on startup
- Improved clear-commands.cjs with better error messages
- Bot now logs command registration status clearly on startup
