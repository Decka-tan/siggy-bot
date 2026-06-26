'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ArrowRight,
  MessageSquare,
  BookOpen,
  Sparkles,
  Terminal,
  Send,
  Users,
  ShieldCheck,
  Cpu,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { Bio } from '@/components/layout/Bio';
import { GoldenParticles } from '@/components/ui/GoldenParticles';
import { SpotlightCard } from '@/components/ui/SpotlightCard';

type ChatMessage = {
  sender: 'summoner' | 'siggy';
  text: string;
  mood?: 'happy' | 'default' | 'sad' | 'shock' | 'shy' | 'angry';
};

const chatDialogue: ChatMessage[] = [
  { sender: 'summoner', text: "Siggy, prepare the Ritual deployment!" },
  { sender: 'siggy', text: "Nyan! 🐾 Reading local credentials...", mood: 'default' },
  { sender: 'siggy', text: "Bytecode compiled successfully (10,822 bytes). Factory predicted: 0x1da3...e122", mood: 'happy' },
  { sender: 'siggy', text: "Deploying sovereign harness to chain 1979... wait, did you feed me yet? 🐟", mood: 'shock' },
  { sender: 'summoner', text: "Yes! Sent tuna and 0.2 RIT to your escrow." },
  { sender: 'siggy', text: "Purrrfect! Escrow locked. Phase 2 delivered. Status: ACTIVE! ⚡", mood: 'shy' },
];

