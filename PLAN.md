# SIGGY BOT - DEVELOPMENT PLAN

## ✅ COMPLETED

### Phase 1: Crypto Basic Features
- [x] `/price <coin>` - Check cryptocurrency price
- [x] `/trending` - Top gainers/losers 24h
- [x] `/chart <coin>` - TradingView-style chart (WIP - needs deployment)
- [x] Website API endpoints for crypto
- [x] Chat auto-detect crypto queries

---

## 🚧 IN PROGRESS

### Chart Generator
- [ ] Fix 15m timeframe candlestick rendering
- [ ] Deploy to Render Singapore (Binance API will work)
- [ ] Test with production deployment

---

## 📋 PENDING FEATURES

### Phase 2: Custom Leaderboard System

**Commands:**
```
/leaderboard create <name>          - Create new leaderboard
/leaderboard add <event> <user> <score>   - Add participant
/leaderboard update <event> <user> <score> - Update score
/leaderboard remove <event> <user>  - Remove participant
/leaderboard show <event>           - Display leaderboard
/leaderboard list                   - List all leaderboards
/leaderboard delete <event>         - Delete leaderboard
```

**Files to create:**
- `discord-bot/utils/leaderboard-db.cjs` - Leaderboard persistence
- `discord-bot/commands/leaderboard.cjs` - Command handlers

**Data structure:**
```json
{
  "leaderboards": {
    "gaming_tournament_001": {
      "name": "Gaming Tournament",
      "created_at": "2025-03-28",
      "participants": {
        "user_id_123": {
          "name": "PlayerOne",
          "score": 100
        }
      }
    }
  }
}
```

---

### Phase 3: Advanced Crypto Features

**Commands:**
```
/watchlist add <coin>              - Add to personal watchlist
/watchlist remove <coin>           - Remove from watchlist
/watchlist                          - Show your watchlist
/alert <coin> <price>               - Set price alert
/alert list                         - Show active alerts
/alert cancel <id>                  - Cancel alert
```

**Background:** Check alerts every 5 minutes, notify when triggered

---

### Phase 4: Economy/Gambling System

**Commands:**
```
/daily                               - Claim daily points
/balance [@user]                     - Check points
/flip <amount>                       - Coin flip (2x)
/slots <amount>                      - Slot machine
/give @user <amount>                 - Transfer points
/leaderboard points                  - Points leaderboard
/shop                                - Buy items/roles
```

**Point system:**
- +1 point per message
- +10 points daily claim
- Gambling multipliers

---

### Phase 5: Utility Commands

```
/reminder <time> <message>           - Set reminder
/weather <city>                      - Weather info
/translate <text> <lang>             - Translation
/define <word>                       - Dictionary
/meme                                - Random meme
/8ball <question>                    - Magic 8-ball
/choose <option1> | <option2>        - Random choice
```

---

### Phase 6: Fun & Social

```
/hug @user                           - Hug someone
/slap @user                          - Slap someone
/ship @user1 @user2                  - Ship two users
/rate @user                          - Rate someone
/avatar [@user]                      - Get avatar
/serverinfo                          - Server info
/whois @user                         - User info
```

---

### Phase 7: Admin & Moderation

```
/purge <count>                       - Delete messages
/kick @user [reason]                 - Kick user
/ban @user [reason]                  - Ban user
/mute @user [duration]               - Mute user
/warn @user <reason>                 - Warn user
/warnings @user                      - View warnings
/lock                                - Lock channel
/unlock                              - Unlock channel
```

---

### Phase 8: Leveling System

```
/rank [@user]                        - Check rank
/levelup                             - Level up settings
/xp                                  - XP settings
/rewards add <level> <role>          - Add role reward
```

---

### Phase 9: Music (Optional)

```
/play <song>                         - Play music
/skip                                - Skip song
/queue                               - Show queue
/stop                                - Stop music
/volume <0-100>                      - Set volume
```

**Note:** Requires additional infrastructure

---

## 🔧 TECHNICAL DEBT

- [ ] Refactor command handlers into separate files
- [ ] Add proper error handling for all commands
- [ ] Implement rate limiting per command type
- [ ] Add command cooldowns
- [ ] Optimize database queries
- [ ] Add command permissions system
- [ ] Create admin dashboard

---

## 📊 PRIORITY ORDER

1. **High Priority:** Leaderboard System (Phase 2)
2. **Medium Priority:** Watchlist/Alerts (Phase 3), Economy (Phase 4)
3. **Low Priority:** Fun commands, Admin tools
4. **Optional:** Music system

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Fix chart 15m timeframe
- [ ] Test all commands locally
- [ ] Deploy to Render (Singapore region)
- [ ] Verify crypto APIs work in production
- [ ] Set up monitoring/logging
- [ ] Update documentation
