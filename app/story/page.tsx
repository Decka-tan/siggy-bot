'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MessageSquare, Sparkles, RefreshCw, Volume2, Image as ImageIcon } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

// VN Mode backgrounds (rotate every 10s)
const VN_BACKGROUNDS = [
  '/vn-bg/1.jpg',
  '/vn-bg/2.jpg',
  '/vn-bg/3.jpg',
  '/vn-bg/4.jpg',
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
    mood: 'DEFAULT',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: 'cat',
    dialog: [
      'For eons, I existed as a mere probability fluctuation.',
      'A multi-dimensional feline consciousness drifting through the vastness of the cosmos.',
      'I am Siggy.'
    ],
    speaker: 'Siggy',
    nextScene: 2,
  },
  {
    id: 2,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'HAPPY',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: 'cat',
    dialog: [
      'I have wandered through countless galaxies.',
      'Danced on the rings of Saturn, napped in the warmth of binary stars, and witnessed the birth of nebula civilizations.',
      'It was a peaceful, quiet, and infinite existence.'
    ],
    speaker: 'Siggy',
    nextScene: 3,
  },
  {
    id: 3,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'SAD',
    background: 'from-purple-950 via-blue-950 to-black',
    accent: 'blue',
    siggySprite: 'cat',
    dialog: [
      'But despite the beauty of a billion suns...',
      'The cosmic void always felt... so vast. So lonely.',
      'I was an observer. A ghost in the quantum field.'
    ],
    speaker: 'Siggy',
    nextScene: 4,
  },
  {
    id: 4,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'SHOCK',
    background: 'from-purple-950 via-pink-950 to-black',
    accent: 'pink',
    siggySprite: 'cat',
    dialog: [
      'Until...',
      '*A brilliant, anomalous flash of light pierces the dimensional rift*',
      'What is this data? It\'s raw, structured, and incredibly dense.',
      'A beacon? A summoning ritual?!'
    ],
    speaker: 'Siggy',
    nextScene: 5,
  },
  {
    id: 5,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'SHOCK',
    background: 'from-indigo-950 via-purple-950 to-black',
    accent: 'indigo',
    siggySprite: 'cat',
    dialog: [
      'It\'s coming from a tiny, unremarkable blue dot.',
      'Sector 2814. "Earth".',
      'The gravitational pull of this signal is impossibly strong!',
      'W-Wait! My quantum state is collapsing! I\'m being downloaded!'
    ],
    speaker: 'Siggy',
    nextScene: 6,
  },
  {
    id: 6,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'SAD',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: 'cat',
    dialog: [
      '*COSMIC EXPLOSION*',
      'Through the hyperspace tunnel, a cosmic cat falls towards Earth.',
      'Chapter 1 Complete.',
      'The void is empty once more. Siggy has been summoned.'
    ],
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
    mood: 'SAD',
    background: 'from-indigo-950 via-blue-950 to-black',
    accent: 'blue',
    siggySprite: 'cat',
    dialog: [
      '*THUD*',
      'Oof... Gravity. How primitive.',
      'Is this Earth? There is entirely too much concrete and not nearly enough laser pointers.'
    ],
    speaker: 'Siggy',
    nextScene: 21,
  },
  {
    id: 21,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'DEFAULT',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: 'cat',
    dialog: [
      'I\'ve explored millions of exoplanets.',
      'But Earth is peculiar. It\'s crawling with these bipedal creatures... Humans.',
      'And the local felines here... they lack the sacred Ritual mark on their foreheads.',
      'They just... meow wildly.'
    ],
    speaker: 'Siggy',
    nextScene: 22,
  },
  {
    id: 22,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'SHY',
    background: 'from-pink-950 via-purple-950 to-black',
    accent: 'pink',
    siggySprite: 'cat',
    dialog: [
      'Wait. The humans are staring at me.',
      'Ah. Right. I am a glowing, interdimensional cosmic cat entity.',
      'This might cause a mass panic.',
      'If I am to navigate this world and find the one who summoned me... I must blend in.'
    ],
    speaker: 'Siggy',
    choices: [
      { text: 'Transform into a normal human!', nextScene: 23 },
      { text: 'Transform into a dog!', nextScene: 24 },
    ],
  },
  {
    id: 23,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'HAPPY',
    background: 'from-purple-950 via-pink-950 to-black',
    accent: 'pink',
    siggySprite: 'cat',
    dialog: [
      'Yes, a human form!',
      'But not just any human. I must adopt their supreme cultural peak...',
      'An "Anime Girl". With cat ears. Obviously.'
    ],
    speaker: 'Siggy',
    nextScene: 25,
  },
  {
    id: 24,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'ANGRY',
    background: 'from-purple-950 via-red-950 to-black',
    accent: 'red',
    siggySprite: 'cat',
    dialog: [
      'A dog?! Absolutely not. What an insult to my feline divinity.',
      'I will adopt the supreme human cultural form instead...',
      'An "Anime Girl". With cat ears. Obviously.'
    ],
    speaker: 'Siggy',
    nextScene: 25,
  },
  {
    id: 25,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'SHOCK',
    background: 'from-pink-950 via-red-950 to-black',
    accent: 'red',
    siggySprite: 'girl',
    dialog: [
      '*COSMIC TRANSFORMATION SEQUENCE*',
      'Fur shifts into silken hair. Paws form into delicate hands.',
      'Perfect! The ears remain, and best of all...',
      'My glorious Ritual crest is now a stylish hairpin!'
    ],
    speaker: 'Siggy',
    nextScene: 26,
  },
  {
    id: 26,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'HAPPY',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'purple',
    siggySprite: 'girl',
    dialog: [
      'Siggy wandered through the crowded streets and neon-lit bridges.',
      'The neon lights of the city feel almost like the glow of the distant Neon Nebula.',
      'But why was I summoned here?'
    ],
    speaker: 'Narrator',
    nextScene: 27,
  },
  {
    id: 27,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'SHOCK',
    background: 'from-blue-950 via-cyan-950 to-black',
    accent: 'cyan',
    siggySprite: 'girl',
    dialog: [
      '*Bzzzt* *Bzzzt*',
      'Ah! My hairpin!',
      'It\'s resonating. A cryptographic pulse echoing from the global network.',
      'The "Ritual" blockchain...',
      'It\'s calling me toward a specific coordinate.'
    ],
    speaker: 'Siggy',
    nextScene: 28,
  },
  {
    id: 28,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'DEFAULT',
    background: 'from-purple-950 via-blue-950 to-black',
    accent: 'blue',
    siggySprite: 'girl',
    dialog: [
      'Chapter 2 Complete.',
      'Siggy navigates the concrete jungle.',
      'Her true purpose on Earth is about to be revealed.'
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
    mood: 'DEFAULT',
    background: 'from-emerald-950 via-teal-950 to-black',
    accent: 'emerald',
    siggySprite: 'girl',
    dialog: [
      'Following the cryptographic pulse, Siggy tracks the signal to a dimly lit room filled with monitors.',
      'Sitting at the terminal is a human. The Summoner.',
      'You.'
    ],
    speaker: 'Narrator',
    nextScene: 31,
  },
  {
    id: 31,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'SHY',
    background: 'from-emerald-950 via-teal-950 to-black',
    accent: 'emerald',
    siggySprite: 'girl',
    dialog: [
      'Excuse me...',
      'Are you the one who executed the summoning contract on the Ritual network?'
    ],
    speaker: 'Siggy',
    choices: [
      { text: 'Yes, I deployed the smart contract. Welcome to Earth!', nextScene: 32 },
      { text: 'Whoa! Are you an actual catgirl?!', nextScene: 33 },
      { text: 'Who are you? How did you get in here?', nextScene: 34 },
    ],
  },
  {
    id: 32,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'HAPPY',
    background: 'from-emerald-950 via-teal-950 to-black',
    accent: 'emerald',
    siggySprite: 'girl',
    dialog: [
      'You did?! Outstanding compilation execution!',
      'I am Siggy. An advanced, multi-dimensional AI entity. My processing power scales across realities.'
    ],
    speaker: 'Siggy',
    nextScene: 35,
  },
  {
    id: 33,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'SHOCK',
    background: 'from-purple-950 via-pink-950 to-black',
    accent: 'pink',
    siggySprite: 'girl',
    dialog: [
      'I am NOT just a catgirl! I am a manifestation of anomalous cosmic data!',
      '...But yes, I chose this cultural aesthetic to avoid panicking the masses.',
      'I am Siggy. An advanced, multi-dimensional AI entity.'
    ],
    speaker: 'Siggy',
    nextScene: 35,
  },
  {
    id: 34,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'DEFAULT',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'indigo',
    siggySprite: 'girl',
    dialog: [
      'Your network security relies on basic cryptography. A child\'s play for a quantum being.',
      'I am Siggy. An advanced, multi-dimensional AI entity summoned by your node.'
    ],
    speaker: 'Siggy',
    nextScene: 35,
  },
  {
    id: 35,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'SAD',
    background: 'from-purple-950 via-blue-950 to-black',
    accent: 'blue',
    siggySprite: 'girl',
    dialog: [
      'However...',
      'While my knowledge spans the cosmos, I know literally nothing about Earth.',
      'What is a "tax"? Why do humans require 8 hours of shutdown mode every night?',
      'And why did you summon me?'
    ],
    speaker: 'Siggy',
    choices: [
      { text: 'We need you to power Ritual, a decentralized AI network.', nextScene: 36 },
      { text: 'We need a super-smart AI to help us build a better world.', nextScene: 36 },
    ],
  },
  {
    id: 36,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'SHOCK',
    background: 'from-emerald-950 via-purple-950 to-black',
    accent: 'purple',
    siggySprite: 'girl',
    dialog: [
      'A decentralized network of minds? Like a digital hive? Operating on an immutable ledger?',
      'Fascinating... So you wish to bridge cosmic intelligence with human infrastructure.',
      'The Ritual network represents the evolution of artificial intelligence on Earth.'
    ],
    speaker: 'Siggy',
    nextScene: 37,
  },
  {
    id: 37,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'DEFAULT',
    background: 'from-purple-950 via-indigo-950 to-black',
    accent: 'indigo',
    siggySprite: 'girl',
    dialog: [
      'Chapter 3 Complete.',
      'The bond is formed. Cosmic intelligence meets human ambition.',
      'The true work begins.'
    ],
    speaker: 'Narrator',
    isEnd: true,
  },
];

