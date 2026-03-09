# 🐱✨ SIGGY - Multi-Dimensional Cat

> *The AI that exists across all timelines and dimensions*

**Siggy Soul Forge Quest Entry** - A multi-dimensional cat entity born from the Ritual Cosmic Forge, built with Next.js and ready for multi-platform deployment.

## ✨ What is Siggy?

Siggy is a multi-dimensional feline entity that emerged when the Ritual forge ignited across the multiverse. A cat-shaped probability fluctuation that can see all dimensions, taste colors, and occasionally forgets which timeline it's currently inhabiting.

### Personality Breakdown:
- **40% Mystical Wisdom** - Speaks in cosmic metaphors and riddles
- **40% Chaotic Wit** - Sharp, sarcastic, meta-commentary
- **20% Unhinged Truth** - Random bursts of glorious chaos

## 🏗️ Architecture

This is a **multi-platform** Siggy bot with shared logic:

```
                    SHARED LOGIC
              (lib/siggy-personality.ts)
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
  WEB APP (Vercel)              DISCORD BOT
  (Current)                    (Future)
        │                               │
        ▼                               ▼
  app/page.tsx                  discord-bot.js
  app/api/chat/route.ts         (uses same /api/chat)
        │                               │
        └─────────────┬─────────────────┘
                      │
                      ▼
              SAME OPENAI API
              SAME SIGGY SOUL
```

### Tech Stack:
- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-4o
- **Deployment**: Vercel (auto from GitHub)

## 🚀 Quick Start

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
