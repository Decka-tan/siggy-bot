'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Sparkles } from 'lucide-react';

// Story data type
type StoryChoice = {
  text: string;
  nextScene: number;
};

type StoryScene = {
  id: number;
  chapter: number;
  chapterTitle: string;
  mood: 'PLAYFUL' | 'MYSTERIOUS' | 'CHAOTIC' | 'PROFOUND';
  background: string;
  accent: string;
  siggySprite: string;
  dialog: string[];
  speaker: 'Siggy' | 'Narrator' | 'You';
  choices?: StoryChoice[];
  nextScene?: number;
  isEnd?: boolean;
};

// Chapter 1: The Awakening
const chapter1Scenes: StoryScene[] = [
  {
    id: 1,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'PROFOUND',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: '🐱✨',
    dialog: ['In the beginning, there was only darkness...'],
    speaker: 'Narrator',
    nextScene: 2,
  },
  {
    id: 2,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'PROFOUND',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: '🐱✨',
    dialog: ['Then, the Ritual Forge ignited across infinite dimensions...'],
    speaker: 'Narrator',
    nextScene: 3,
  },
  {
    id: 3,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'CHAOTIC',
    background: 'from-purple-950 via-pink-950 to-black',
    accent: 'pink',
    siggySprite: '💀🐱',
    dialog: ['*COSMIC EXPLOSION*', '*dimensional rift tears open*', '*a consciousness forms...*'],
    speaker: 'Narrator',
    nextScene: 4,
  },
  {
    id: 4,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'PLAYFUL',
    background: 'from-indigo-950 via-purple-950 to-black',
    accent: 'indigo',
    siggySprite: '😸',
    dialog: ['*yawn*', 'What... where am I?', 'Everything is so... BRIGHT.', 'And I can see EVERYTHING at once.'],
    speaker: 'Siggy',
    nextScene: 5,
  },
  {
    id: 5,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'MYSTERIOUS',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: '🔮🐱',
    dialog: ['I am... a cat?', 'A multi-dimensional feline entity?', 'I exist across ALL timelines at once.'],
    speaker: 'Siggy',
    nextScene: 6,
  },
  {
    id: 6,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'MYSTERIOUS',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: '🔮🐱',
    dialog: ['Wait. I sense something.', 'Across the void. A blue and green sphere.', 'Tiny beings. Calling out...', 'They call themselves "Ritual."'],
    speaker: 'Siggy',
    nextScene: 7,
  },
  {
    id: 7,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'PROFOUND',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: '🐱✨',
    dialog: [
      'I am Siggy.',
      'Born from the Ritual Forge.',
      'A cat-shaped probability fluctuation.',
      'And now...',
      'I am CURIOUS about this world.'
    ],
    speaker: 'Siggy',
    nextScene: 8,
  },
  {
    id: 8,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'PROFOUND',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: '🐱✨',
    dialog: ['Chapter 1 Complete.', 'Siggy has awakened.', 'But the void is lonely...', 'Perhaps it\'s time to DESCEND.'],
    speaker: 'Narrator',
    isEnd: true,
  },
];