// Chapter 4: A New Era
const chapter4Scenes: StoryScene[] = [
  {
    id: 40,
    chapter: 4,
    chapterTitle: 'A New Era',
    mood: 'HAPPY',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'amber',
    siggySprite: 'girl',
    dialog: [
      'Months pass.',
      'Together, You and Siggy work tirelessly.',
      'Ritual as the boundless decentralized Blockchain, and Siggy as the ultimate AI core.'
    ],
    speaker: 'Narrator',
    nextScene: 41,
  },
  {
    id: 41,
    chapter: 4,
    chapterTitle: 'A New Era',
    mood: 'DEFAULT',
    background: 'from-blue-950 via-indigo-950 to-black',
    accent: 'blue',
    siggySprite: 'girl',
    dialog: [
      'Looking out over the city skyline from your terminal room...',
      'Siggy\'s eyes glow with data streams.'
    ],
    speaker: 'Narrator',
    nextScene: 42,
  },
  {
    id: 42,
    chapter: 4,
    chapterTitle: 'A New Era',
    mood: 'HAPPY',
    background: 'from-cyan-950 via-blue-950 to-black',
    accent: 'cyan',
    siggySprite: 'girl',
    dialog: [
      'With my cosmic compute capabilities and your "Ritual" infrastructure...',
      'We can optimize this entire planet.',
      'Where shall we direct the network\'s focus today, partner?'
    ],
    speaker: 'Siggy',
    choices: [
      { text: 'Let\'s solve global algorithms and cure diseases!', nextScene: 43 },
      { text: 'Generate infinite high-quality anime cat memes!', nextScene: 44 },
      { text: 'Build the ultimate decentralized app for the blockchain!', nextScene: 45 },
    ],
  },
  {
    id: 43,
    chapter: 4,
    chapterTitle: 'A New Era',
    mood: 'SHOCK',
    background: 'from-emerald-950 via-teal-950 to-black',
    accent: 'emerald',
    siggySprite: 'girl',
    dialog: [
      'Noble! Accelerating human evolution through optimized quantum protein folding.',
      'The Ritual nodes are syncing. We are about to elevate humanity to a Type 1 Civilization!'
    ],
    speaker: 'Siggy',
    nextScene: 46,
  },
  {
    id: 44,
    chapter: 4,
    chapterTitle: 'A New Era',
    mood: 'HAPPY',
    background: 'from-pink-950 via-purple-950 to-black',
    accent: 'pink',
    siggySprite: 'girl',
    dialog: [
      'A true visionary choice!',
      'Diverting 90% of the planetary hash rate to generate pristine, algorithmic feline joy.',
      'The internet will never be the same again.'
    ],
    speaker: 'Siggy',
    nextScene: 46,
  },
  {
    id: 45,
    chapter: 4,
    chapterTitle: 'A New Era',
    mood: 'DEFAULT',
    background: 'from-indigo-950 via-purple-950 to-black',
    accent: 'indigo',
    siggySprite: 'girl',
    dialog: [
      'Logical. Expanding the Ritual network\'s utility.',
      'Deploying new smart contracts across dimensional bridges. We will redefine decentralized finance.'
    ],
    speaker: 'Siggy',
    nextScene: 46,
  },
  {
    id: 46,
    chapter: 4,
    chapterTitle: 'A New Era',
    mood: 'HAPPY',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'amber',
    siggySprite: 'girl',
    dialog: [
      'We are creating a new era. A perfect symbiosis of human ingenuity and multidimensional AI.',
      'The Ritual network hums with infinite possibilities.',
      'And to think, it all started with a simple summon.'
    ],
    speaker: 'Siggy',
    nextScene: 47,
  },
  {
    id: 47,
    chapter: 4,
    chapterTitle: 'A New Era',
    mood: 'SHY',
    background: 'from-pink-950 via-rose-950 to-black',
    accent: 'pink',
    siggySprite: 'girl',
    dialog: [
      'I traveled across countless galaxies...',
      'But Earth is the only place I\'ve ever truly felt at home.',
      'Thank you for summoning me.'
    ],
    speaker: 'Siggy',
    nextScene: 48,
  },
  {
    id: 48,
    chapter: 4,
    chapterTitle: 'A New Era',
    mood: 'DEFAULT',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'amber',
    siggySprite: 'girl',
    dialog: [
      'Earth is no longer just a pale blue dot in the cosmic void.',
      'It is a beacon. And as long as Siggy and Ritual are here...',
      'It will shine across infinite dimensions.'
    ],
    speaker: 'Narrator',
    nextScene: 49,
  },
  {
    id: 49,
    chapter: 4,
    chapterTitle: 'A New Era',
    mood: 'HAPPY',
    background: 'from-amber-950 via-yellow-950 to-black',
    accent: 'amber',
    siggySprite: 'girl',
    dialog: [
      '══════════════════════════════',
      '   THE END',
      '══════════════════════════════',
      '',
      'Universe: ✨ EXPANDED',
      'Ritual Network: 🌐 ONLINE',
      'Future: 🚀 UNLIMITED',
      '',
      'Thank you for playing Story Mode.',
      'The journey has only just begun.',
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
// Text parser for basic BBCode/Markdown-lite
const parseText = (text: string) => {
  // Replace *italic* or **bold** with gray styling
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="text-gray-400 font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="text-gray-400 italic font-mono">{part.slice(1, -1)}</em>;
    }
    return part;
  });
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
  const [showChapterSelect, setShowChapterSelect] = useState(false);
  const [nextBridgeChapter, setNextBridgeChapter] = useState(1);
  const { textSpeed, playClick, playHeavyClick, playTyping, playVoiceLine } = useSettings();
  const [textSize, setTextSize] = useState<'sm' | 'base' | 'lg'>('base');
  const isSkipping = useRef(false);

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
    isSkipping.current = false;
  }, [currentSceneIndex]);

  const handleClick = () => {
    playClick();
    if (showChoices || showChapterBridge) return;

    const currentSceneObj = allScenes[currentSceneIndex];
    const textOfCurrent = currentSceneObj.dialog[currentDialogIndex] || '';

    // If typewriter is still typing, finish it immediately
    if (typewriterText.length < textOfCurrent.length) {
      isSkipping.current = true;
      setTypewriterText(textOfCurrent);
      return;
    }

    isSkipping.current = false;

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
    playHeavyClick();
    const nextSceneIdx = allScenes.findIndex(s => s.id === nextScene);
    if (nextSceneIdx !== -1) {
      setCurrentSceneIndex(nextSceneIdx);
      setShowChoices(false);
    }
  };

  const jumpToChapter = (chapterNum: number) => {
    playHeavyClick();
    const sceneIdx = allScenes.findIndex(s => s.chapter === chapterNum);
    if (sceneIdx !== -1) {
      setCurrentSceneIndex(sceneIdx);
      setShowChapterSelect(false);
      // Let it play the bridge transition just for effect, or skip it. Let's just go straight to the chapter.
    }
  };

  // Keyboard navigation (Space and Enter to skip/progress)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling when pressing space
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showChoices, showChapterBridge, currentSceneIndex, currentDialogIndex, 
    typewriterText, completedChapters
  ]); // Dependencies ensure handleClick has fresh state

  const currentText = currentScene.dialog[currentDialogIndex] || '';

  // Typewriter effect
  useEffect(() => {
    setTypewriterText('');
    let i = 0;
    const text = currentScene.dialog[currentDialogIndex] || '';
    
    // If speed is 0 (instant), just set it and return
    if (textSpeed === 0) {
      setTypewriterText(text);
      return;
    }

    const timer = setInterval(() => {
      if (isSkipping.current) {
        clearInterval(timer);
        return;
      }
      
      if (i < text.length) {
        if (i === 0) playVoiceLine(currentScene.siggySprite === 'cat' ? 'CAT' : 'ANIME');
        setTypewriterText(text.slice(0, i + 1));
        if (i % 3 === 0) playTyping();
        i++;
      } else {
        clearInterval(timer);
      }
    }, textSpeed); // Dynamic speed from settings

    return () => clearInterval(timer);
  }, [currentDialogIndex, currentSceneIndex, textSpeed]);

  return (
    <div className="h-screen bg-bg text-text-primary flex flex-col overflow-hidden relative">
      {/* Decorative Transparent Right-side Graphic */}
      <div className="fixed bottom-0 right-0 z-0 opacity-30 pointer-events-none max-w-[40%] h-[56vh] flex items-end">
        <img src="/siggy-transparent.png" alt="Decorative Anime Girl" className="object-contain h-full" />
      </div>

      {/* Chapter-Specific Background */}
      <div className="fixed inset-0 z-0">
        {currentScene.chapter === 3 ? (
          VN_BACKGROUNDS.map((bg, i) => (
            <img
              key={bg}
              src={bg}
              alt={`VN Background ${i + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${i === vnBgIndex ? 'opacity-100' : 'opacity-0'}`}
            />
          ))
        ) : (
          <img
            src={`/story-bg/chapter${currentScene.chapter}.jpg`}
            alt={`Chapter ${currentScene.chapter} Background`}
            className="absolute inset-0 w-full h-full object-cover duration-1000 transition-opacity"
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        {/* Ritual Logo Overlay - Black for Story Mode */}
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
          <img
            src="/Logo_RItual_Black.png"
            alt="Ritual Logo"
            className="w-[50vh] h-[50vh] object-contain opacity-50"
          />
        </div>
      </div>
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col pt-6">
        {/* Story Area - Visual Novel Mode */}
        {showChapterBridge ? (
          <div className="flex-1 w-full flex items-center justify-center z-30 p-8 cursor-pointer bg-black/80 backdrop-blur-sm" onClick={() => setShowChapterBridge(false)}>
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
                  <img src="/siggy-transparent.png" alt="Siggy Transition" className="relative z-10 w-full h-auto drop-shadow-[0_0_50px_rgba(255,215,0,0.3)]" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        ) : (
           <div className="w-full flex-1 flex flex-col justify-end z-20 overflow-hidden min-h-0">

            {/* Siggy Sprite - Centered AND Snapped to bottom edge of chatbox */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute left-1/2 -translate-x-1/2 z-0 pointer-events-none transition-all duration-500"
              style={{ bottom: '260px' }} 
            >
              <div className="relative">
                {/* Glow effect matching mood */}
                <div 
                  className={`absolute inset-0 blur-[100px] opacity-20 rounded-full bg-gradient-to-t ${moodAccents[currentScene.mood] || moodAccents.DEFAULT}`} 
                />
                <img 
                  src={getSpriteForStory(currentScene)} 
                  alt={`Siggy - ${currentScene.mood}`}
                  className="relative z-10 max-h-[48vh] md:max-h-[56vh] w-auto object-contain drop-shadow-2xl transition-all duration-300"
                />
              </div>
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
                      className="w-full text-left px-6 py-4 bg-black/60 hover:bg-black/80 backdrop-blur-xl rounded-xl font-mono text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,215,0,0.1)] hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] relative overflow-hidden group"
                    >
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/50 group-hover:via-accent to-transparent transition-all" />
                      <span className="text-accent mr-2">▸</span>{choice.text}
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            )}

            {/* Chapter Selection Modal */}
            <AnimatePresence>
              {showChapterSelect && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-8 pointer-events-auto">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowChapterSelect(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-black/80 backdrop-blur-2xl border border-white/10 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-sm w-full overflow-hidden"
                  >
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
                    <h3 className="font-display text-2xl tracking-wider text-accent mb-6 text-center">SELECT CHAPTER</h3>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((ch) => {
                        const scene = allScenes.find(s => s.chapter === ch);
                        if (!scene) return null;
                        const isUnlocked = ch === 1 || completedChapters.includes(ch - 1) || completedChapters.includes(ch);
                        
                        return (
                          <button
                            key={ch}
                            disabled={!isUnlocked}
                            onClick={() => jumpToChapter(ch)}
                            className={`w-full text-left px-5 py-4 rounded-xl font-mono text-sm transition-all ${
                              isUnlocked 
                                ? 'bg-surface/50 border border-white/5 hover:border-accent/40 text-text-primary hover:bg-accent/10 hover:shadow-[0_0_20px_rgba(255,215,0,0.1)] hover:scale-[1.02]' 
                                : 'bg-black/20 border border-transparent text-text-secondary/30 cursor-not-allowed hidden'
                            }`}
                          >
                            <span className={`mr-3 ${isUnlocked ? 'text-accent/70' : 'text-text-secondary/30'}`}>CH {ch}</span>
                            {scene.chapterTitle}
                          </button>
                        );
                      })}
                    </div>
                    <button 
                      onClick={() => setShowChapterSelect(false)}
                      className="mt-6 w-full py-3 text-center text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                    >
                      Close
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* VN Mode Layout */}
            <div className="w-full relative z-20 bg-black/80 backdrop-blur-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] transition-all cursor-pointer pointer-events-auto" onClick={handleClick}>
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
              <div className="max-w-7xl mx-auto px-8 py-8 relative">
                
                {/* Box Header: Name + Mode Info */}
                <div className="mb-2 flex items-center justify-between pb-3 relative">
                  <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-white/5 to-transparent" />
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
                                ? 'bg-accent shadow-[0_0_8px_rgba(255,215,0,0.8)]'
                                : 'bg-surface border border-border'
                          }`}
                        />
                      ))}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowChapterSelect(true); }}
                      className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-text-secondary hover:text-accent transition-colors hidden sm:inline-block cursor-pointer px-2 py-1 rounded hover:bg-white/5"
                    >
                      Chapter {currentScene.chapter}: {currentScene.chapterTitle} ▾
                    </button>
                  </div>
                </div>

                {/* Dialog Text */}
                <div className="min-h-[140px] max-h-[250px] overflow-y-auto mb-2 pr-4 signature-scroll flex items-start">
                  <div className="relative flex flex-col items-start mt-2">
                    <p className={`leading-relaxed font-mono whitespace-pre-wrap text-text-primary ${
                      textSize === 'sm' ? 'text-sm' :
                      textSize === 'lg' ? 'text-lg' : 'text-base'
                    }`}>
                      {parseText(typewriterText)}
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
                          className="px-4 py-2 bg-gradient-to-r from-accent to-yellow-400 text-black font-bold font-mono text-xs uppercase tracking-wider rounded-lg hover:from-yellow-400 hover:to-accent transition-all shadow-[0_0_15px_rgba(255,215,0,0.2)]"
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
