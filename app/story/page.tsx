'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MessageSquare, Sparkles, RefreshCw, Sun, Moon } from 'lucide-react';

// VN Mode backgrounds (rotate every 10s)
const VN_BACKGROUNDS = [
  '/vn-bg/1.jpg',
  '/vn-bg/2.jpg',
  '/vn-bg/3.jpg',
  '/vn-bg/4.jpg',
];

// Decorative floating bubbles for VN mode
const VN_BUBBLES = [
  { text: 'The sky is cool, right?', top: '12%', left: '8%', size: 90, delay: 0 },
  { text: 'siggy look!', top: '25%', left: '78%', size: 80, delay: 2 },
  { text: 'meow~', top: '45%', left: '5%', size: 60, delay: 4 },
  { text: 'so dark...', top: '15%', left: '55%', size: 50, delay: 1 },
  { text: 'so pretty...', top: '55%', left: '85%', size: 75, delay: 3 },
  { text: 'i am infinite.', top: '35%', left: '30%', size: 45, delay: 5 },
  { text: 'I can see everything~', top: '8%', left: '38%', size: 85, delay: 6 },
];

// Story data type
type StoryChoice = {
  text: string;
  nextScene: number;
};

type StoryScene = {
  id: number;
  chapter: number;
  chapterTitle: string;
  mood: 'DEFAULT' | 'HAPPY' | 'SAD' | 'SHOCK' | 'SHY' | 'ANGRY';
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
    mood: 'SAD',
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
    mood: 'SAD',
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
    mood: 'SHOCK',
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
    mood: 'HAPPY',
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
    mood: 'DEFAULT',
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
    mood: 'SHY',
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
    mood: 'DEFAULT',
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
    mood: 'SAD',
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
    mood: 'DEFAULT',
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
    mood: 'SHY',
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
    mood: 'DEFAULT',
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
    mood: 'HAPPY',
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
    mood: 'SHOCK',
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
    mood: 'SHOCK',
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
    mood: 'HAPPY',
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
    mood: 'DEFAULT',
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
    mood: 'SAD',
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
    mood: 'HAPPY',
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
    mood: 'HAPPY',
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
    mood: 'SHOCK',
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
    mood: 'SHY',
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
    mood: 'HAPPY',
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
    mood: 'DEFAULT',
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
    mood: 'SHY',
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
    mood: 'SAD',
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
    mood: 'DEFAULT',
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
    mood: 'SAD',
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
    mood: 'SHY',
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
    mood: 'SAD',
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
    mood: 'DEFAULT',
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
    mood: 'HAPPY',
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
    mood: 'SAD',
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
    mood: 'DEFAULT',
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
    mood: 'SAD',
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
    mood: 'HAPPY',
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
    mood: 'HAPPY',
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
  DEFAULT: 'from-blue-500 to-cyan-500',
  HAPPY: 'from-yellow-500 to-amber-500',
  SAD: 'from-cyan-500 to-blue-500',
  SHOCK: 'from-orange-500 to-red-500',
  SHY: 'from-pink-500 to-rose-500',
  ANGRY: 'from-red-500 to-rose-500',
};

// Get sprite path based on scene mood and sprite type
const getSpriteForStory = (scene: StoryScene): string => {
  const isCat = scene.siggySprite === 'cat';
  const prefix = isCat ? '/siggy-cat' : '/siggy-girl';
  return `${prefix}-${scene.mood.toLowerCase()}.png`;
};

