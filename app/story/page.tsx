'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MessageSquare, Sparkles, RefreshCw, Sun, Moon } from 'lucide-react';

// Background system for Story Mode
const STORY_BACKGROUNDS = [
  '/vn-bg-1.png',
  '/vn-bg-2.png'
];

type ThemeMode = 'dark' | 'light';

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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
    siggySprite: 'cat',
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
  const [storyBackground, setStoryBackground] = useState(() => {
    return STORY_BACKGROUNDS[Math.floor(Math.random() * STORY_BACKGROUNDS.length)];
  });
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [typewriterText, setTypewriterText] = useState('');
  const [showSummary, setShowSummary] = useState(false);

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

  // Typewriter effect
  useEffect(() => {
    setTypewriterText('');
    let i = 0;
    const text = currentScene.dialog[currentDialogIndex] || '';
    const timer = setInterval(() => {
      if (i < text.length) {
        setTypewriterText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 30); // Speed of typewriter

    return () => clearInterval(timer);
  }, [currentDialogIndex, currentSceneIndex]);

  return (
    <div className={`h-screen flex flex-col overflow-hidden relative ${theme === 'dark' ? 'bg-bg text-text-primary' : 'bg-gray-100 text-gray-900'}`}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${storyBackground})` }} />
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-black/60' : 'bg-white/70'}`} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex flex-col">
        {/* Header */}
        <div className={`h-16 px-6 flex items-center justify-between shrink-0 backdrop-blur-sm ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-black/50 via-black/30 to-transparent'
            : 'bg-gradient-to-r from-purple-100/80 via-pink-100/60 to-transparent'
        }`}>
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-transparent hover:bg-transparent border-0">
              <button className={`flex items-center gap-2 font-mono text-xs uppercase bg-transparent hover:bg-transparent border-0 cursor-pointer ${theme === 'dark' ? 'text-text-secondary hover:text-text-primary' : 'text-gray-600 hover:text-gray-900'}`}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`flex items-center gap-2 font-mono text-xs uppercase transition-colors bg-transparent hover:bg-transparent border-0 cursor-pointer ${theme === 'dark' ? 'text-text-secondary hover:text-text-primary' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {theme === 'dark' ? <><Sun className="w-4 h-4" />Light</> : <><Moon className="w-4 h-4" />Dark</>}
            </button>
            <Link href="/chat">
              <button className={`flex items-center gap-2 font-mono text-xs uppercase transition-colors bg-transparent hover:bg-transparent border-0 cursor-pointer ${theme === 'dark' ? 'text-text-secondary hover:text-accent' : 'text-gray-600 hover:text-purple-600'}`}>
                <MessageSquare className="w-4 h-4" />Chat
              </button>
            </Link>
            <button
              onClick={() => setStoryBackground(STORY_BACKGROUNDS[(STORY_BACKGROUNDS.indexOf(storyBackground) + 1) % STORY_BACKGROUNDS.length])}
              className={`flex items-center gap-2 font-mono text-xs uppercase transition-colors bg-transparent hover:bg-transparent border-0 cursor-pointer ${theme === 'dark' ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
            >
              <RefreshCw className="w-4 h-4" />BG
            </button>
          </div>
        </div>

        {/* Story Area - Visual Novel Mode */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
          {/* VN Mode Sprites */}
          <>
            {/* Siggy Sprite - Centered */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-all duration-500"
              style={{ bottom: '300px' }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="transition-all duration-500 origin-bottom"
              >
                <Image
                  src={currentScene.speaker === 'Siggy' ? (currentScene.siggySprite === 'cat' ? '/siggy-cat.png' : '/siggy-anime.png') : '/siggy-anime.png'}
                  alt="Siggy"
                  width={500}
                  height={700}
                  className="object-contain drop-shadow-[0_0_50px_rgba(139,92,246,0.5)]"
                  priority
                />
              </motion.div>
            </motion.div>
          </>

          {/* VN Mode Layout */}
          <div className="absolute bottom-0 w-full flex flex-col z-20">

            {/* Name Tag */}
            <div className="flex justify-start max-w-7xl mx-auto w-full px-8 relative z-30">
              <div className={`px-8 py-2 rounded-t-xl shadow-[0_-5px_15px_rgba(0,0,0,0.3)] border-b-0 border ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-white/20'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 border-gray-300'
              }`}>
                <span className={`font-sans tracking-wider font-bold text-base md:text-xl drop-shadow-sm ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
                  {currentScene.speaker}
                </span>
              </div>
            </div>

            {/* Main Dialogue Box */}
            <div
              onClick={handleClick}
              className={`w-full backdrop-blur-xl border-t px-4 py-8 md:px-16 md:py-10 cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'bg-black/40 hover:bg-black/45 border-purple-500/30 shadow-[0_-10px_30px_rgba(139,92,246,0.3)]'
                  : 'bg-white/60 hover:bg-white/70 border-purple-300/30 shadow-[0_-10px_30px_rgba(139,92,246,0.2)]'
              }`}
            >
              <div className="max-w-7xl mx-auto">
                {/* Summary Toggle */}
                <div className="mb-3">
                  <button
                    onClick={() => setShowSummary(!showSummary)}
                    className={`text-xs font-mono uppercase tracking-wider hover:underline ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}
                  >
                    {showSummary ? '▼ Hide Summary' : '▶ Show Summary'}
                  </button>
                </div>

                {/* Summary Content */}
                {showSummary && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mb-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-black/30' : 'bg-white/50'}`}
                  >
                    <p className={`text-sm font-sans leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      <strong className={theme === 'dark' ? 'text-accent' : 'text-purple-600'}>Chapter {currentScene.chapter} Summary:</strong> This is {currentScene.chapterTitle.toLowerCase()}, where {currentScene.speaker === 'Narrator' ? 'the story begins to unfold' : currentScene.speaker === 'Siggy' ? 'Siggy shares her perspective' : 'you interact with the story'}. Current mood: {currentScene.mood.toLowerCase()}.
                    </p>
                  </motion.div>
                )}

                {/* Chapter Info */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((ch) => (
                      <div
                        key={ch}
                        className={`h-1 w-8 rounded-full transition-all ${
                          completedChapters.includes(ch)
                            ? 'bg-accent'
                            : currentScene.chapter === ch
                              ? 'bg-accent animate-pulse'
                              : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-xs uppercase tracking-widest text-white/60">
                    Chapter {currentScene.chapter}: {currentScene.chapterTitle}
                  </span>
                </div>

                {/* Dialog Text */}
                <div className="min-h-[120px] max-h-[200px] overflow-y-auto mb-4 pr-4">
                  <motion.p
                    key={currentText}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-lg md:text-xl leading-relaxed font-sans ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}
                  >
                    {typewriterText}
                    {typewriterText.length < currentText.length && (
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-0.5 h-5 ml-1 bg-current align-middle"
                      />
                    )}
                  </motion.p>
                </div>

                {/* Mood Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs font-mono px-3 py-1.5 rounded-full ${
                    currentScene.mood === 'PLAYFUL' ? 'bg-pink-500/20 border-pink-500/30 text-pink-400' :
                    currentScene.mood === 'MYSTERIOUS' ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' :
                    currentScene.mood === 'CHAOTIC' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                    'bg-amber-500/20 border-amber-500/30 text-amber-400'
                  }`}>
                    {currentScene.mood}
                  </span>
                </div>

                {/* Choices */}
                {showChoices && currentScene.choices && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 mb-4"
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

                {/* Click to Continue / End of Chapter */}
                <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2">
                  <div className="text-white/40 text-xs font-mono">
                    {!showChoices && !currentScene.isEnd && (
                      <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        Click to continue ▼
                      </motion.span>
                    )}
                  </div>

                  {/* End of Chapter Navigation */}
                  {currentScene.isEnd && (
                    <div className="flex gap-2">
                      <Link
                        href="/"
                        className="px-6 py-2 bg-gradient-to-r from-accent to-purple-500 text-black font-mono text-xs uppercase tracking-wider rounded-lg hover:from-purple-500 hover:to-accent transition-all"
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
                          className="px-6 py-2 bg-white/10 text-white font-mono text-xs uppercase tracking-wider rounded-lg hover:bg-white/20 transition-all"
                        >
                          Next Chapter →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
