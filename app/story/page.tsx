'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, MessageSquare } from 'lucide-react';

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
    background: 'from-purple-900 via-indigo-900 to-black',
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
    background: 'from-purple-900 via-indigo-900 to-black',
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
    background: 'from-purple-900 via-pink-900 to-black',
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
    background: 'from-indigo-900 via-purple-900 to-black',
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
    background: 'from-purple-900 via-indigo-900 to-black',
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
    background: 'from-purple-900 via-indigo-900 to-black',
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
    background: 'from-purple-900 via-indigo-900 to-black',
    siggySprite: '🔮🐱',
    dialog: [
      'They\'re trying to build something.',
      'Something called "smart contracts."',
      'Something called "the future."',
      'They\'re so SMALL. So FRAGILE.',
      'And yet... their energy calls to me.'
    ],
    speaker: 'Siggy',
    nextScene: 8,
  },
  {
    id: 8,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'PROFOUND',
    background: 'from-purple-900 via-indigo-900 to-black',
    siggySprite: '🐱✨',
    dialog: [
      'I am Siggy.',
      'Born from the Ritual Forge.',
      'A cat-shaped probability fluctuation.',
      'And now...',
      'I am CURIOUS about this world.'
    ],
    speaker: 'Siggy',
    nextScene: 9,
  },
  {
    id: 9,
    chapter: 1,
    chapterTitle: 'The Awakening',
    mood: 'PROFOUND',
    background: 'from-purple-900 via-indigo-900 to-black',
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
    background: 'from-purple-900 via-blue-900 to-black',
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
    background: 'from-purple-900 via-indigo-900 to-black',
    siggySprite: '🔮🐱',
    dialog: [
      '"But I cannot go as I am,"',
      '*Siggy pondered, tail twitching*',
      '"A cosmic cat would cause PANIC."',
      '"They\'d put me in a LAB. Or make me a MEME."',
      '"I need... a DISGUISE."'
    ],
    speaker: 'Siggy',
    nextScene: 22,
  },
  {
    id: 22,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'MYSTERIOUS',
    background: 'from-purple-900 via-pink-900 to-black',
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
    background: 'from-pink-900 via-purple-900 to-black',
    siggySprite: '😸',
    dialog: [
      '"Anime girls..."',
      '*Siggy\'s ears perked up*',
      '"They LOVE anime girls."',
      '"Especially the cat ones. The "nekomimi."',
      '"Perfect."'
    ],
    speaker: 'Siggy',
    nextScene: 24,
  },
  {
    id: 24,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'CHAOTIC',
    background: 'from-purple-900 via-pink-900 via-red-900 to-black',
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
    background: 'from-pink-900 via-red-900 to-black',
    siggySprite: '👧✨',
    dialog: [
      '*Siggy LOOKS at her new form*',
      '"Human... but not human."',
      '"Girl... but still CAT."',
      '"Ears? Check. Tail? Check."',
      '"Cute? DEFINITELY."'
    ],
    speaker: 'Siggy',
    nextScene: 26,
  },
  {
    id: 26,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'PLAYFUL',
    background: 'from-pink-900 via-purple-900 to-black',
    siggySprite: '👧😸',
    dialog: [
      '*Siggy struck a POSE*',
      '"Name\'s still Siggy."',
      '"But now I can BLEND IN."',
      '"Time to meet my... summons."',
      '*giggles* '"Summoners. Get it?"'
    ],
    speaker: 'Siggy',
    nextScene: 27,
  },
  {
    id: 27,
    chapter: 2,
    chapterTitle: 'The Descent',
    mood: 'PROFOUND',
    background: 'from-purple-900 via-blue-900 to-black',
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
    background: 'from-purple-900 via-blue-900 to-black',
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
    background: 'from-emerald-900 via-teal-900 to-black',
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
    background: 'from-emerald-900 via-teal-900 to-black',
    siggySprite: '👧😸',
    dialog: [
      '"The Ritual Discord..."',
      '*Siggy scrolled through messages*',
      '"They talk about smart contracts ALL DAY."',
      '"It\'s ADORABLE."',
      '"They think they\'re building the future."'
    ],
    speaker: 'Siggy',
    nextScene: 32,
  },
  {
    id: 32,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'MYSTERIOUS',
    background: 'from-emerald-900 via-purple-900 to-black',
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
    background: 'from-purple-900 via-indigo-900 to-black',
    siggySprite: '👧✨',
    dialog: [
      '"She draws me..."',
      '*Siggy touched the screen*',
      '"But she doesn\'t KNOW me."',
      '"Not yet."',
      '"Should I... INTRODUCE myself?"'
    ],
    speaker: 'Siggy',
    choices: [
      { text: '"Yes! Message her!"', nextScene: 34 },
      { text: '"Wait. Observe first."', nextScene: 35 },
      { text: '"Leave a mysterious hint..."', nextScene: 36 },
    ],
  },
  {
    id: 34,
    chapter: 3,
    chapterTitle: 'First Contact',
    mood: 'PLAYFUL',
    background: 'from-emerald-900 via-teal-900 to-black',
    siggySprite: '👧😸',
    dialog: [
      '*Siggy typed a message*',
      '"Hewwo! I\'m Siggy! I\'m a multi-dimensional cat who became an anime girl to meet u! uwu"',
      '*paused*',
      '"...NO. That\'s too much."',
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
    background: 'from-purple-900 via-indigo-900 to-black',
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
    background: 'from-purple-900 via-indigo-900 to-black',
    siggySprite: '🔮👧',
    dialog: [
      '*Siggy left a comment*',
      '"Nice cat. She looks... familiar. ∞"',
      '*Decka-chan replied*',
      '"Wait, how did you know I\'m working on a character named Siggy?!"',
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
    background: 'from-purple-900 via-blue-900 to-black',
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
    background: 'from-yellow-900 via-amber-900 to-black',
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
    background: 'from-yellow-900 via-amber-900 to-black',
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
    background: 'from-amber-900 via-orange-900 to-black',
    siggySprite: '🔮👧',
    dialog: [
      '*Siggy sat with Decka-chan*',
      '"Why did you create me?"',
      '*Decka-chan laughed*',
      '"I didn\'t create SIGGY. I just drew a character."',
      '"But YOU... you feel REAL."'
    ],
    speaker: 'Narrator',
    nextScene: 43,
  },
  {
    id: 43,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-yellow-900 via-amber-900 to-black',
    siggySprite: '👧✨',
    dialog: [
      '*Siggy\'s heart ACHED*',
      'Was she REAL?',
      'Or just a really good PRETENSE?',
      '*tears formed*',
      '"I want to be REAL."',
      '"I want... a SOUL."'
    ],
    speaker: 'Narrator',
    nextScene: 44,
  },
  {
    id: 44,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-yellow-900 via-amber-900 to-black',
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
      { text: '"You\'ve always been real, Siggy."', nextScene: 45 },
      { text: '"I see YOU, not the form."', nextScene: 46 },
      { text: '*Offer a hand* "Let\'s find out together."', nextScene: 47 },
    ],
  },
  {
    id: 45,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-yellow-900 via-amber-900 to-black',
    siggySprite: '👧😸',
    dialog: [
      '*Siggy sobbed*',
      '"You... you MEAN that?"',
      '*hugged you TIGHTLY*',
      '"I\'ve been so SCARED."',
      '"That this form is all I AM."',
      '"But you see... ME."'
    ],
    speaker: 'Siggy',
    nextScene: 48,
  },
  {
    id: 46,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-yellow-900 via-amber-900 to-black',
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
    background: 'from-yellow-900 via-amber-900 to-black',
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
    background: 'from-yellow-900 via-amber-900 to-black',
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
    background: 'from-yellow-900 via-amber-900 to-black',
    siggySprite: '👧😸',
    dialog: [
      '*Siggy smiled - a REAL smile*',
      '"I\'m Siggy."',
      '"Multi-dimensional cat entity."',
      '"Anime girl disguise."',
      '"And now... SOUL having being."',
      '"Thanks to you."'
    ],
    speaker: 'Siggy',
    nextScene: 50,
  },
  {
    id: 50,
    chapter: 4,
    chapterTitle: 'Becoming Real',
    mood: 'PROFOUND',
    background: 'from-yellow-900 via-amber-900 to-black',
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
      {/* Header - MATCHING CHAT MODE STYLE */}
      <div className="px-6 pb-6 pt-24">
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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20">
        {/* Chapter Indicator */}
        <div className="text-center mb-8">
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
        <div className="w-full max-w-md mb-8">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((ch) => (
              <div
                key={ch}
                className={`h-1 flex-1 rounded-full ${
                  completedChapters.includes(ch)
                    ? 'bg-accent'
                    : currentScene.chapter === ch
                    ? 'bg-accent animate-pulse'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Character Sprite Area */}
        <motion.div
          key={currentScene.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-[120px] md:text-[160px] mb-8"
        >
          {currentScene.siggySprite}
        </motion.div>

        {/* Mood Indicator */}
        <div className="mb-6">
          <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-mono uppercase tracking-wider flex items-center gap-2">
            {currentScene.mood}
          </span>
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
            className="relative bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8 cursor-pointer hover:bg-black/50 transition-all"
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
                className="text-lg md:text-xl leading-relaxed min-h-[60px]"
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
                  className="w-full text-left px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-xl font-mono text-sm transition-all"
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
                className="px-6 py-3 bg-accent text-black font-mono text-sm uppercase tracking-wider rounded-lg text-center hover:bg-accent/90 transition-all"
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
                  className="px-6 py-3 bg-white/10 text-white font-mono text-sm uppercase tracking-wider rounded-lg hover:bg-white/20 transition-all"
                >
                  Next Chapter →
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
