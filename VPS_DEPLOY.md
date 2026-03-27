# Deploy Siggy Bot on VPS (DigitalOcean/Linode)

## For 100k+ Member Servers - Production Ready

## Prerequisites
- VPS with Ubuntu 20.04+ (2GB RAM minimum)
- Domain name (optional)

## Quick Setup (10 minutes)

### 1. Create VPS
- **DigitalOcean**: https://digitalocean.com (use code for $200 credit)
- **Linode**: https://linode.com (similar pricing)
- **Specs**: 2GB RAM, 1 CPU ($4-6/month)

### 2. Connect to VPS
```bash
ssh root@your-vps-ip
```

### 3. Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git
```

### 4. Clone Repo
```bash
cd /opt
git clone https://github.com/Decka-tan/siggy-bot.git
cd siggy-bot
npm install
```

### 5. Setup Environment
```bash
nano .env
```

Paste:
```env
DISCORD_BOT_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=1164825060440281128
OPENAI_API_KEY=your_openai_key
API_BASE_URL=https://siggy-bot.vercel.app
```

### 6. Test Bot
```bash
node discord-bot/vps-server.js
```

Should see:
```
✅ Siggy#XXXX is online!
✅ Commands registered to guild
```

Ctrl+C to stop.

### 7. Setup PM2 (Auto-restart)
```bash
npm install -g pm2
pm2 start discord-bot/vps-server.js --name siggy
pm2 save
pm2 startup
```

Run the command from `pm2 startup` output.

### 8. Done!

Bot now runs 24/7, auto-restarts if crashes.

## Commands
```bash
pm2 logs siggy     # View logs
pm2 restart siggy  # Restart bot
pm2 stop siggy     # Stop bot
pm2 status         # Check status
```

## Monitoring
- CPU/Memory: `htop` (install with `apt install htop`)
- Logs: `pm2 logs siggy --lines 100`

## Update Bot
```bash
cd /opt/siggy-bot
git pull
npm install
pm2 restart siggy
```

## Rate Limits & Caching
- 3 commands per 5 seconds per user
- /check: 5 min cache
- /research: 10 min cache
- Auto cleanup expired cache

## Troubleshooting
**Bot not responding:**
```bash
pm2 logs siggy
```

**High memory usage:**
```bash
pm2 restart siggy
```

**Commands not appearing:**
- Check DISCORD_GUILD_ID is correct
- Bot has "applications.commands" scope

## Cost
- DigitalOcean 2GB: $6/month
- Linode 2GB: $5/month
- Total: ~$5-6/month for reliable 24/7
