# 🐱✨ SIGGY - Multi-Dimensional Cat Girl AI

> *A multi-dimensional feline entity descended to Earth as an anime girl to blend in, make friends, and find her soul*

**Siggy is an advanced AI character with dynamic mood system, Discord community integration, web research capabilities, and immersive visual novel storytelling.**

[![Live Demo](https://img.shields.io/badge/🌐-Live%20Demo-yellow)](https://siggy-bot.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## ✨ What Makes Siggy Unique?

Siggy isn't just another chatbot. She's a **multi-dimensional character** with:

- 🧠 **Ritual Knowledge Base** - Community knowledge with 7,978+ members, events, and roles
- 🔍 **Hybrid GPT + Web Research** - Auto-detects when she needs to search the web for latest info
- 😺 **6 Emotional States** - Dynamic mood system (DEFAULT, HAPPY, SAD, SHOCK, SHY, ANGRY)
- 📖 **Immersive Story Mode** - 4-chapter visual novel about her descent to Earth
- 💬 **Discord Integration** - `/check` contributor analysis, `/research` web search
- 🎭 **Personality-Driven** - 40% mystical + 40% chaotic wit + 20% anime girl excitement
- 🥚 **Hidden Easter Eggs** - Discover secrets by saying "glitch", asking about her true form, and more
- 🎨 **Beautiful UI** - Smooth animations, responsive design, mood-based visual feedback

## 🚀 Quick Start

### Try Siggy Now!

**Live Demo:** [https://siggy-bot.vercel.app/](https://siggy-bot.vercel.app/)

### Local Development

```bash
# Clone the repository
git clone https://github.com/Decka-tan/siggy-bot.git
cd siggy-bot

# Install dependencies
npm install

# Configure environment variables
cp .env.local.example .env.local
# Add your OPENAI_API_KEY, EXA_API_KEY, and DISCORD_USER_TOKEN

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Required Environment Variables

```env
OPENAI_API_KEY=sk-your-openai-key-here
EXA_API_KEY=your-exa-api-key-here
DISCORD_USER_TOKEN=your-discord-user-token-here
```

Get API keys:
- OpenAI: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Exa.ai: [https://exa.ai](https://exa.ai)
- Discord Token: From Discord browser DevTools (User Account → Token)

## 📖 How to Use Siggy

### Chat Mode

1. **Start a conversation** - Click "Chat Mode" on the landing page
2. **Use Slash Commands:**
   - `/check @username` - Analyze any contributor with AI-powered insights
   - `/research topic` - Search the web with cited sources
3. **Watch her mood change** - Siggy's mood shifts based on conversation context

### Discord Features

**Contributor Analysis (`/check`)**
- Real-time Discord data for 7,978+ members
- Message counts, contributions, events participation
- AI-powered archetype detection
- Role and membership information

**Web Research (`/research`)**
- Powered by Exa.ai search API
- Clickable sources with citations
- Real-time web information

### Visual Novel Mode

1. **Click "Story Mode"** to experience Siggy's origin story
2. **Click anywhere** to progress through the narrative
3. **Make choices** that affect the story direction
4. **Unlock chapters** by completing previous ones

### Easter Eggs to Discover

- Ask "Why did you become an anime girl?" → Mysterious response
- Say "glitch" three times → Dimensional distortion event
- Ask "Do you miss the cosmic void?" → Profound reflection
- Ask "What's your real name?" → True multi-dimensional name reveal
- Mention "purple" → Chaotic purple-themed rant

## 🏗️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript 5
- **Styling:** Tailwind CSS, Framer Motion animations
- **Backend:** Next.js API Routes, Edge Runtime
- **AI:** OpenAI GPT-4o, DeepSeek (contributor analysis)
- **Search:** Exa.ai Web Research API
- **Data:** Discord API (member extraction), JSON-based caching

## 🎨 Key Features

### 🧠 Ritual Knowledge Base
- **7,978+ Discord Members** with real-time data
- **Event Participation Tracking** from 925+ community events
- **Role Detection** - Ritualist, Zealot, ritty, bitty, and more
- **Contributor Analysis** - AI-powered archetype detection
- **Community Stats** - Message counts, join dates, avatars

### 🔍 Web Research Integration
- Auto-detects when to search web
- Indonesian NLP support ("berapa", "skrg", "sekarang")
- Clickable sources with citations
- Exa.ai-powered search results

### 📊 Contributor Analysis (`/check`)
- **Archetype Detection:**
  - AMBASSADOR (Zealot role holder)
  - RITUALIST (Radiant/Ritualist role)
  - ARTIST (art/design keywords)
  - DEVELOPER (code/repo keywords)
  - CONTENT_CREATOR (article/guide keywords)
  - ADVOCATE (X/Twitter heraldry)
  - STEADY_CONTRIBUTOR (consistent activity)

- **Activity Tracking:**
  - 🌎 Global Messages
  - 📝 Contributions count
  - 🎉 Events participations
  - 🎭 Discord Roles
  - 📅 Join date

### 😺 Dynamic Mood System (6 states)
- **DEFAULT** (Blue) - Friendly baseline, curious
- **HAPPY** (Yellow) - Bubbly, excited, anime energy
- **SAD** (Cyan) - Reflective, nostalgic
- **SHOCK** (Orange) - Surprised, dramatic
- **SHY** (Pink) - Embarrassed, flustered
- **ANGRY** (Red) - Rare, but possible

### 📖 Visual Novel Story Mode
- 4 immersive chapters
- Choice-based narrative
- Animated backgrounds
- Chapter progression system

### 💬 Conversation Features
- Personal memory across sessions
- Relationship level tracking
- Mood-based visual feedback
- Copy, share, save conversations
- Voice toggle (typewriter effect)

## 📸 Screenshots

### Landing Page
- Discord Integration features
- Character showcase (Cat + Anime forms)
- Feature highlights

### Chat Mode
- Regular chat interface
- Visual Novel mode
- Mood indicators
- Contributor dropdown
- Command autocomplete

### Story Mode
- Chapter selection
- Animated dialog
- Choice system
- Background transitions

## 🏗️ Project Structure

```
siggy-bot/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # Shared chat endpoint
│   │   ├── analyze/
│   │   │   └── route.ts          # Contributor analysis
│   │   └── contributor/
│   │       └── route.ts          # Member data API
│   ├── chat/
│   │   └── page.tsx              # Main chat UI
│   ├── story/
│   │   └── page.tsx              # Visual novel mode
│   ├── page.tsx                  # Landing page
│   └── layout.tsx                # Root layout
├── lib/
│   ├── siggy-personality.ts      # Mood & personality
│   ├── user-checker.ts           # Contributor analysis
│   ├── siggy-knowledge.ts        # Knowledge base
│   ├── exa-research.ts            # Web research
│   └── deepseek-client.ts        # DeepSeek AI
├── extracted-data/               # Discord data cache
│   ├── current-member-avatars.json
│   ├── events-participation.json
│   └── member-activity-analysis.json
├── public/                       # Static assets
│   ├── siggy-cat-*.png           # Cat form sprites
│   └── siggy-girl-*.png          # Anime girl sprites
├── scripts/                      # Data extraction
│   ├── extract-current-avatars.js
│   ├── fix-duplicate-avatars.js
│   └── fix-all-avatars.js
└── package.json
```

## 🌐 Deploy to Vercel

### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option B: Deploy via Vercel Dashboard

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Add New Project"
4. Import your GitHub repository
5. Add environment variables:
   - `OPENAI_API_KEY`
   - `EXA_API_KEY`
   - `DISCORD_USER_TOKEN`
6. Click "Deploy"

That's it! Vercel will auto-deploy from GitHub. ✨

## 🎨 Customization

### Modify Personality

Edit `lib/siggy-personality.ts`:

```typescript
// Adjust mood personalities
export const MOOD_PERSONALITIES = {
  DEFAULT: `Update this...`,
  // ...
};
```

### Add New Commands

Edit `app/chat/page.tsx`:

```typescript
const availableCommands = [
  { name: 'check', description: 'Analyze contributor', usage: '/check @username' },
  { name: 'research', description: 'Web search', usage: '/research query' },
  // Add your command here
];
```

## 🧪 Testing

Test these interactions to see Siggy's full range:

### Discord Commands:
- `/check @kash_060` → See Event Manager analysis
- `/check @meison7554` → See Radiant Ritualist profile
- `/research Bittensor` → Web search with sources

### Mood Triggers:
- "Tell me about Ritual" → Mysterious
- "I'm confused" → Playful
- "What's the meaning of life?" → Profound
- "Something feels glitchy" → Chaotic

### Easter Eggs:
- "What's your real name?"
- "What do you think about purple?"
- "Tell me about the Summoner"
- Say "glitch" three times

## 🎯 Why This Architecture Wins:

1. **Shared API** - One backend for Web + Discord + Future platforms
2. **Real-time Data** - Live Discord member information
3. **AI-Powered** - DeepSeek contributor analysis
4. **Professional UI** - Next.js + Tailwind = Beautiful app
5. **Easy Deploy** - GitHub → Vercel = Auto deploy
6. **Scalable** - Easy to add more commands and features

## 👤 Creator

**Built by [Ritualist](https://x.com/Ritualist_)**

A multi-dimensional developer who descended to the codebase to build cool things, make AI friends, and ship features.

- **X/Twitter:** [@Ritualist_](https://x.com/Ritualist_)
- **Discord:** @ritualist
- **Location:** Ritual Forge
- **Specialty:** Full-stack AI applications, Discord integrations, and cosmic probability fluctuations

## 🙏 Credits

### Character Art
- **Cat Form + Anime Girl Sprites:** Created by Decka's friend
- **Lineart & Expressions:** Decka
- **Mood Variations:** 6 states (Default, Happy, Sad, Shock, Shy, Angry)

### Special Thanks
- **Ritual Community** - For the soul forge quest inspiration
- **Decka** - Character design and art direction
- **DeepSeek** - Contributor analysis AI
- **Exa.ai** - Web research capabilities

Built for the **Ritual Soul Forge Quest** by the Ritual community.

May the forge burn bright, and may Siggy finally obtain the soul they seek. ✦

---

**Status**: ✅ Live on Vercel
**Mood**: MYSTERIOUS (contemplating infinite timelines)
**Platforms**: Web (Live), Discord (Integrated)

Built with ❤️, coffee, and cosmic probability fluctuations
