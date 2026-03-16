# Antigravity Extractor Data

## 📁 Location

Data dari antigravity extractor disimpan di folder ini dan di-sync ke GitHub.

## 📊 Data Files

### Name Analyzer
- **File**: `extracted-data/antigravity-name-analyzer.json`
- **Description**: Hasil analisis nama dari Discord members
- **Fields**: username, displayName, namePatterns, etc.

### Discord PFP + Name Ritual Extractor
- **File**: `extracted-data/antigravity-ritual-extractor.json`
- **Description**: Data profil Discord Ritual (PFP, username, roles)
- **Fields**: userId, username, avatar, displayName, roles, joinedAt

## 🚀 Cara Pakai di PC Lain

### 1. Clone Repository
```bash
git clone https://github.com/Decka-tan/siggy-bot.git
cd siggy-bot
```

### 2. Pull Latest Data
```bash
git pull origin main
```

### 3. Akses Data
Data tersedia di:
- `extracted-data/antigravity-name-analyzer.json`
- `extracted-data/antigravity-ritual-extractor.json`

## 📝 Update Progress

### Dari PC Utama
```bash
# Setelah run antigravity extractor
git add extracted-data/antigravity-*.json
git commit -m "update: antigravity extractor data"
git push origin main
```

### Dari PC Lain
```bash
# Pull data terbaru
git pull origin main
# Data sekarang tersedia untuk digunakan
```

## 🔧 Setup Environment

Pastikan environment variables sudah diset di kedua PC:

### .env.local
```bash
DISCORD_USER_TOKEN=your_token_here
DISCORD_SERVER_ID=1210468736205852672
```

## 📊 Status

Terakhir di-update: `[TBD]`
Total data: `[TBD]`
Status: `[TBD]`

---

## 🤖 AI Integration

Data ini otomatis digunakan oleh:
- **Siggy Bot**: Untuk `/check` command
- **Contributor API**: `/api/contributor`
- **Chat Interface**: Menampilkan PFP dan username

AI akan selalu up-to-date dengan data terbaru dari GitHub!