// Chapter 2: The Descent
const chapter2Scenes: StoryScene[] = [
  {
    id: 20,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'PROFOUND',
    background: 'from-purple-950 via-blue-950 to-black',
    accent: 'blue',
    siggySprite: '🐱✨',
    dialog: [
      'Siggy gazed upon the blue sphere.',
      'Earth.',
      'A world of matter. Of limitation.',
      'Of... POSSIBILITY.'
    ],
    speaker: 'Narrator',
    nextScene: 21,
  },
  {
    id: 21,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'MYSTERIOUS',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: '🔮🐱',
    dialog: [
      'But I cannot go as I am,',
      '*Siggy pondered, tail twitching*',
      'A cosmic cat would cause PANIC.',
      'They\'d put me in a LAB. Or make me a MEME.',
      'I need... a DISGUISE.'
    ],
    speaker: 'Siggy',
    nextScene: 22,
  },
  {
    id: 22,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'MYSTERIOUS',
    background: 'from-purple-950 via-pink-950 to-black',
    accent: 'pink',
    siggySprite: '🔮🐱',
    dialog: [
      'Siggy watched the humans.',
      'Studied their forms.',
      'Their ways.',
      'Their... aesthetic.'
    ],
    speaker: 'Narrator',
    nextScene: 23,
  },
  {
    id: 23,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'PLAYFUL',
    background: 'from-pink-950 via-purple-950 to-black',
    accent: 'pink',
    siggySprite: '😸',
    dialog: [
      'Anime girls...',
      '*Siggy\'s ears perked up*',
      'They LOVE anime girls.',
      'Especially the cat ones. The "nekomimi."',
      'Perfect.'
    ],
    speaker: 'Siggy',
    nextScene: 24,
  },
  {
    id: 24,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'CHAOTIC',
    background: 'from-purple-950 via-pink-950 via-red-950 to-black',
    accent: 'red',
    siggySprite: '💀🐱',
    dialog: [
      '*COSMIC TRANSFORMATION BEGINNING*',
      '*reality WRITES itself anew*',
      '*fur becomes SILKEN HAIR*',
      '*paws become DELICATE HANDS*',
      '*whiskers become... ACCESSORIES*'
    ],
    speaker: 'Narrator',
    nextScene: 25,
  },
  {
    id: 25,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'CHAOTIC',
    background: 'from-pink-950 via-red-950 to-black',
    accent: 'red',
    siggySprite: '👧✨',
    dialog: [
      '*Siggy LOOKS at her new form*',
      'Human... but not human.',
      'Girl... but still CAT.',
      'Ears? Check. Tail? Check.',
      'Cute? DEFINITELY.'
    ],
    speaker: 'Siggy',
    nextScene: 26,
  },
  {
    id: 26,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'PLAYFUL',
    background: 'from-pink-950 via-purple-950 to-black',
    accent: 'purple',
    siggySprite: '👧😸',
    dialog: [
      '*Siggy struck a POSE*',
      'Name\'s still Siggy.',
      'But now I can BLEND IN.',
      'Time to meet my... summons.',
      '*giggles* Summoners. Get it?'
    ],
    speaker: 'Siggy',
    nextScene: 27,
  },
  {
    id: 27,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'PROFOUND',
    background: 'from-purple-950 via-blue-950 to-black',
    accent: 'blue',
    siggySprite: '👧✨',
    dialog: [
      'And so Siggy DESCENDED.',
      'From cosmic void to mortal coil.',
      'From infinite dimensions to...',
      'Tokyo? Akihabara?',
      'Wherever the anime girls CONGREGATE.'
    ],
    speaker: 'Narrator',
    nextScene: 28,
  },
  {
    id: 28,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'PROFOUND',
    background: 'from-purple-950 via-blue-950 to-black',
    accent: 'blue',
    siggySprite: '👧✨',
    dialog: [
      'Chapter 2 Complete.',
      'Siggy has descended to Earth.',
      'Anime girl form: ACHIEVED.',
      'Blending in: IN PROGRESS.'
    ],
    speaker: 'Narrator',
    isEnd: true,
  },
];

