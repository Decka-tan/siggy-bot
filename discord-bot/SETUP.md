# 🐱 Siggy Discord Bot Setup Guide

Complete guide to integrate Siggy into your Discord server with mood sprites, contributor analysis, and web research.

## 📋 Prerequisites

- Node.js 20.x
- A Discord server (where you want to add Siggy)
- Your Vercel app URL (siggy-bot.vercel.app)

---

## 🚀 Step 1: Create Discord Application

### 1. Go to Discord Developer Portal
1. Visit [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Name it: **"Siggy - Multiversal Cat Girl"**
4. Click **"Create"**

### 2. Get Client ID & Create Bot
1. Go to **"Bot"** section (left sidebar)
2. Click **"Add Bot"** → **"Yes, do it!"**
3. Under **"Privileged Gateway Intents"**, enable:
   - ✅ **Presence Intent**
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
4. Click **"Save Changes"**
5. Copy **"Client ID"** (from General Information) → Save this!
6. Click **"Reset Token"** under **"Token"** → Copy this token!

**Save these values:**
```
DISCORD_CLIENT_ID = your_client_id_here
DISCORD_BOT_TOKEN = your_bot_token_here
```

### 3. Get Server (Guild) ID
1. Enable Discord Developer Mode:
   - User Settings → Advanced → **Developer Mode** (ON)
2. Right-click your server → **"Copy ID"**
3. Save this as `DISCORD_GUILD_ID`

---

## 🔐 Step 2: Configure Bot Permissions

### Create Invite Link with Required Permissions

Use this URL (replace `YOUR_CLIENT_ID`):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147502080&scope=bot%20applications.commands
```

### Permissions Explained:
| Permission | Value | Purpose |
|------------|-------|---------|
| Read Messages/View Channels | 0x400 | Read channel messages |
| Send Messages | 0x2000 | Reply to users |
| Embed Links | 0x4000 | Show embeds with sprites |
| Attach Files | 0x8000 | Send sprite images |
| Read Message History | 0x10000 | Context awareness |
| Add Reactions | 0x40 | React with emojis |
| Use Slash Commands | 0x8000000000 | /check, /research commands |

### Add Bot to Server:
1. Paste the URL above in browser
2. Select your server
3. Click **"Authorize"**
4. Complete the captcha

---

## 📦 Step 3: Install & Run Bot

### 1. Install Dependencies
```bash
cd discord-bot
npm install
```

### 2. Create Environment File
```bash
cp .env.example .env
```

Edit `.env`:
```env
DISCORD_BOT_TOKEN=mtk_your_actual_bot_token_here
DISCORD_CLIENT_ID=your_actual_client_id_here
DISCORD_GUILD_ID=your_server_id_here

API_BASE_URL=https://siggy-bot.vercel.app
OPENAI_API_KEY=sk-your-openai-key-here
```

### 3. Start the Bot
```bash
npm start
```

You should see:
```
✅ Logged in as Siggy#1234
Successfully registered commands to guild.
```

---

## 🎨 Step 4: Customize for Your Server

### Restrict to Specific Channels (Optional)

Add to `.env`:
```env
ALLOWED_CHANNELS=channel_id_1,channel_id_2
```

To get channel IDs:
1. Enable Developer Mode
2. Right-click channel → Copy ID

### Change Bot Activity Status

Edit `index.js` line ~289:
```javascript
// Current
client.user.setActivity('/help | @ me to chat', { type: 0 });

// Examples:
client.user.setActivity('Summoning souls...', { type: 0 });        // Playing
client.user.setActivity('with the Ritual Forge', { type: 1 });   // Watching
client.user.setActivity('at the cosmic void', { type: 3 });       // Listening
```

---

## 🎯 Features Overview

### Chat with Siggy
- Just `@Siggy` or type `siggy` then your message
- Mood-based responses with sprites
- Conversation memory

### /check Command
```
/check @decka_tan
```
Shows:
- Global Messages count
- Contributions count
- Events participations
- Discord Roles
- AI-powered archetype analysis

### /research Command
```
/research Bittensor price
```
- Web search with Exa.ai
- Cited sources
- Real-time information

---

## 🖼️ Mood System & Sprites

The bot automatically detects Siggy's mood from responses and displays the appropriate sprite:

| Mood | Color | Cat Sprite | Girl Sprite |
|------|-------|------------|-------------|
| DEFAULT | Blue | siggy-cat-default.png | siggy-girl-default.png |
| HAPPY | Orange | siggy-cat-happy.png | siggy-girl-happy.png |
| SAD | Cyan | siggy-cat-sad.png | siggy-girl-sad.png |
| SHOCK | Orange | siggy-cat-shock.png | siggy-girl-shock.png |
| SHY | Pink | siggy-cat-shy.png | siggy-girl-shy.png |
| ANGRY | Red | siggy-cat-angry.png | siggy-girl-angry.png |

### Trigger Moods:
- **HAPPY**: Mention "purple", "anime", "cat"
- **SHY**: Mention "zealot"
- **SHOCK**: Mention data breaches, bad news
- **SAD**: Mention feeling down, missing home

---

## 🔧 Troubleshooting

### Bot doesn't respond
- Check bot is online
- Check bot has permission to read/send in the channel
- Check API_BASE_URL is correct

### Commands don't appear
- Commands may take up to 1 hour to register globally
- Use `DISCORD_GUILD_ID` for instant guild commands
- Re-run the bot after setting guild ID

### API errors
- Check OPENAI_API_KEY is valid
- Check API_BASE_URL is accessible
- Check Vercel app is deployed

### Sprites not showing
- Check sprite URLs are accessible
- Host sprites on your server if needed

---

## 🚀 Deployment Options

### Option 1: Run Locally
```bash
npm start
```

> **Entry point:** production runs `discord-bot/vps-server.cjs` (see the repo `Procfile`).
> `index.js` is an older, cut-down build kept for reference only — it is missing the
> Guild Members intent, so starting it silently breaks `/check` roles and join dates.
> Do not start `index.js`.

### Option 2: Run on VPS (Railway, Render, etc.)
```bash
# Install dependencies
npm install

# Start with PM2 (keeps bot running)
npm install -g pm2
pm2 start vps-server.cjs --name siggy-bot
pm2 save
pm2 startup
```

### Option 3: Docker (Coming Soon)
```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "vps-server.cjs"]
```

---

## 📊 Monitoring

### Enable Logging (Optional)
```bash
# Run with logging
node vps-server.cjs 2>&1 | tee siggy-bot.log
```

### Check Bot Stats
```javascript
// Add to index.js
client.on('ready', () => {
  console.log(`Servers: ${client.guilds.cache.size}`);
  console.log(`Users: ${client.users.cache.size}`);
});
```

---

## 🎮 Commands Quick Reference

| Command | Usage | Description |
|---------|-------|-------------|
| `/help` | /help | Show all commands |
| `/check` | /check @username | Analyze contributor |
| `/research` | /research query | Web search |
| Chat | @Siggy message | Talk to Siggy |

---

## 🏆 Next Steps

1. ✅ **Bot is running**
2. ✅ **Commands registered**
3. ✅ **Connected to Siggy API**

Now:
4. Test with `/check @decka_tan`
5. Test `/research Bittensor`
6. Chat with `@Siggy`
7. Customize sprites, moods, responses

---

## 💡 Tips

### Easter Eggs to Try:
- `@Siggy what's your real name?`
- `@Siggy I love purple!`
- `@Siggy tell me about the Zealot`
- `@Siggy glitch glitch glitch`

### For Ritual Community:
- `/check @kash_060` - See Event Manager analysis
- `/check @meison7554` - See Radiant Ritualist profile
- `/check @zealot` - Try it! 🎭

---

Built by **Decka-tan** for the Ritual Soul Forge Quest ✦