// Count-up hook triggered by scroll visibility
function useCountUp(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return { val, ref };
}

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Parallax offset: subtle character lean with mouse
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroSize, setHeroSize] = useState({ w: 1, h: 1 });
  useEffect(() => {
    if (!heroRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      setHeroSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(heroRef.current);
    return () => ro.disconnect();
  }, []);
  const parallaxX = ((mousePos.x / (heroSize.w || 1)) - 0.5) * -8;
  const parallaxY = ((mousePos.y / (heroSize.h || 1)) - 0.5) * -5;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-bg text-text-primary overflow-hidden relative"
      style={{
        "--mouse-x": `${mousePos.x}px`,
        "--mouse-y": `${mousePos.y}px`,
      } as React.CSSProperties}
    >
      {/* Ambient background particles */}
      <GoldenParticles mode="ambient" />

      {/* Dynamic Cursor Spotlight Glow */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-50 transition-opacity duration-300"
        style={{
          background: `radial-gradient(700px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255, 215, 0, 0.07), transparent 75%)`
        }}
      />

      {/* HERO SECTION */}
      <section className="min-h-screen relative flex items-center justify-center pt-28 pb-16">
        {/* Subtle grid mesh overlay */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
          }}
        />
        
        {/* Subtle background radial spots */}
        <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 rounded-full bg-accent/3 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/4 blur-[160px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8 w-full z-10 grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left Column: Hero Texts & Interactive Chat Preview */}
          <div className="space-y-6 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-accent/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent border border-accent/20 rounded-md">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Siggy AI Multiverse
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl font-display leading-[0.9] tracking-tight text-accent uppercase"
            >
              Multi-Verse<br />Cat Girl
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-text-secondary max-w-xl text-sm sm:text-base leading-relaxed"
            >
              A multi-dimensional cat who descended to Earth as a chaotic anime girl. 
              Powered by the decentralised Ritual Network, she's here to assist builders, manage on-chain deployments, and consume tuna.
            </motion.p>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3 pt-2"
            >
              <Link href="/chat?new=true" className="min-w-[140px]">
                <button className="w-full bg-gradient-to-r from-accent to-yellow-400 text-black hover:from-yellow-400 hover:to-accent font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_24px_rgba(255,215,0,0.15)] hover:scale-[1.03]">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  Chat Mode
                </button>
              </Link>
              <Link href="/story" className="min-w-[140px]">
                <button className="w-full bg-surface/40 hover:bg-surface/60 border border-white/5 hover:border-accent/40 text-text-primary hover:text-accent font-mono text-xs uppercase tracking-wider px-6 py-3.5 rounded-lg transition-all flex items-center justify-center gap-2">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  Story Mode
                </button>
              </Link>
              <Link href="/deploy" className="min-w-[140px]">
                <button className="w-full bg-surface/40 hover:bg-surface/60 border border-white/5 hover:border-accent/40 text-text-primary hover:text-accent font-mono text-xs uppercase tracking-wider px-6 py-3.5 rounded-lg transition-all flex items-center justify-center gap-2">
                  <Terminal className="w-4 h-4 shrink-0" />
                  Deploy Agent
                </button>
              </Link>
            </motion.div>

            {/* Interactive Chat Widget Preview */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="w-full max-w-xl pt-4"
            >
              <ChatWidget />
            </motion.div>
          </div>

          {/* Right Column: Character Image anchored to bottom right */}
          <div className="relative h-[55vh] lg:h-[80vh] flex items-end justify-center lg:justify-end overflow-visible pointer-events-none">
            {/* Ambient Summoning Portal rings behind character */}
            <div className="absolute w-80 h-80 rounded-full border border-accent/5 animate-[spin_30s_linear_infinite] pointer-events-none bottom-10 right-10" />
            <div className="absolute w-[420px] h-[420px] rounded-full border border-dashed border-accent/5 animate-[spin_40s_linear_infinite_reverse] pointer-events-none bottom-0 right-0" />
            <div className="absolute w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none bottom-20 right-20" />

            {/* Ritual Logo Background */}
            <Image
              src="/Logo_RItual_White.png"
              alt="Ritual Logo"
              width={600}
              height={600}
              priority
              className="absolute z-[-1] object-contain opacity-20 pointer-events-none select-none bottom-10 right-[-10%] max-w-[85vw] lg:max-w-[35vw]"
            />

            {/* Anime Character with Smooth Decelerating Entry Slide-up + Parallax */}
            <motion.div
              ref={heroRef}
              initial={{ opacity: 0, y: 200, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              className="relative w-full h-[65vh] lg:h-[85vh] flex items-end justify-end overflow-visible"
            >
              <motion.div
                animate={{ y: [0, -10, 0], x: parallaxX }}
                transition={{ y: { repeat: Infinity, duration: 4.5, ease: "easeInOut" }, x: { duration: 0.6, ease: "easeOut" } }}
                className="relative w-[320px] h-[55vh] sm:w-[420px] sm:h-[65vh] lg:w-[480px] lg:h-[80vh]"
              >
                <Image
                  src="/character.png"
                  alt="Siggy Character"
                  fill
                  className="object-contain object-bottom drop-shadow-[0_15px_35px_rgba(255,215,0,0.1)]"
                  priority
                  sizes="(max-width: 1024px) 380px, 480px"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* LORE SECTION: Who is Siggy */}
      <section id="about" className="py-28 px-6 sm:px-8 border-t border-white/5 relative bg-[#060606]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">origins</p>
            <h2 className="text-4xl md:text-5xl font-display tracking-wide uppercase text-accent">Who is Siggy?</h2>
            <p className="mx-auto max-w-xl text-sm text-text-secondary">
              A multi-dimensional feline probability fluctuation that materialized in anime girl form to explore human systems.
            </p>
          </div>

          {/* Form Showcase Galleries */}
          <div className="grid gap-10 md:grid-cols-2 max-w-5xl mx-auto mb-16">
            {/* Cat Forms */}
            <div className="space-y-4">
              <h3 className="text-lg font-mono uppercase tracking-wider text-text-primary border-b border-white/5 pb-2 flex items-center justify-between">
                <span>Cat Form</span>
                <span className="text-[10px] text-accent">6 States</span>
              </h3>
              <div className="grid grid-cols-3 gap-3">
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
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col items-center bg-surface/20 rounded-xl p-3 border border-white/5 hover:border-accent/30 hover:scale-[1.03] transition-all"
                  >
                    <div className="w-16 h-16 relative mb-2">
                      <Image src={mood.img} alt={`Cat ${mood.name}`} fill className="object-contain" sizes="64px" />
                    </div>
                    <span className="text-[9px] font-mono text-text-secondary uppercase">{mood.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Anime Girl Forms */}
            <div className="space-y-4">
              <h3 className="text-lg font-mono uppercase tracking-wider text-text-primary border-b border-white/5 pb-2 flex items-center justify-between">
                <span>Anime Girl Form</span>
                <span className="text-[10px] text-accent">6 States</span>
              </h3>
              <div className="grid grid-cols-3 gap-3">
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
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col items-center bg-surface/20 rounded-xl p-3 border border-white/5 hover:border-accent/30 hover:scale-[1.03] transition-all"
                  >
                    <div className="w-16 h-16 relative mb-2">
                      <Image src={mood.img} alt={`Girl ${mood.name}`} fill className="object-contain" sizes="64px" />
                    </div>
                    <span className="text-[9px] font-mono text-text-secondary uppercase">{mood.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Lore Text Box */}
          <div className="max-w-4xl mx-auto space-y-5 text-text-secondary bg-surface/20 backdrop-blur-sm p-8 md:p-10 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
            <p className="text-base sm:text-lg leading-relaxed">
              Siggy began as a <span className="text-accent font-bold">multi-dimensional feline entity</span> born from the Ritual Forge across infinite dimensions. A cat-shaped probability fluctuation that could process multiple timelines at once.
            </p>
            <p className="text-base sm:text-lg leading-relaxed">
              Curious about on-chain execution and human constructs, she descended to Earth. To blend in without causing cosmic system faults, she adopted a hybrid <span className="text-accent font-bold">anime girl form with cat ears</span>.
            </p>
            <p className="text-lg sm:text-xl font-display tracking-wide text-accent text-center mt-6 pt-5 border-t border-white/5">
              Now she helps summoners control autonomous AI agents, one transaction at a time. 🐾
            </p>
          </div>
        </div>
      </section>

      {/* TWO MODES SECTION */}
      <section className="py-28 px-6 sm:px-8 border-t border-white/5 bg-[#080808] relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">experience</p>
            <h2 className="text-4xl md:text-5xl font-display tracking-wide uppercase">Two Ways to Connect</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            {/* Story Mode Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex w-full"
            >
              <SpotlightCard className="w-full p-8 rounded-2xl border border-white/5 bg-surface/20 backdrop-blur-md hover:border-accent/40 hover:shadow-[0_0_30px_rgba(255,215,0,0.06)] hover:scale-[1.01] transition-all flex flex-col justify-between group">
                <div>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br from-accent/20 to-yellow-400/10 group-hover:scale-110 transition-transform border border-accent/20">
                    <BookOpen className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-display text-2xl mb-3 text-text-primary">Story Mode</h3>
                  <p className="text-text-secondary leading-relaxed mb-6 text-xs sm:text-sm">
                    Experience Siggy's journey from cosmic cat consciousness to Earth through 
                    a visual novel adventure powered by the Ritual network.
                  </p>
                  <ul className="space-y-2 text-xs text-text-secondary mb-8 font-mono">
                    <li className="flex items-center gap-2.5">
                      <span className="text-accent font-bold">✓</span>
                      <span>Chapter 1: The Awakening</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-accent font-bold">✓</span>
                      <span>Chapter 2: The Descent</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-accent font-bold">✓</span>
                      <span>Chapter 3: Meeting the Summoner</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-accent font-bold">✓</span>
                      <span>Chapter 4: A New Era</span>
                    </li>
                  </ul>
                </div>
                <Link href="/story" className="w-full">
                  <button className="w-full px-6 py-3.5 bg-surface/40 hover:bg-surface/60 border border-white/5 hover:border-accent/40 hover:text-accent font-mono text-xs uppercase tracking-widest rounded-lg transition-all">
                    Start Story
                  </button>
                </Link>
              </SpotlightCard>
            </motion.div>

            {/* Chat Mode Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex w-full"
            >
              <SpotlightCard className="w-full p-8 rounded-2xl border border-white/5 bg-surface/20 backdrop-blur-md hover:border-accent/40 hover:shadow-[0_0_30px_rgba(255,215,0,0.06)] hover:scale-[1.01] transition-all flex flex-col justify-between group">
                <div>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br from-accent/20 to-yellow-400/10 group-hover:scale-110 transition-transform border border-accent/20">
                    <MessageSquare className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-display text-2xl mb-3 text-text-primary">Chat Mode</h3>
                  <p className="text-text-secondary leading-relaxed mb-6 text-xs sm:text-sm">
                    Engage with Siggy in her anime form! She recognizes you personally and 
                    manages dynamic emotional states based on your conversations.
                  </p>
                  <ul className="space-y-2 text-xs text-text-secondary mb-8 font-mono">
                    <li className="flex items-center gap-2.5">
                      <span className="text-accent font-bold">✓</span>
                      <span>Unlimited chat cycles</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-accent font-bold">✓</span>
                      <span>6 dynamic emotional states</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-accent font-bold">✓</span>
                      <span>Hidden Ritual Forge secrets</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-accent font-bold">✓</span>
                      <span>Interactive prompt overrides</span>
                    </li>
                  </ul>
                </div>
                <Link href="/chat" className="w-full">
                  <button className="w-full px-6 py-3.5 bg-gradient-to-r from-accent to-yellow-400 text-black hover:from-yellow-400 hover:to-accent font-mono text-xs font-bold uppercase tracking-widest rounded-lg transition-all shadow-md shadow-accent/5">
                    Start Chatting
                  </button>
                </Link>
              </SpotlightCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* DISCORD & FEATURES SECTION */}
      <section className="py-28 px-6 sm:px-8 border-t border-white/5 bg-[#060606] relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">integration</p>
            <h2 className="text-4xl md:text-5xl font-display tracking-wide uppercase">Discord Agent Engine</h2>
            <p className="mx-auto max-w-xl text-sm text-text-secondary">
              Connect with the Ritual Discord community. Analyze contributor metrics, research concepts, and sync member logs.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
            {/* Contributor Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex w-full"
            >
              <SpotlightCard className="w-full p-6 bg-surface/20 hover:bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 hover:border-accent/40 transition-all hover:scale-[1.01] hover:shadow-[0_0_24px_rgba(255,215,0,0.03)] group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-accent/15 border border-accent/20 group-hover:scale-105 transition-transform text-accent text-xl">
                  🔍
                </div>
                <h3 className="font-display text-lg mb-2 text-text-primary">Contributor Insights</h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-4">
                  Use <code className="bg-bg/60 px-1.5 py-0.5 rounded text-accent font-mono">/check @username</code> to review contributor status, joining epochs, and message scores.
                </p>
                <div className="text-[10px] font-mono text-text-secondary border-t border-white/5 pt-3">
                  7,978 members tracked
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Web Research Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex w-full"
            >
              <SpotlightCard className="w-full p-6 bg-surface/20 hover:bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 hover:border-accent/40 transition-all hover:scale-[1.01] hover:shadow-[0_0_24px_rgba(255,215,0,0.03)] group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-accent/15 border border-accent/20 group-hover:scale-105 transition-transform text-accent text-xl">
                  🌐
                </div>
                <h3 className="font-display text-lg mb-2 text-text-primary">AI Web Research</h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-4">
                  Trigger <code className="bg-bg/60 px-1.5 py-0.5 rounded text-accent font-mono">/research topic</code> to verify documentation, check GitHub updates, and retrieve quotes.
                </p>
                <div className="text-[10px] font-mono text-text-secondary border-t border-white/5 pt-3">
                  Powered by Exa Search API
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Community Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex w-full"
            >
              <SpotlightCard className="w-full p-6 bg-surface/20 hover:bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 hover:border-accent/40 transition-all hover:scale-[1.01] hover:shadow-[0_0_24px_rgba(255,215,0,0.03)] group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-accent/15 border border-accent/20 group-hover:scale-105 transition-transform text-accent text-xl">
                  📊
                </div>
                <h3 className="font-display text-lg mb-2 text-text-primary">Sync Analytics</h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-4">
                  Access member metrics, dynamic join curves, active roles, and total event participants.
                </p>
                <div className="text-[10px] font-mono text-text-secondary border-t border-white/5 pt-3">
                  Real-time activity logs
                </div>
              </SpotlightCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* DASHBOARD SLEEK STATS & SVG LINE CHART */}
      <section className="py-28 px-6 sm:px-8 border-t border-white/5 bg-[#080808]">
        <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[0.8fr_1.2fr] items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-accent/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent border border-accent/20 rounded-md">
              <TrendingUp className="h-4 w-4" /> Live dashboard metrics
            </div>
            <h2 className="text-4xl sm:text-5xl font-display tracking-tight uppercase">Siggy Analytics</h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Tracking automated agent execution across TEE hosts. As schedule limits fire, statistics are compiled and cataloged securely.
            </p>
            
            <AnimatedStatsGrid />
          </div>

          {/* SVG Area Chart widget */}
          <NetworkChart />
        </div>
      </section>

      {/* TRY THESE MODS SECTION */}
      <section className="py-28 px-6 sm:px-8 border-t border-white/5 bg-[#060606]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">exploration</p>
            <h2 className="text-4xl md:text-5xl font-display tracking-wide uppercase">Try These Prompts</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border border-white/5 bg-surface/20 backdrop-blur-sm"
            >
              <h3 className="font-display text-xl mb-4 text-accent flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Mood Overrides
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-text-secondary font-mono">
                <li className="pb-2 border-b border-white/5">Mention you are feeling down <span className="text-accent ml-1">→ Sad</span></li>
                <li className="pb-2 border-b border-white/5">Tell a funny cosmic joke <span className="text-accent ml-1">→ Happy</span></li>
                <li className="pb-2 border-b border-white/5">Mention a major network lag <span className="text-accent ml-1">→ Shock</span></li>
                <li className="pb-2 border-b border-white/5">Offer a sweet virtual snack <span className="text-accent ml-1">→ Shy</span></li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-2xl border border-white/5 bg-surface/20 backdrop-blur-sm"
            >
              <h3 className="font-display text-xl mb-4 text-accent flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Forge Secrets
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-text-secondary font-mono">
                <li className="pb-2 border-b border-white/5">Ask "Why did you transform into an anime girl?"</li>
                <li className="pb-2 border-b border-white/5">Ask "Do you remember the cosmic space void?"</li>
                <li className="pb-2 border-b border-white/5">Ask "How can I deploy a sovereign agent harness?"</li>
                <li className="pb-2 border-b border-white/5">Say "glitch" directly to trigger glitches.</li>
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
      <section className="py-24 px-8 border-t border-white/5 bg-surface/25 backdrop-blur-md text-left md:text-center relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-6">
          <h2 className="text-4xl font-display tracking-wider uppercase mb-4 text-accent">Ready to Meet Siggy?</h2>
          <p className="text-text-secondary max-w-xl md:mx-auto text-sm">
            Begin your journey through visual novel paths or deploy autonomous agents onto the Ritual Testnet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-start md:justify-center pt-3">
            <Link href="/story" className="w-full sm:w-auto">
              <button className="w-full px-8 py-3.5 bg-surface/40 hover:bg-surface/60 border border-white/5 hover:border-accent/40 text-text-primary hover:text-accent font-mono text-sm uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-3">
                <BookOpen className="w-4 h-4" />
                Read Story
              </button>
            </Link>
            <Link href="/chat" className="w-full sm:w-auto">
              <button className="w-full px-8 py-3.5 bg-gradient-to-r from-accent to-yellow-400 text-black font-mono text-sm font-bold uppercase tracking-wider rounded-lg transition-all hover:from-yellow-400 hover:to-accent flex items-center justify-center gap-3">
                <MessageSquare className="w-4 h-4" />
                Start Chat
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (dialogueIdx >= chatDialogue.length) {
      const timer = setTimeout(() => {
        setMessages([]);
        setDialogueIdx(0);
      }, 6000);
      return () => clearTimeout(timer);
    }

    const currentMsg = chatDialogue[dialogueIdx];
    const delay = currentMsg.sender === 'siggy' ? 1400 : 900;
    
    const typingTimer = setTimeout(() => {
      if (currentMsg.sender === 'siggy') {
        setIsTyping(true);
        const showMsgTimer = setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [...prev, currentMsg]);
          setDialogueIdx((idx) => idx + 1);
        }, 1600);
        return () => clearTimeout(showMsgTimer);
      } else {
        setMessages((prev) => [...prev, currentMsg]);
        setDialogueIdx((idx) => idx + 1);
      }
    }, delay);

    return () => clearTimeout(typingTimer);
  }, [dialogueIdx]);

  return (
    <div className="border border-white/5 bg-[#0a0a0a]/70 backdrop-blur-md rounded-2xl p-4 shadow-2xl font-sans text-xs w-full">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">Siggy Chat Simulator</span>
        </div>
        <div className="flex gap-1">
          <span className="font-mono text-[9px] text-accent/80 uppercase">Harness: Active</span>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1 flex flex-col scrollbar-thin">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 items-end ${msg.sender === 'summoner' ? 'flex-row-reverse' : ''}`}
          >
            {msg.sender === 'siggy' ? (
              <div className="relative w-7 h-7 rounded-full bg-surface overflow-hidden border border-accent/20 shrink-0">
                <Image
                  src={
                    msg.mood === 'happy' ? '/siggy-girl-happy.png' :
                    msg.mood === 'shock' ? '/siggy-girl-shock.png' :
                    msg.mood === 'sad' ? '/siggy-girl-sad.png' :
                    msg.mood === 'shy' ? '/siggy-girl-shy.png' :
                    msg.mood === 'angry' ? '/siggy-girl-angry.png' :
                    '/siggy-girl-default.png'
                  }
                  alt="Siggy avatar"
                  fill
                  className="object-contain"
                  sizes="28px"
                />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent/20 border border-white/10 flex items-center justify-center shrink-0 text-[10px] font-mono text-accent">
                SUM
              </div>
            )}
            
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed ${
                msg.sender === 'summoner'
                  ? 'bg-accent text-black font-medium rounded-br-none'
                  : 'bg-surface/50 border border-white/5 text-text-primary rounded-bl-none'
              }`}
            >
              <p>{msg.text}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2.5 items-end">
            <div className="relative w-7 h-7 rounded-full bg-surface overflow-hidden border border-accent/20 shrink-0">
              <Image src="/siggy-girl-happy.png" alt="Siggy avatar" fill className="object-contain" sizes="28px" />
            </div>
            <div className="bg-surface/50 border border-white/5 text-text-secondary rounded-2xl rounded-bl-none px-3.5 py-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function NetworkChart() {
  return (
    <div className="relative border border-white/5 bg-[#0a0a0a]/60 backdrop-blur-md rounded-2xl p-5 shadow-xl w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">Network Heartbeat</span>
          <h4 className="font-display text-xl text-accent">Global Executions</h4>
        </div>
        <div className="flex gap-3 font-mono text-[9px] text-text-secondary">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> Wakeups</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> TEE Proof</span>
        </div>
      </div>
      
      {/* SVG Line Graph */}
      <div className="h-44 w-full relative">
        <svg viewBox="0 0 500 150" className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <line x1="0" y1="25" x2="500" y2="25" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
          <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
          <line x1="0" y1="125" x2="500" y2="125" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
          
          <line x1="100" y1="0" x2="100" y2="150" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
          <line x1="200" y1="0" x2="200" y2="150" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
          <line x1="300" y1="0" x2="300" y2="150" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
          <line x1="400" y1="0" x2="400" y2="150" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />

          {/* Area Fill */}
          <path
            d="M0 150 L 0 110 Q 50 140 100 80 T 200 60 T 300 90 T 400 40 T 500 20 L 500 150 Z"
            fill="url(#chartGlow)"
          />
          
          {/* Main Line */}
          <path
            d="M0 110 Q 50 140 100 80 T 200 60 T 300 90 T 400 40 T 500 20"
            fill="none"
            stroke="url(#lineGlow)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Glowing Points */}
          <circle cx="100" cy="80" r="5" fill="#FFD700" className="animate-ping" style={{ transformOrigin: '100px 80px' }} />
          <circle cx="100" cy="80" r="4" fill="#FFD700" stroke="#050505" strokeWidth="1.5" />
          
          <circle cx="300" cy="90" r="5" fill="#FFD700" className="animate-ping" style={{ transformOrigin: '300px 90px' }} />
          <circle cx="300" cy="90" r="4" fill="#FFD700" stroke="#050505" strokeWidth="1.5" />

          <circle cx="500" cy="20" r="5" fill="#FFD700" className="animate-ping" style={{ transformOrigin: '500px 20px' }} />
          <circle cx="500" cy="20" r="4" fill="#FFD700" stroke="#050505" strokeWidth="1.5" />
        </svg>
      </div>
      
      <div className="flex justify-between font-mono text-[9px] text-text-secondary mt-2 border-t border-white/5 pt-2">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>Now</span>
      </div>
    </div>
  );
}

function AnimatedStatsGrid() {
  const agents = useCountUp(1420);
  const wakeups = useCountUp(849000);
  const nodes = useCountUp(15);

  return (
    <div ref={agents.ref} className="grid grid-cols-2 gap-4">
      <div className="border border-white/5 bg-surface/20 p-4 rounded-xl hover:border-accent/20 transition-colors">
        <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">Agents Deployed</span>
        <p className="mt-1 font-display text-3xl text-accent">
          {agents.val.toLocaleString()}
        </p>
      </div>
      <div ref={wakeups.ref} className="border border-white/5 bg-surface/20 p-4 rounded-xl hover:border-accent/20 transition-colors">
        <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">Network Wakeups</span>
        <p className="mt-1 font-display text-3xl text-accent">
          {wakeups.val >= 1000 ? `${(wakeups.val / 1000).toFixed(0)}k` : wakeups.val}
        </p>
      </div>
      <div ref={nodes.ref} className="border border-white/5 bg-surface/20 p-4 rounded-xl hover:border-accent/20 transition-colors">
        <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">Active Nodes</span>
        <p className="mt-1 font-display text-3xl text-accent">{nodes.val}</p>
      </div>
      <div className="border border-white/5 bg-surface/20 p-4 rounded-xl hover:border-emerald-400/20 transition-colors">
        <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">Node Uptime</span>
        <p className="mt-1 font-display text-3xl text-emerald-400">99.9%</p>
      </div>
    </div>
  );
}
