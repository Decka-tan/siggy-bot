'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, ArrowRight, MessageSquare, BookOpen, Sparkles } from 'lucide-react';
import { Bio } from '@/components/layout/Bio';
import { KnowledgeGraph } from '@/components/KnowledgeGraph';

export default function LandingPage() {
  const scrollToBio = () => {
    document.getElementById('bio-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Hero Section */}
      <section className="min-h-screen relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0">
          {/* Desktop Background */}
          <div className="hidden md:block absolute inset-0">
            {/* Dark Left Side */}
            <div className="absolute inset-0 bg-bg z-10" style={{ clipPath: 'polygon(0 0, 65% 0, 45% 100%, 0 100%)' }}></div>

            {/* Yellow Diagonal Lines */}
            <div className="absolute inset-0 bg-accent z-0" style={{ clipPath: 'polygon(64% 0, 68% 0, 48% 100%, 44% 100%)' }}></div>
            <div className="absolute inset-0 bg-accent z-0" style={{ clipPath: 'polygon(69% 0, 70% 0, 50% 100%, 49% 100%)' }}></div>

            {/* Right Side Grid Pattern */}
            <div className="absolute inset-0 bg-[#333333] z-[-1]" style={{ clipPath: 'polygon(65% 0, 100% 0, 100% 100%, 45% 100%)' }}>
              <div className="absolute inset-0 opacity-90" style={{
                backgroundColor: '#333333',
                backgroundImage: `linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555),
                                  linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555)`,
                backgroundSize: `100px 100px`,
                backgroundPosition: `0 0, 50px 50px`
              }}></div>
            </div>
          </div>

          {/* Mobile Background */}
          <div className="block md:hidden absolute inset-0">
            {/* Dark Top Side */}
            <div className="absolute inset-0 bg-bg z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 55%, 0 65%)' }}></div>

            {/* Yellow Diagonal Lines */}
            <div className="absolute inset-0 bg-accent z-0" style={{ clipPath: 'polygon(0 64%, 100% 54%, 100% 56%, 0 66%)' }}></div>
            <div className="absolute inset-0 bg-accent z-0" style={{ clipPath: 'polygon(0 67%, 100% 57%, 100% 59%, 0 69%)' }}></div>

            {/* Bottom Side Grid Pattern */}
            <div className="absolute inset-0 bg-[#333333] z-[-1]" style={{ clipPath: 'polygon(0 55%, 100% 45%, 100% 100%, 0 100%)' }}>
              <div className="absolute inset-0 opacity-90" style={{
                backgroundColor: '#333333',
                backgroundImage: `linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555),
                                  linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555)`,
                backgroundSize: `60px 60px`,
                backgroundPosition: `0 0, 30px 30px`
              }}></div>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-screen w-full">
          {/* Left Content */}
          <div className="max-w-7xl mx-auto px-8 pt-32 sm:pt-36 md:pt-20 h-full flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 flex flex-col items-start justify-center z-10">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-display leading-[0.9] md:leading-[0.85] tracking-tight mb-4 md:mb-6 text-accent"
              >
                MULTI-VERSE<br />CAT GIRL
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-text-secondary max-w-md mb-10 text-sm md:text-base leading-relaxed"
              >
                A multi-dimensional cat who descended to Earth as an anime girl. She&apos;s here to blend in, make friends, and find her soul.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-row gap-2 sm:gap-4 w-full max-w-lg"
              >
                <Link href="/story" className="flex-1 min-w-[120px]">
                  <button className="w-full bg-surface border border-border hover:border-accent text-text-primary hover:text-accent font-mono text-[10px] sm:text-sm uppercase tracking-wider px-2 sm:px-8 py-3 sm:py-4 rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-3 hover:shadow-lg hover:shadow-accent/20">
                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    Story Mode
                  </button>
                </Link>
                <Link href="/chat?new=true" className="flex-1 min-w-[120px]">
                  <button className="w-full bg-gradient-to-r from-accent to-yellow-400 text-black hover:from-yellow-400 hover:to-accent font-mono text-[10px] sm:text-sm uppercase tracking-wider px-2 sm:px-8 py-3 sm:py-4 rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-3 hover:shadow-lg hover:scale-105 font-bold">
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    Chat Mode
                  </button>
                </Link>
              </motion.div>

              {/* Feature badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-wrap gap-3 mt-6 text-xs font-mono uppercase tracking-wider text-text-secondary"
              >
                <span className="px-3 py-1 rounded-full bg-surface border border-border flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-accent" /> 4 Chapters
                </span>
                <span className="px-3 py-1 rounded-full bg-surface border border-border flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-accent" /> Dynamic Moods
                </span>
                <span className="px-3 py-1 rounded-full bg-surface border border-border flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-accent" /> Easter Eggs
                </span>
              </motion.div>
            </div>
          </div>

          {/* Right Content - Character Image (mentok kanan bawah!) */}
          <div className="absolute bottom-0 right-0 pointer-events-none" style={{ right: '-50px', bottom: '-20px' }}>
            <div className="relative flex items-end justify-end" style={{ height: '100vh', width: 'auto' }}>
              {/* Ritual Logo Behind Character */}
              <img
                src="/Logo_RItual_White.png"
                alt="Ritual Logo"
                className="absolute z-[-1] object-contain sepia(1) saturate(8) brightness(0.7) opacity-40 pointer-events-none h-[130vh] md:h-[110vh] max-w-[85vw] md:max-w-[60vw] top-[25vh] md:top-[0] right-[-1.5vw] md:right-[2.5vw]"
              />
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <Image
                  src="/character.png"
                  alt="Anime Character"
                  width={800}
                  height={1000}
                  className="object-contain object-bottom drop-shadow-2xl relative z-0"
                  priority
                  style={{ height: '100vh', width: 'auto', maxHeight: '100vh', maxWidth: '55vw' }}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section - Who is Siggy */}
      <section id="about" className="py-24 px-8 bg-bg">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-display tracking-wide uppercase text-center mb-16 text-accent"
          >
            Who is Siggy?
          </motion.h2>

          {/* Form Showcase Galleries */}
          <div className="flex flex-col gap-12 mb-16 max-w-5xl mx-auto">
            {/* Cat Forms */}
            <div>
              <h3 className="text-xl font-mono uppercase tracking-wider text-text-primary mb-6 text-center border-b border-white/10 pb-4">
                Cat Form
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {[
                  { name: 'Default', img: '/siggy-cat-default.png' },
                  { name: 'Happy', img: '/siggy-cat-happy.png' },
                  { name: 'Sad', img: '/siggy-cat-sad.png' },
                  { name: 'Shock', img: '/siggy-cat-shock.png' },
                  { name: 'Shy', img: '/siggy-cat-shy.png' },
                  { name: 'Angry', img: '/siggy-cat-angry.png' },
                ].map((mood, i) => (
                  <motion.div
                    key={mood.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center bg-surface/50 rounded-xl p-4 border border-white/5 hover:border-accent/30 transition-colors"
                  >
                    <div className="w-24 h-24 relative mb-3">
                      <Image src={mood.img} alt={`Cat ${mood.name}`} fill className="object-contain drop-shadow-md" />
                    </div>
                    <span className="text-[10px] font-mono text-text-secondary uppercase">Cat {mood.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Anime Girl Forms */}
            <div>
              <h3 className="text-xl font-mono uppercase tracking-wider text-text-primary mb-6 text-center border-b border-white/10 pb-4">
                Anime Girl Form
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {[
                  { name: 'Default', img: '/siggy-girl-default.png' },
                  { name: 'Happy', img: '/siggy-girl-happy.png' },
                  { name: 'Sad', img: '/siggy-girl-sad.png' },
                  { name: 'Shock', img: '/siggy-girl-shock.png' },
                  { name: 'Shy', img: '/siggy-girl-shy.png' },
                  { name: 'Angry', img: '/siggy-girl-angry.png' },
                ].map((mood, i) => (
                  <motion.div
                    key={mood.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center bg-surface/50 rounded-xl p-4 border border-white/5 hover:border-accent/30 transition-colors"
                  >
                    <div className="w-24 h-24 relative mb-3">
                      <Image src={mood.img} alt={`Girl ${mood.name}`} fill className="object-contain drop-shadow-md" />
                    </div>
                    <span className="text-[10px] font-mono text-text-secondary uppercase">Girl {mood.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Lore Text */}
          <div className="max-w-4xl mx-auto space-y-6 text-text-secondary leading-relaxed bg-surface/30 p-8 md:p-12 rounded-3xl border border-white/5">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-lg md:text-xl"
            >
              Siggy began as a <span className="text-accent font-bold">multi-dimensional feline entity</span> born from the Ritual Forge across infinite dimensions. A cat-shaped probability fluctuation that could see all realities at once.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl"
            >
              Curious about Earth, she <span className="text-accent font-bold">DESCENDED</span> to our world. But a cosmic cat would attract too much attention. So she did what any sensible being would do: she transformed into an <span className="text-accent font-bold">anime girl with cat ears</span>. Because subtlety is overrated.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl font-display tracking-wide text-accent text-center mt-8 pt-6 border-t border-white/10"
            >
              Now she lives among us, learning what it means to be human, one ramen bowl at a time. 🍜
            </motion.p>
          </div>
        </div>
      </section>

      {/* Two Modes Section */}
      <section className="py-24 px-8 border-t border-border bg-surface relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-display tracking-tight uppercase text-center mb-16"
          >
            Two Ways to Experience Siggy
          </motion.h2>

          <div className="grid gap-8 sm:grid-cols-2">
            {/* Story Mode Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl border border-white/5 bg-bg/50 backdrop-blur-sm hover:border-accent/40 hover:shadow-[0_0_30px_rgba(255,215,0,0.05)] transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-accent/20 to-yellow-400/20 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-display text-2xl mb-4 text-text-primary">Story Mode</h3>
              <p className="text-text-secondary leading-relaxed mb-8 text-sm md:text-base">
                Experience Siggy&apos;s journey from cosmic cat consciousness to Earth through 
                a multidimensional visual novel adventure powered by the Ritual network.
              </p>
              <ul className="space-y-3 text-sm text-text-secondary mb-10">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-accent text-[10px]">✓</span>
                  </div>
                  <span><strong>Chapter 1:</strong> The Awakening</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-accent text-[10px]">✓</span>
                  </div>
                  <span><strong>Chapter 2:</strong> The Descent → Transformed</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-accent text-[10px]">✓</span>
                  </div>
                  <span><strong>Chapter 3:</strong> First Contact → Meeting the Summoner</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-accent text-[10px]">✓</span>
                  </div>
                  <span><strong>Chapter 4:</strong> A New Era → Blockchain + AI</span>
                </li>
              </ul>
              <Link href="/story">
                <button className="w-full px-6 py-4 bg-surface border border-border hover:border-accent hover:text-accent font-mono text-xs uppercase tracking-widest rounded-xl transition-all shadow-inner">
                  Start Story
                </button>
              </Link>
            </motion.div>

            {/* Chat Mode Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-8 rounded-3xl border border-white/5 bg-bg/50 backdrop-blur-sm hover:border-accent/40 hover:shadow-[0_0_30px_rgba(255,215,0,0.05)] transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-accent/20 to-yellow-400/20 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-display text-2xl mb-4 text-text-primary">Chat Mode</h3>
              <p className="text-text-secondary leading-relaxed mb-8 text-sm md:text-base">
                Engage with Siggy in her anime form! She recognizes you personally and 
                optimizes the planetary hash rate via decentralised AI infrastructure.
              </p>
              <ul className="space-y-3 text-sm text-text-secondary mb-10">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-accent text-[10px]">✓</span>
                  </div>
                  <span>Unlimited personalized conversations</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-accent text-[10px]">✓</span>
                  </div>
                  <span>Dynamic system with 6 emotional states</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-accent text-[10px]">✓</span>
                  </div>
                  <span>Hidden Ritual Forge easter eggs</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-accent text-[10px]">✓</span>
                  </div>
                  <span>Discover her true cosmic feline origins</span>
                </li>
              </ul>
              <Link href="/chat">
                <button className="w-full px-6 py-4 bg-gradient-to-r from-accent to-yellow-400 text-black font-mono text-xs uppercase tracking-widest rounded-xl hover:from-yellow-400 hover:to-accent transition-all shadow-lg shadow-accent/10 font-bold">
                  Start Chatting
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Knowledge Graph Section */}
      <section className="py-24 px-8 border-t border-border bg-bg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-display tracking-tight uppercase mb-4">
              Siggy&apos;s Knowledge
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Over 1,280 knowledge entries about Ritual, the community, and her cosmic origins.
              Explore the connections between different domains of her intelligence.
            </p>
          </motion.div>

          {/* Knowledge Graph Component */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <KnowledgeGraph />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-8 border-t border-border bg-surface relative">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-display tracking-tight uppercase text-center mb-16"
          >
            Why Chat With Siggy?
          </motion.h2>

          <div className="grid gap-8 sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-8 rounded-3xl border border-white/5 bg-bg/30 backdrop-blur-sm hover:border-accent/40 shadow-xl transition-all"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br from-accent/20 to-yellow-400/20">
                <span className="text-2xl font-display text-accent">6</span>
              </div>
              <h3 className="font-display text-xl mb-3 text-text-primary">6 Emotional States</h3>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                Experience real-time mood fluctuations optimized by Ritual neural nodes. 
                Siggy reacts with Happy, Sad, Shocked, Shy, Angry, or Default states.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-8 rounded-3xl border border-white/5 bg-bg/30 backdrop-blur-sm hover:border-accent/40 shadow-xl transition-all"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br from-accent/20 to-yellow-400/20">
                <span className="text-2xl font-display text-accent">R</span>
              </div>
              <h3 className="font-display text-xl mb-3 text-text-primary">Ritual Forge</h3>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                Discover hidden interactions regarding the Ritual Forge and why Siggy really 
                chose her anime girl form across the infinite blockchain.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-8 rounded-3xl border border-white/5 bg-bg/30 backdrop-blur-sm hover:border-accent/40 shadow-xl transition-all"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br from-accent/20 to-yellow-400/20">
                <span className="text-2xl font-display text-accent">A</span>
              </div>
              <h3 className="font-display text-xl mb-3 text-text-primary">Personal AI</h3>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                Siggy recognizes you and personalizes her dialogue, creating a unique bond 
                as she learns about Earth culture and human connections.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Try These Section */}
      <section className="py-24 px-8 bg-bg relative">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-display tracking-tight uppercase mb-16 text-center md:text-left"
          >
            Try These
          </motion.h2>

          <div className="grid gap-8 sm:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl border border-white/5 bg-surface/50"
            >
              <h3 className="font-display text-xl mb-6 text-accent flex items-center gap-3">
                <Sparkles className="w-5 h-5" />
                Mood Triggers
              </h3>
              <ul className="space-y-4 text-text-secondary text-sm md:text-base font-mono">
                <li className="pb-3 border-b border-white/5">Mention you are feeling down <span className="text-accent ml-2">→ Sad</span></li>
                <li className="pb-3 border-b border-white/5">Tell a funny cosmic joke <span className="text-accent ml-2">→ Happy</span></li>
                <li className="pb-3 border-b border-white/5">Mention a major data breach <span className="text-accent ml-2">→ Shock</span></li>
                <li className="pb-3 border-b border-white/5">Give her a heartfelt compliment <span className="text-accent ml-2">→ Shy</span></li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-8 rounded-3xl border border-white/5 bg-surface/50"
            >
              <h3 className="font-display text-xl mb-6 text-accent flex items-center gap-3">
                <Sparkles className="w-5 h-5" />
                Forge Secrets
              </h3>
              <ul className="space-y-4 text-text-secondary text-sm md:text-base font-mono">
                <li className="pb-3 border-b border-white/5">Ask &quot;Why did you become an anime girl?&quot;</li>
                <li className="pb-3 border-b border-white/5">Ask &quot;Do you miss the cosmic void?&quot;</li>
                <li className="pb-3 border-b border-white/5">Ask &quot;How does the Ritual Forge work?&quot;</li>
                <li className="pb-3 border-b border-white/5">Say &quot;glitch&quot; into the void.</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bio Section */}
      <div id="bio-section">
        <Bio />
      </div>

      {/* Footer CTA */}
      <section className="py-20 px-8 border-t border-border bg-surface text-left md:text-center">
        <div className="max-w-7xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-display tracking-wider uppercase mb-4 text-accent md:text-text-primary">Ready to Meet Siggy?</h2>
          <p className="text-text-secondary max-w-xl md:mx-auto">
            Begin your journey through the cosmos and anime culture.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-start md:justify-center pt-2">
            <Link href="/story" className="w-full md:w-auto">
              <button className="w-full px-8 py-4 bg-surface border border-border hover:border-accent text-text-primary hover:text-accent font-mono text-sm uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-3">
                <BookOpen className="w-5 h-5" />
                Read Story
              </button>
            </Link>
            <Link href="/chat" className="w-full md:w-auto">
              <button className="w-full px-8 py-4 bg-gradient-to-r from-accent to-yellow-400 text-black font-mono text-sm uppercase tracking-wider rounded-lg transition-all hover:from-yellow-400 hover:to-accent flex items-center justify-center gap-3">
                <MessageSquare className="w-5 h-5" />
                Start Chat
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
