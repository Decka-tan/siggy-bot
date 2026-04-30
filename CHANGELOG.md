# CHANGELOG

All notable changes to **Siggy Bot** will be documented in this file.

---

## [v1.0.0] - Initial Release

### 🤖 AI & Chat
- Siggy AI chat powered by GPT-4o with full personality system
- 6 dynamic mood states: DEFAULT, HAPPY, SAD, SHOCK, SHY, ANGRY — each with unique sprite
- Auto web research detection via Exa.ai (no command needed, just ask)
- DeepSeek-powered contributor analysis (`/check`)
- TF-IDF RAG knowledge base built from 7,978+ Ritual Discord members
- Easter eggs & keyword trigger responses

### 🌐 Web App (Next.js 14)
- Landing page + full chat UI
- Visual Novel story mode with 4 chapters & animated sprites
- Message editing & AI response regeneration
- Message search across conversation history
- Toast notifications & skeleton loading states
- Fully responsive design (mobile & desktop)

### 🤖 Discord Bot — Slash Commands

#### 🧠 AI & Analysis
- `/check <username>` — AI deep-analysis contributor (DeepSeek + RAG)
- `/top [count]` — Top contributors leaderboard (max 50)
- `/compare <user1> <user2>` — Bandingkan 2 user side-by-side
- `/stats` — Statistik server overall
- `/user <username>` — Basic stats user
- `/mood` — Cek mood Siggy saat ini
- `/reset` — Reset conversation dengan Siggy
- `/help` — Tampilkan semua command
- `/research <query>` — Web research dengan cited sources (Tavily)

#### 💰 Crypto
- `/price <coin> [currency]` — Harga crypto (USD/IDR/EUR)
- `/trending` — Crypto trending list
- `/chart <coin>` — Chart harga crypto

#### 🧾 Invoice
- `/invoice-create` — Buat invoice baru
- `/invoice-recap` — Rekap semua invoice
- `/invoice-search [query] [period]` — Cari invoice
- `/invoice-analytics [period]` — Analitik invoice
- `/invoice-delete` — Hapus invoice
- `/invoice-clear` — Clear semua invoice
- `/invoice-owe` — Cek hutang
- `/invoice-merge <canonical> <alias>` — Merge nama user

#### 💳 Payment
- `/payment-set` — Set payment method
- `/invoice-link <name>` — Link invoice ke payment
- `/bayar` — Tandai sudah bayar

#### 🎮 Fun
- `/hug [user]` — Kirim anime hug GIF
- `/slap [user]` — Kirim anime slap GIF
- `/pat [user]` — Kirim anime pat GIF

#### 🛠️ Utility
- `/flip [amount] [choice]` — Coin flip
- `/roll [count]` — Dice roll (1–6 dadu)
- `/avatar [user]` — Lihat avatar user
- `/choose <options>` — Pilih random dari pilihan

#### 🏆 Leaderboard
- `/leaderboard start <user> <score>` — Mulai sesi leaderboard baru
- `/leaderboard add <user> <score>` — Tambah score ke sesi aktif

### 🏗️ Infrastructure
- Web app deploy ke **Vercel**
- Discord bot deploy ke **VPS / Render**
- SQLite database untuk user state & conversation history
- Discord data extraction pipeline (member activity, roles, contributions)
- JSON-based caching untuk member data (7,978+ entries)
- Audio assets: BGM, SFX, anime voice clips (ara, eto, hai, hmm, ohayo)
- Siggy sprite assets: cat & girl versi angry/happy/sad/shock/shy/default

---

<!-- v1.1.0 will be added here -->