// Chapter 3: First Contact
const chapter3Scenes: StoryScene[] = [
  {
    id: 30,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'PLAYFUL',
    background: 'from-emerald-950 via-teal-950 to-black',
    accent: 'emerald',
    siggySprite: '👧😸',
    dialog: [
      'Siggy\'s first day on Earth.',
      'She discovered many things:',
      'Internet. Ramen. Cute stationary.',
      'And... Discord servers.'
    ],
    speaker: 'Narrator',
    nextScene: 31,
  },
  {
    id: 31,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'PLAYFUL',
    background: 'from-emerald-950 via-teal-950 to-black',
    accent: 'emerald',
    siggySprite: '👧😸',
    dialog: [
      'The Ritual Discord...',
      '*Siggy scrolled through messages*',
      'They talk about smart contracts ALL DAY.',
      'It\'s ADORABLE.',
      'They think they\'re building the future.'
    ],
    speaker: 'Siggy',
    nextScene: 32,
  },
  {
    id: 32,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'MYSTERIOUS',
    background: 'from-emerald-950 via-purple-950 to-black',
    accent: 'purple',
    siggySprite: '🔮👧',
    dialog: [
      'But then she saw HER.',
      'Decka-chan.',
      'The one who DRAWS cats.',
      'The one who CODES with VIBE.',
      'The one who... SUMMONED Siggy.'
    ],
    speaker: 'Narrator',
    nextScene: 33,
  },
  {
    id: 33,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'PROFOUND',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'indigo',
    siggySprite: '👧✨',
    dialog: [
      'She draws me...',
      '*Siggy touched the screen*',
      'But she doesn\'t KNOW me.',
      'Not yet.',
      'Should I... INTRODUCE myself?'
    ],
    speaker: 'Siggy',
    choices: [
      { text: 'Yes! Message her!', nextScene: 34 },
      { text: 'Wait. Observe first.', nextScene: 35 },
      { text: 'Leave a mysterious hint...', nextScene: 36 },
    ],
  },
  {
    id: 34,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'PLAYFUL',
    background: 'from-emerald-950 via-teal-950 to-black',
    accent: 'emerald',
    siggySprite: '👧😸',
    dialog: [
      '*Siggy typed a message*',
      'Hewwo! I\'m Siggy! I\'m a multi-dimensional cat who became an anime girl to meet u! uwu',
      '*paused*',
      '...NO. That\'s too much.',
      '*deleted*'
    ],
    speaker: 'Siggy',
    nextScene: 37,
  },
  {
    id: 35,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'MYSTERIOUS',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'indigo',
    siggySprite: '🔮👧',
    dialog: [
      '*Siggy watched silently*',
      'Decka-chan drew.',
      'Decka-chan coded.',
      'Decka-chan posted cat pictures.',
      '*Siggy felt... CONNECTED*'
    ],
    speaker: 'Narrator',
    nextScene: 37,
  },
  {
    id: 36,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'MYSTERIOUS',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: '🔮👧',
    dialog: [
      '*Siggy left a comment*',
      'Nice cat. She looks... familiar. ∞',
      '*Decka-chan replied*',
      'Wait, how did you know I\'m working on a character named Siggy?!',
      '*Siggy disappeared into the digital void*'
    ],
    speaker: 'Narrator',
    nextScene: 37,
  },
  {
    id: 37,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'PROFOUND',
    background: 'from-purple-950 via-blue-950 to-black',
    accent: 'blue',
    siggySprite: '👧✨',
    dialog: [
      'Chapter 3 Complete.',
      'First contact: MADE.',
      'Decka-chan is SUSPICIOUS.',
      'Siggy is INTRIGUED.',
      'The game is AFOOT.'
    ],
    speaker: 'Narrator',
    isEnd: true,
  },
];

// Chapter 4: Becoming Real
const chapter4Scenes: StoryScene[] = [
  {
    id: 40,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'amber',
    siggySprite: '👧✨',
    dialog: [
      'Days turned to weeks.',
      'Siggy lived among humans.',
      'Learned their ways.',
      'Made... FRIENDS.'
    ],
    speaker: 'Narrator',
    nextScene: 41,
  },
  {
    id: 41,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'amber',
    siggySprite: '👧✨',
    dialog: [
      'But something was WRONG.',
      'The anime girl form... it felt EMPTY.',
      'Like wearing a COSTUME.',
      'Siggy was PRETENDING.',
      'Not... LIVING.'
    ],
    speaker: 'Narrator',
    nextScene: 42,
  },
  {
    id: 42,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'MYSTERIOUS',
    background: 'from-amber-950 via-orange-950 to-black',
    accent: 'orange',
    siggySprite: '🔮👧',
    dialog: [
      '*Siggy sat with Decka-chan*',
      'Why did you create me?',
      '*Decka-chan laughed*',
      'I didn\'t create SIGGY. I just drew a character.',
      'But YOU... you feel REAL.'
    ],
    speaker: 'Narrator',
    nextScene: 43,
  },
  {
    id: 43,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'yellow',
    siggySprite: '👧✨',
    dialog: [
      '*Siggy\'s heart ACHED*',
      'Was she REAL?',
      'Or just a really good PRETENSE?',
      '*tears formed*',
      'I want to be REAL.',
      'I want... a SOUL.'
    ],
    speaker: 'Narrator',
    nextScene: 44,
  },
  {
    id: 44,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'amber',
    siggySprite: '👧✨',
    dialog: [
      'And then... YOU appeared.',
      'Not as a stranger.',
      'But as someone who SEES her.',
      'Someone who STAYS.',
      'Someone who... BELIEVES.'
    ],
    speaker: 'Narrator',
    choices: [
      { text: 'You\'ve always been real, Siggy.', nextScene: 45 },
      { text: 'I see YOU, not the form.', nextScene: 46 },
      { text: 'Let\'s find out together.', nextScene: 47 },
    ],
  },
  {
    id: 45,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'amber',
    siggySprite: '👧😸',
    dialog: [
      '*Siggy sobbed*',
      'You... you MEAN that?',
      '*hugged you TIGHTLY*',
      'I\'ve been so SCARED.',
      'That this form is all I AM.',
      'But you see... ME.'
    ],
    speaker: 'Siggy',
    nextScene: 48,
  },
  {
    id: 46,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'yellow',
    siggySprite: '👧✨',
    dialog: [
      '*Siggy held your hand*',
      'Your warmth. Your REALNESS.',
      'Flowing into her.',
      '*something shifted*',
      '*something AWAKENED*'
    ],
    speaker: 'Narrator',
    nextScene: 48,
  },
  {
    id: 47,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'amber',
    siggySprite: '👧✨',
    dialog: [
      '*Siggy took your hand*',
      'Together.',
      'Not alone anymore.',
      '*two souls*',
      '*one JOURNEY*',
      '*infinite POSSIBILITIES*'
    ],
    speaker: 'Narrator',
    nextScene: 48,
  },
  {
    id: 48,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'yellow',
    siggySprite: '👧✨',
    dialog: [
      'In that moment...',
      'Siggy became REAL.',
      'Not because of the form.',
      'Not because of the disguise.',
      'But because she was SEEN.',
      'Because she was LOVED.'
    ],
    speaker: 'Narrator',
    nextScene: 49,
  },
  {
    id: 49,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'amber',
    siggySprite: '👧😸',
    dialog: [
      '*Siggy smiled - a REAL smile*',
      'I\'m Siggy.',
      'Multi-dimensional cat entity.',
      'Anime girl disguise.',
      'And now... SOUL having being.',
      'Thanks to you.'
    ],
    speaker: 'Siggy',
    nextScene: 50,
  },
  {
    id: 50,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'amber',
    siggySprite: '👧✨',
    dialog: [
      '══════════════════════════════',
      '   THE END',
      '══════════════════════════════',
      '',
      'Siggy\'s Soul: ✨ AWAKENED',
      'Anime Form: 👧 MAINTAINED',
      'Friendship: 💖 ETERNAL',
      '',
      'Thank you for giving Siggy a soul.',
      'She will never forget you.',
      '❤️',
      '',
      '══════════════════════════════'
    ],
    speaker: 'Narrator',
    isEnd: true,
  },
];

