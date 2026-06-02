# Deploy Siggy Bot on VPS (Ubuntu non-root)

## Prerequisites
- VPS dengan Ubuntu 20.04+ (2GB RAM minimum)
- Login sebagai user `ubuntu` (non-root)

---

## 1. Koneksi ke VPS
```bash
ssh ubuntu@IP_VPS_KAMU
```

---

## 2. Install Node.js 20 & Git
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs git
```

Verifikasi:
```bash
node -v   # harus v20.x.x
npm -v
```

---

## 3. Install PM2
```bash
sudo npm install -g pm2
```

---

## 4. Clone Repo
```bash
cd /opt
sudo git clone https://github.com/Decka-tan/siggy-bot.git
sudo chown -R ubuntu:ubuntu /opt/siggy-bot
cd /opt/siggy-bot
npm install
```

---

## 5. Setup Environment Variables

**A. Root `.env`** (untuk web Next.js):
```bash
nano /opt/siggy-bot/.env
```
Isi:
```env
DISCORD_BOT_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_PUBLIC_KEY=your_public_key
DISCORD_GUILD_ID=1164825060440281128
DISCORD_SERVER_ID=1210468736205852672
RITUAL_GUILD_ID=1210468736205852672
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
DATA_DIR=/opt/siggy-bot/discord-bot/data
API_BASE_URL=http://localhost:3000
```

**B. `discord-bot/.env`** (untuk bot):
```bash
nano /opt/siggy-bot/discord-bot/.env
```
Isi sama seperti di atas (copy dari `.env.example`).

---

## 6. Jalankan Discord Bot
```bash
cd /opt/siggy-bot
pm2 start discord-bot/vps-server.js --name siggy
```

Cek berjalan:
```bash
pm2 logs siggy
```
Harus muncul:
```
✅ Siggy#XXXX is online!
✅ Commands registered to guild
```

---

## 7. Build & Jalankan Siggy Web (Next.js)
```bash
cd /opt/siggy-bot
npm run build
pm2 start npm --name siggy-web -- start
```

Kalau mau port custom (default 3000):
```bash
pm2 start npm --name siggy-web -- start -- -p 3000
```

---

## 8. Auto-start saat VPS Reboot
```bash
pm2 save
pm2 startup
```
Copy-paste perintah output dari `pm2 startup` (biasanya ada `sudo env PATH=...`), lalu jalankan.

---

## 9. (Opsional) Nginx Reverse Proxy

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/siggy
```
Isi:
```nginx
server {
    listen 80;
    server_name domain-kamu.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/siggy /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Commands PM2
```bash
pm2 status              # Cek semua proses
pm2 logs siggy          # Log bot
pm2 logs siggy-web      # Log web
pm2 restart siggy       # Restart bot
pm2 restart siggy-web   # Restart web
pm2 stop siggy          # Stop bot
```

---

## Update Bot
```bash
cd /opt/siggy-bot
git pull
npm install
npm run build
pm2 restart all
```

---

## Migrate Data dari VPS Lama

Kalau ada data di VPS lama (folder `discord-bot/data`):
```bash
# Dari VPS lama
scp -r /opt/siggy-bot/discord-bot/data ubuntu@IP_VPS_BARU:/opt/siggy-bot/discord-bot/
```

---

## Troubleshooting

**Permission denied saat npm install:**
```bash
sudo chown -R ubuntu:ubuntu /opt/siggy-bot
```

**Bot tidak respond:**
```bash
pm2 logs siggy
```

**Web tidak bisa diakses:**
```bash
pm2 logs siggy-web
sudo ufw allow 3000   # buka port jika pakai firewall
```

**High memory:**
```bash
pm2 restart all
```
