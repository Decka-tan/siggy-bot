# Deploy Siggy Discord Bot on Railway (Free 24/7)

## Prerequisites
- Railway account (https://railway.app)
- GitHub account

## Steps

### 1. Prepare Your Repo
```bash
git add .
git commit -m "chore: prepare for Railway deployment"
git push origin main
```

### 2. Deploy on Railway

1. Go to [https://railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `siggy-bot` repository
4. Railway will detect it as a Node.js project

### 3. Add Environment Variables

In Railway dashboard, go to **Variables** and add:

```
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here
OPENAI_API_KEY=your_openai_key_here
API_BASE_URL=https://siggy-bot.vercel.app
```

### 4. Start the Bot

Railway will automatically start the bot. Click **Logs** to see:
```
✅ Logged in as Siggy#1234
Successfully registered commands to guild.
```

### 5. Invite Bot to Server

Use this URL (replace CLIENT_ID):
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

## Commands
- `/check @username` - Analyze contributor
- `/research <query>` - Web search
- `/help` - Show help

## Tips
- Railway Free Tier: $5 credit/month (enough for small bot)
- Bot runs 24/7 as long as you have credits
- Check logs if bot doesn't respond