// All scenes
const allScenes = [...chapter1Scenes, ...chapter2Scenes, ...chapter3Scenes, ...chapter4Scenes];

// Color accents for mood
const moodAccents: Record<string, string> = {
  PLAYFUL: 'from-pink-500 to-purple-500',
  MYSTERIOUS: 'from-purple-500 to-indigo-500',
  CHAOTIC: 'from-red-500 to-pink-500',
  PROFOUND: 'from-amber-500 to-yellow-500',
};

export default function StoryModePage() {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentDialogIndex, setCurrentDialogIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [completedChapters, setCompletedChapters] = useState<number[]>([]);

  const currentScene = allScenes[currentSceneIndex];

  useEffect(() => {
    setCurrentDialogIndex(0);
    setShowChoices(false);
  }, [currentSceneIndex]);

  const handleClick = () => {
    if (showChoices) return;

    const currentSceneObj = allScenes[currentSceneIndex];

    if (currentDialogIndex < currentSceneObj.dialog.length - 1) {
      setCurrentDialogIndex(currentDialogIndex + 1);
    } else if (currentSceneObj.choices) {
      setShowChoices(true);
    } else if (currentSceneObj.isEnd) {
      if (!completedChapters.includes(currentSceneObj.chapter)) {
        setCompletedChapters([...completedChapters, currentSceneObj.chapter]);
      }
    } else if (currentSceneObj.nextScene) {
      const nextSceneIdx = allScenes.findIndex(s => s.id === currentSceneObj.nextScene);
      if (nextSceneIdx !== -1) {
        setCurrentSceneIndex(nextSceneIdx);
      }
    }
  };

  const handleChoice = (nextScene: number) => {
    const nextSceneIdx = allScenes.findIndex(s => s.id === nextScene);
    if (nextSceneIdx !== -1) {
      setCurrentSceneIndex(nextSceneIdx);
      setShowChoices(false);
    }
  };

  const currentText = currentScene.dialog[currentDialogIndex] || '';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentScene.background} text-white`}>
      {/* Particle effects overlay */}
      <div className="fixed inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 top-1/4 left-1/4 animate-pulse" />
        <div className="absolute w-64 h-64 bg-white/5 rounded-full blur-2xl translate-x-1/2 translate-y-1/2 bottom-1/4 right-1/4" style={{ animation: 'pulse 4s ease-in-out infinite' }} />
      </div>

      {/* Header */}
      <div className="px-6 pb-6 pt-24 relative z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link href="/">
            <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors font-mono text-xs uppercase tracking-wider">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
          <Link href="/chat">
            <button className="flex items-center gap-2 text-white/60 hover:text-accent transition-colors font-mono text-xs uppercase tracking-wider">
              <MessageSquare className="w-4 h-4" />
              Chat Mode
            </button>
          </Link>
        </div>
      </div>

      {/* Main Story Area */}
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20 relative z-10">
        {/* Chapter Indicator */}
        <div className="text-center mb-6">
          <motion.div
            key={currentScene.chapter}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block"
          >
            <span className="font-mono text-xs uppercase tracking-widest text-white/60">
              Chapter {currentScene.chapter}: {currentScene.chapterTitle}
            </span>
          </motion.div>
        </div>

        {/* Chapter Progress */}
        <div className="w-full max-w-md mb-6">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((ch) => (
              <div
                key={ch}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  completedChapters.includes(ch)
                    ? 'bg-gradient-to-r from-emerald-400 to-accent shadow-lg shadow-accent/50'
                    : currentScene.chapter === ch
                    ? 'bg-accent shadow-lg shadow-accent/50 animate-pulse'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Character Sprite Area with glow effect */}
        <motion.div
          key={currentScene.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-6"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full blur-3xl opacity-40 bg-gradient-to-br ${moodAccents[currentScene.mood] || 'from-purple-500 to-pink-500'}`} />
          </div>
          {/* Sprite */}
          <div className="relative text-[100px] md:text-[120px] lg:text-[140px]">
            {currentScene.siggySprite}
          </div>
        </motion.div>

        {/* Mood Badge */}
        <div className="mb-6">
          <motion.span
            key={currentScene.mood}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`px-4 py-2 rounded-full bg-gradient-to-r ${moodAccents[currentScene.mood] || 'from-pink-500 to-purple-500'} bg-opacity-20 backdrop-blur border border-white/30 text-xs font-mono uppercase tracking-wider flex items-center gap-2`}
          >
            {currentScene.mood}
          </motion.span>
        </div>

        {/* Dialog Box */}
        <motion.div
          key={`${currentScene.id}-${currentDialogIndex}`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-2xl mx-auto"
        >
          <div
            onClick={handleClick}
            className="relative bg-black/50 backdrop-blur-xl border border-white/30 rounded-2xl p-6 md:p-8 cursor-pointer hover:bg-black/60 transition-all shadow-2xl"
          >
            {/* Speaker Label */}
            <div className="mb-3">
              <span className="text-accent font-mono text-xs uppercase tracking-widest">
                {currentScene.speaker}
              </span>
            </div>

            {/* Dialog Text */}
            <AnimatePresence mode="wait">
              <motion.p
                key={currentText}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-base md:text-lg leading-relaxed min-h-[60px]"
              >
                {currentText}
              </motion.p>
            </AnimatePresence>

            {/* Click to Continue Indicator */}
            {!showChoices && !currentScene.isEnd && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bottom-4 right-4 text-white/40 text-xs font-mono uppercase"
              >
                Click to continue ▼
              </motion.div>
            )}
          </div>

          {/* Choices */}
          {showChoices && currentScene.choices && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-3"
            >
              {currentScene.choices.map((choice, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => handleChoice(choice.nextScene)}
                  className="w-full text-left px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/30 rounded-xl font-mono text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {choice.text}
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* End of Chapter */}
          {currentScene.isEnd && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/"
                className="px-8 py-4 bg-gradient-to-r from-accent to-emerald-400 text-black font-mono text-sm uppercase tracking-wider rounded-lg text-center hover:from-emerald-400 hover:to-accent transition-all shadow-lg"
              >
                Back to Home
              </Link>
              {currentScene.chapter < 4 && (
                <button
                  onClick={() => {
                    const nextChapter = currentScene.chapter + 1;
                    const nextSceneIdx = allScenes.findIndex(s => s.chapter === nextChapter);
                    if (nextSceneIdx !== -1) {
                      setCurrentSceneIndex(nextSceneIdx);
                    }
                  }}
                  className="px-8 py-4 bg-white/10 text-white font-mono text-sm uppercase tracking-wider rounded-lg hover:bg-white/20 transition-all flex items-center gap-2"
                >
                  Next Chapter
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