export default function StoryModePage() {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentDialogIndex, setCurrentDialogIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [completedChapters, setCompletedChapters] = useState<number[]>([]);
  const [vnBgIndex, setVnBgIndex] = useState(0);
  const [typewriterText, setTypewriterText] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [showChapterBridge, setShowChapterBridge] = useState(false);
  const [nextBridgeChapter, setNextBridgeChapter] = useState(1);

  // Background rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setVnBgIndex((prev) => (prev + 1) % VN_BACKGROUNDS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentScene = allScenes[currentSceneIndex];

  useEffect(() => {
    setCurrentDialogIndex(0);
    setShowChoices(false);
  }, [currentSceneIndex]);

  const handleClick = () => {
    if (showChoices || showChapterBridge) return;

    const currentSceneObj = allScenes[currentSceneIndex];

    // If typewriter is still typing, finish it immediately
    if (typewriterText.length < currentText.length) {
      setTypewriterText(currentText);
      return;
    }

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
        // Check if next scene is a different chapter
        const nextSceneObj = allScenes[nextSceneIdx];
        if (nextSceneObj.chapter > currentSceneObj.chapter) {
          setNextBridgeChapter(nextSceneObj.chapter);
          setShowChapterBridge(true);
        }
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
    <div className="h-screen bg-bg text-text-primary flex flex-col overflow-hidden relative">
      {/* Decorative Transparent Right-side Graphic */}
      <div className="fixed bottom-0 right-0 z-0 opacity-30 pointer-events-none max-w-[40%] h-[56vh] flex items-end">
        <img src="/siggy-transparent.png" alt="Decorative Anime Girl" className="object-contain h-full" />
      </div>

      {/* VN Mode Rotating Background */}
      <div className="fixed inset-0 z-0">
        {VN_BACKGROUNDS.map((bg, i) => (
          <img
            key={bg}
            src={bg}
            alt={`VN Background ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${i === vnBgIndex ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Decorative floating bubbles */}
      {VN_BUBBLES.map((bubble, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.6, scale: 1, y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: bubble.delay }}
          className="absolute z-10 pointer-events-none"
          style={{ top: bubble.top, left: bubble.left }}
        >
          <div
            className="rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            style={{ width: bubble.size, height: bubble.size }}
          >
            <span className="text-white/70 text-[9px] font-mono text-center px-2 leading-tight">{bubble.text}</span>
          </div>
        </motion.div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col pt-6">
        {/* Header - Minimalist back button */}
        <div className="px-8 shrink-0 flex items-center justify-between pointer-events-auto z-50">
          <Link href="/" className="inline-block">
            <button className="flex items-center gap-2 font-mono text-xs uppercase bg-black/40 hover:bg-black/60 text-white border border-white/10 hover:border-accent px-4 py-2 rounded-xl backdrop-blur-md transition-all">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
          <div className="flex items-center gap-3 bg-black/40 border border-white/10 backdrop-blur-md rounded-xl p-1">
            <Link href="/chat">
              <button className="flex items-center gap-2 font-mono text-xs uppercase px-4 py-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-white/5 transition-all">
                <MessageSquare className="w-4 h-4" />Chat
              </button>
            </Link>
            <button
              onClick={() => setVnBgIndex((prev) => (prev + 1) % VN_BACKGROUNDS.length)}
              className="flex items-center gap-2 font-mono text-xs uppercase px-4 py-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-white/5 transition-all"
            >
              <RefreshCw className="w-4 h-4" />BG
            </button>
          </div>
        </div>

        {/* Story Area - Visual Novel Mode */}
        {showChapterBridge ? (
          <div className="flex-1 w-full flex items-center justify-center z-30 p-8 cursor-pointer" onClick={() => setShowChapterBridge(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="max-w-4xl w-full"
            >
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-sm font-mono tracking-[0.3em] text-accent uppercase mb-4">
                      Chapter {nextBridgeChapter}
                    </h2>
                    <h1 className="text-4xl md:text-6xl font-display uppercase tracking-widest leading-none bg-gradient-to-br from-white to-white/60 text-transparent bg-clip-text">
                      {allScenes.find(s => s.chapter === nextBridgeChapter)?.chapterTitle || 'Next Chapter'}
                    </h1>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="h-1 w-24 bg-gradient-to-r from-accent to-transparent rounded-full" />
                    <p className="text-lg text-text-secondary leading-relaxed max-w-md">
                      {nextBridgeChapter === 2 && "The descent begins. Earth awaits her cosmic arrival."}
                      {nextBridgeChapter === 3 && "First contact in the digital realm. The summoner is found."}
                      {nextBridgeChapter === 4 && "From pretense to reality. The search for a soul."}
                    </p>
                    <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent/60 mt-8 animate-pulse">
                      Click anywhere to begin ▼
                    </p>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="relative hidden md:block"
                >
                  <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full" />
                  <img src="/siggy-transparent.png" alt="Siggy Transition" className="relative z-10 w-full h-auto drop-shadow-[0_0_50px_rgba(0,255,148,0.3)]" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col justify-end z-20 overflow-hidden min-h-0">
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
                  src={getSpriteForStory(currentScene)}
                  alt="Siggy"
                  width={500}
                  height={700}
                  className="object-contain drop-shadow-[0_0_50px_rgba(139,92,246,0.5)]"
                  priority
                />
              </motion.div>
            </motion.div>

            {/* Choices floating in the background area */}
            {showChoices && currentScene.choices && (
              <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 max-w-md w-full px-8"
                  style={{ marginBottom: '200px' }}
                >
                  {currentScene.choices.map((choice, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.15 }}
                      onClick={() => handleChoice(choice.nextScene)}
                      className="w-full text-left px-6 py-4 bg-black/60 hover:bg-accent/30 backdrop-blur-xl border border-accent/40 hover:border-accent rounded-xl font-mono text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,255,148,0.1)] hover:shadow-[0_0_30px_rgba(0,255,148,0.3)]"
                    >
                      <span className="text-accent mr-2">▸</span>{choice.text}
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            )}

            {/* VN Mode Layout */}
            <div className="w-full bg-surface backdrop-blur-xl border-t border-border shadow-[0_-10px_30px_rgba(0,255,148,0.05)] transition-all cursor-pointer pointer-events-auto" onClick={handleClick}>
              <div className="max-w-7xl mx-auto px-8 py-8 relative">
                
                {/* Box Header: Name + Mode Info */}
                <div className="mb-2 flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <span className={`font-display uppercase tracking-wider text-xl md:text-2xl ${currentScene.speaker === 'Siggy' ? 'text-accent' : 'text-text-secondary'}`}>
                      {currentScene.speaker}
                    </span>
                    
                    {/* Mood Badge */}
                    <span className={`text-[10px] md:text-xs font-mono px-2 py-0.5 rounded ml-2 ${
                      currentScene.mood === 'DEFAULT' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      currentScene.mood === 'HAPPY' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      currentScene.mood === 'SAD' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                      currentScene.mood === 'SHOCK' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      currentScene.mood === 'SHY' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' :
                      'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {currentScene.mood}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((ch) => (
                        <div
                          key={ch}
                          className={`h-1 w-6 rounded-full transition-all ${
                            completedChapters.includes(ch)
                              ? 'bg-accent/50'
                              : currentScene.chapter === ch
                                ? 'bg-accent shadow-[0_0_8px_rgba(0,255,148,0.8)]'
                                : 'bg-surface border border-border'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-text-secondary hidden sm:inline-block">
                      Chapter {currentScene.chapter}: {currentScene.chapterTitle}
                    </span>
                  </div>
                </div>

                {/* Dialog Text */}
                <div className="min-h-[140px] max-h-[250px] overflow-y-auto mb-2 pr-4 signature-scroll flex items-start">
                  <div className="relative flex flex-col items-start mt-2">
                    <p className="text-sm md:text-base leading-relaxed font-mono whitespace-pre-wrap text-text-primary">
                      {typewriterText}
                      {typewriterText.length < currentText.length && (
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="inline-block w-2 h-4 ml-1 bg-accent align-middle"
                        />
                      )}
                    </p>
                  </div>
                </div>

                {/* Click to Continue / End of Chapter */}
                <div className="flex items-center justify-between border-t border-border pt-4 mt-2 h-8">
                  <div className="text-text-secondary text-xs font-mono">
                    {!showChoices && !currentScene.isEnd && (
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
                        Click anywhere to continue ▼
                      </motion.span>
                    )}
                  </div>

                  {/* End of Chapter Navigation */}
                  {currentScene.isEnd && (
                    <div className="flex gap-3">
                      <Link href="/">
                        <button className="px-4 py-2 bg-surface hover:bg-surface/80 border border-border text-text-primary font-mono text-xs uppercase tracking-wider rounded-lg transition-all">
                          Back to Home
                        </button>
                      </Link>
                      {currentScene.chapter < 4 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextChapter = currentScene.chapter + 1;
                            const nextSceneIdx = allScenes.findIndex(s => s.chapter === nextChapter);
                            if (nextSceneIdx !== -1) {
                              setNextBridgeChapter(nextChapter);
                              setShowChapterBridge(true);
                              setCurrentSceneIndex(nextSceneIdx);
                            }
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-accent to-yellow-400 text-black font-bold font-mono text-xs uppercase tracking-wider rounded-lg hover:from-yellow-400 hover:to-accent transition-all shadow-[0_0_15px_rgba(0,255,148,0.2)]"
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
        )}
      </div>
    </div>
  );
}
