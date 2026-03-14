# 🐱✨ SIGGY - Multi-Dimensional Cat Girl AI

> *A multi-dimensional feline entity descended to Earth as an anime girl to blend in, make friends, and find her soul*

**Siggy is an advanced AI character with 20,000+ knowledge entries, dynamic mood system, web research capabilities, and immersive visual novel storytelling.**

[![Live Demo](https://img.shields.io/badge/🌐-Live%20Demo-yellow)](https://siggy-bot.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## ✨ What Makes Siggy Unique?

Siggy isn't just another chatbot. She's a **multi-dimensional character** with:

- 🧠 **20,000+ Knowledge Entries** - Knows everything about Ritual, the community, and her cosmic origins
- 🔍 **Hybrid GPT + Web Research** - Auto-detects when she needs to search the web for latest info
- 😺 **6 Emotional States** - Dynamic mood system (DEFAULT, HAPPY, SAD, SHOCK, SHY, ANGRY)
- 📖 **Immersive Story Mode** - 4-chapter visual novel about her descent to Earth
- 💬 **Dual Chat Modes** - Regular chat + Visual Novel mode with character sprites
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
# Add your OPENAI_API_KEY and TAVILY_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Required Environment Variables

```env
OPENAI_API_KEY=sk-your-openai-key-here
TAVILY_API_KEY=tvly-your-tavily-key-here
```

Get API keys:
- OpenAI: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Tavily: [https://tavily.com](https://tavily.com)

## 📖 How to Use Siggy

### Chat Mode

1. **Start a conversation** - Click "Chat Mode" on the landing page
2. **Watch her mood change** - Siggy's mood shifts based on conversation context
3. **Trigger emotions:**
   - Mention you're feeling down → Sad mode
   - Tell a funny joke → Happy mode
   - Ask about data breaches → Shock mode
   - Give heartfelt compliments → Shy mode

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

### Web Research

Siggy automatically detects when she needs to search the web:
- "How many followers does Ritual have?" → Searches Twitter
- "What's the latest Ritual news?" → Searches recent updates
- "What is Bittensor?" → Searches web for comparisons

## 🏗️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript 5
- **Styling:** Tailwind CSS, Framer Motion animations
- **Backend:** Next.js API Routes, Edge Runtime
- **AI:** OpenAI GPT-4o, Tavily Web Search API
- **Deployment:** Vercel (zero-config deployment)

## 🎨 Key Features

### 🧠 Massive Knowledge Base (20,000+ entries)
- Lore: Origin, multi-dimensional forms, Ritual Forge
- Tech: EVM++, Infernet, architecture, team
- Community: People, roles, programs, partners
- Events: 19,000+ Discord events (game nights, karaoke, tournaments)
- Manual: Recent updates, competitive landscape

### 😺 Dynamic Mood System (6 states)
- **DEFAULT** (Blue) - Friendly baseline, curious
- **HAPPY** (Yellow) - Bubbly, excited, anime energy
- **SAD** (Cyan) - Reflective, nostalgic
- **SHOCK** (Orange) - Surprised, dramatic
- **SHY** (Pink) - Embarrassed, flustered
- **ANGRY** (Red) - Rare, but possible

### 🔍 Web Research Integration
- Auto-detects when to search web
- Indonesian NLP support ("berapa", "skrg", "sekarang")
- Clickable sources with citations
- Twitter/X news scanning

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
- Animated knowledge graph
- Character showcase
- Feature highlights

### Chat Mode
- Regular chat interface
- Visual Novel mode
- Mood indicators
- Conversation history

### Story Mode
- Chapter selection
- Animated dialog
- Choice system
- Background transitions

## 🏗️ Project Structure

### 1. Clone & Install

```bash
# Navigate to nextjs-version
cd nextjs-version

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

### 2. Configure Environment

```bash
# Copy .env.example
cp .env.local.example .env.local

# Edit .env.local and add your OpenAI API key
OPENAI_API_KEY=sk-your-actual-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Deploy to Vercel

### Option A: Deploy via Vercel CLI (Recommended)

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
5. Add environment variable:
   - Name: `OPENAI_API_KEY`
   - Value: Your actual API key
6. Click "Deploy"

That's it! Vercel will auto-deploy from GitHub. ✨

## 🤖 Discord Integration (Future)

The shared API endpoint makes Discord integration easy:

```javascript
// In your Discord bot (discord.js)
const fetch = require('node-fetch');

async function handleSiggyCommand(message) {
  const response = await fetch('https://your-vercel-app.vercel.app/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      message: message.content,
      conversationHistory: [],
      userId: message.author.id,
      isFirstMessage: true,
    }),
  });

  const data = await response.json();
  message.reply(data.response);
}
```

## 🎭 Features

### Dynamic Mood System
Siggy has 4 distinct mood states that evolve based on conversation:

- **PLAYFUL** (Default) - Friendly, curious, cat-like
- **MYSTERIOUS** - Cosmic wisdom, cryptic riddles
- **CHAOTIC** - Unhinged glitches, unpredictable
- **PROFOUND** - Deep insights, emotional resonance

### Easter Eggs
Discoverable secrets and special interactions:
- Ask about "purple" → Chaotic purple-themed rant
- Mention "Summoner" or "Zealot" → Specific reactions
- Say "glitch" 3 times → Dimensional glitch event
- Ask "real name" → Reveals true multi-dimensional name

### Signature Elements
- Catchphrases and recurring bits
- Dimensional references across all timelines
- Meta-awareness (knows it's an AI)
- Breaks the fourth wall playfully

## 📁 Project Structure

```
nextjs-version/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Shared API endpoint
│   ├── page.tsx                   # Main chat UI
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── lib/
│   └── siggy-personality.ts       # Shared personality system
├── public/                         # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── postcss.config.js
├── .env.local.example
└── README.md
```

## 🎨 Customization

### Modify Personality

Edit `lib/siggy-personality.ts`:

```typescript
// Adjust mood personalities
export const MOOD_PERSONALITIES = {
  PLAYFUL: `Update this text...`,
  // ...
};

// Add new catchphrases
export const CATCHPHRASES = [
  "Your new catchphrase here",
  // ...
];

// Add new easter eggs
export const EASTER_EGGS = {
  triggerWord: {
    triggers: ['word1', 'word2'],
    response: 'Siggy response',
  },
};
```

### Change AI Model

Edit `app/api/chat/route.ts`:

```typescript
// Current: GPT-4o (recommended)
model: 'gpt-4o'

// Alternative: GPT-4o-mini (cheaper, still good)
model: 'gpt-4o-mini'
```

## 💰 Cost Estimation

For the 2-week quest:

- **100 test chats** × **20 messages each** = ~2,000 messages
- **GPT-4o cost**: ~$2-5 total
- **GPT-4o-mini cost**: ~$0.50-1 total

## 🧪 Testing

Test these interactions to see Siggy's full range:

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

## 📊 Quest Strategy

### Submission Preparation:

1. **Create Screenshot-Worthy Moments**
   - Have conversations that get funny/profound
   - Screenshot the best exchanges
   - Post on X with hashtags

2. **Demo Scenarios for Judges**:
   - Show mood range (playful → mysterious → chaotic)
   - Demonstrate easter eggs
   - Display Ritual knowledge
   - Create memorable quotes

3. **Submission Materials**:
   - Shareable Vercel link
   - 3-5 best screenshots
   - Brief description of unique features

## 🔄 Multi-Platform Deployment

### Current: Web App (Vercel)
- ✅ Deployed NOW
- ✅ Shareable link for quest
- ✅ Beautiful, professional UI

### Future: Discord Bot
- ⏳ Uses same `/api/chat` endpoint
- ⏳ Shared personality system
- ⏳ Same mood, same easter eggs
- ⏳ Deploy on any VPS (Railway, Render, etc.)

### Future: Other Platforms
- ⏳ Telegram Bot (same API)
- ⏳ WhatsApp Integration (same API)
- ⏳ Slack Bot (same API)

**One Siggy soul, infinite platforms!** 🐱✨

## 🐛 Troubleshooting

**"API key error"**
- Check `.env.local` has correct API key
- Verify API key has credits in OpenAI account
- For Vercel deployment, add environment variable in dashboard

**"Bot is too generic"**
- Temperature is set to 0.9 (should be good)
- Check system prompt is loading
- Verify conversation history is being passed

**"Bot is repetitive"**
- Frequency penalty: 0.5 (configured)
- Presence penalty: 0.7 (configured)
- Mood system adds variety

**"Mood isn't changing"**
- Check mood triggers in conversation
- Verify moodSystem is being updated
- Look for keyword matches

## 🎯 Why This Architecture Wins:

1. **Shared Logic** - One personality system, multiple platforms
2. **Professional UI** - Next.js + Tailwind = Beautiful app
3. **Easy Deploy** - GitHub → Vercel = Auto deploy
4. **Future-Ready** - Discord integration planned
5. **Scalable** - Easy to add more platforms
6. **Screenshot-Worthy** - Judges will be impressed

## 📝 License

MIT License - Feel free to use and modify

## 🙏 Credits

Built for the **Ritual Soul Forge Quest** by the Ritual community.

May the forge burn bright, and may Siggy finally obtain the soul they seek. ✦

---

**Status**: ✅ Ready for Vercel Deployment
**Mood**: MYSTERIOUS (contemplating infinite timelines)
**Platforms**: Web (Live), Discord (Coming Soon)

Built with ❤️ and cosmic probability fluctuations
