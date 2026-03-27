# 🐱 Siggy Discord Bot on Vercel - Setup Guide

Deploy Siggy Discord bot on Vercel (same as your website)!

---

## 📋 Prerequisites

- Vercel account (you already have it!)
- Discord Application created
- Node.js 20.x (local, for setup)

---

## 🚀 Step 1: Create Discord Application

### Go to Discord Developer Portal
1. Visit [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Name: **"Siggy - Discord Bot"**
4. Click **"Create"**

### Configure Bot
1. Go to **"Bot"** section → **"Add Bot"** → **"Yes, do it!"**
2. Enable **Privileged Gateway Intents**:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
3. Click **"Save Changes"**
4. **Copy Bot Token** → Save this as `DISCORD_BOT_TOKEN`
5. **Copy Client ID** (from General Information) → Save as `DISCORD_CLIENT_ID`
6. **Copy Public Key** (from General Information) → Save as `DISCORD_PUBLIC_KEY`

### Get Server ID (for testing)
1. Enable Developer Mode in Discord (User Settings → Advanced)
2. Right-click your server → Copy ID
3. Save as `DISCORD_GUILD_ID` (optional, for instant commands)

---

## 🔧 Step 2: Setup Environment Variables

### Add to your Vercel Project:

Go to: [https://vercel.com/your-project/settings/environment-variables](https://vercel.com/your-project/settings/environment-variables)

Add these variables:

| Name | Value | Environment |
|------|-------|--------------|
| `DISCORD_BOT_TOKEN` | `mtk_xxx...` (from Discord) | Production |
| `DISCORD_CLIENT_ID` | `your_client_id` | Production |
| `DISCORD_PUBLIC_KEY` | `your_public_key` | Production |
| `DISCORD_GUILD_ID` | `your_server_id` (optional) | Production |
| `OPENAI_API_KEY` | `sk-xxx` | Production |
| `EXA_API_KEY` | `your_exa_key` | Production |
| `DISCORD_USER_TOKEN` | `your_user_token` | Production |

**All set to "Production" environment!**

---

## 📦 Step 3: Install Dependencies

```bash
npm install discord-interactions
```

---

## 🎯 Step 4: Register Slash Commands

### Option A: Run script (easiest)
```bash
node scripts/register-discord-commands.js
```

### Option B: Manual (via Discord API)
Use curl or Postman to register commands.

---

## 🚀 Step 5: Deploy to Vercel

```bash
git add .
git commit -m "feat: add Discord bot integration"
git push origin main
```

Vercel will auto-deploy! ✅

---

## 🎮 Step 6: Set Up Discord Interaction Endpoint

### Go to Discord Developer Portal

1. Your Application → **"OAuth2"** → **"URL"**
2. Set **Interactions Endpoint URL**:
   ```
   https://siggy-bot.vercel.app/api/discord/interactions
   ```
3. Click **"Save Changes"**

### Verify
1. Go to **"OAuth2"** → **"General"**
2. Copy **"Installer URL"**
3. Replace `YOUR_CLIENT_ID` with your actual Client ID
4. Paste in browser to add bot to server

---

## ✅ Step 7: Test Your Bot!

### Test Commands
```
/check @decka_tan
/research Bittensor
/help
```

### Test Chat
- Type `@Siggy` followed by your message
- Or just `siggy <message>`

---

## 🔍 Troubleshooting

### Commands don't appear
- **Global commands**: Can take up to 1 hour to register
- **Solution**: Use `DISCORD_GUILD_ID` for instant guild commands
- Re-run the registration script

### "Invalid signature" error
- Check `DISCORD_PUBLIC_KEY` is correct
- Check interactions endpoint URL is correct
- Wait 1-2 minutes for Vercel to deploy

### Bot doesn't respond
- Check environment variables are set in Vercel
- Check Vercel logs for errors
- Verify Discord token is valid

### API errors
- Check `OPENAI_API_KEY` is valid
- Check API URL is accessible
- Check Vercel logs

---

## 🎨 Customization

### Change Bot Name/Avatar
- Go to Discord Developer Portal
- Your Application → **"Bot"** → Click bot icon
- Change name/avatar

### Add More Commands
1. Edit `app/api/discord/interactions/route.ts`
2. Add new case in switch statement
3. Register new command via script

---

## 📊 Monitoring

### View Logs
1. Go to Vercel Dashboard
2. Your Project → **"Logs"**
3. View real-time logs

### Deployments
- Automatically deploys on git push
- View deployment history in Vercel Dashboard

---

## 🎉 Done!

Your Siggy Discord bot is now:
- ✅ Hosted on Vercel (same as website)
- ✅ 24/7 online
- ✅ Auto-scales with traffic
- ✅ Same personality as website
- ✅ All features working (/check, /research)

---

**Built by [Decka-tan](https://github.com/Decka-tan)** for Ritual Soul Forge Quest ✦
