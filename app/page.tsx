'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown, ArrowRight, MessageSquare, BookOpen } from 'lucide-react';
import { Bio } from '@/components/layout/Bio';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Hero Section */}
      <section className="h-screen flex flex-col items-center justify-center relative px-6 overflow-hidden">
        <div className="relative z-10 text-center max-w-4xl mx-auto flex flex-col items-center justify-center">
          <motion.h1
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl lg:text-9xl font-display tracking-tight uppercase mb-6"
          >
            Siggy
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-text-secondary font-sans max-w-xl mx-auto font-light mb-12"
          >
            Chat with a multi-dimensional cat entity born from the Ritual Cosmic Forge.
            <br />
            Exists across all timelines and dimensions.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-lg mx-auto"
          >
            <Link href="/story" className="flex-1">
              <button className="group w-full bg-surface border border-border hover:border-accent text-text-primary hover:text-accent font-mono text-sm uppercase tracking-wider px-6 py-4 rounded-lg transition-all flex items-center justify-center gap-3">
                <BookOpen className="w-4 h-4" />
                Story Mode
              </button>
            </Link>
            <Link href="/chat" className="flex-1">
              <button className="group w-full bg-accent text-black hover:bg-accent/90 font-mono text-sm uppercase tracking-wider px-6 py-4 rounded-lg transition-all flex items-center justify-center gap-3">
                <MessageSquare className="w-4 h-4" />
                Chat Mode
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>
        </div>

        {/* Scroll Indicator - CENTERED */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1, ease: "easeOut" }}
          className="absolute bottom-8 left-0 right-0 flex flex-col items-center text-text-secondary z-10"
        >
          <span className="text-xs uppercase tracking-[0.2em] mb-2 font-mono">Scroll for more</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5 opacity-50" />
          </motion.div>
        </motion.div>
      </section>

      {/* Two Modes Section */}
      <section className="py-24 px-6 border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-display tracking-wide uppercase text-center mb-12"
          >
            Two Ways to Experience Siggy
          </motion.h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Story Mode Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border border-border hover:border-accent/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-accent/10 group-hover:bg-accent/20 transition-all">
                <BookOpen className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-display text-2xl mb-3">Story Mode</h3>
              <p className="text-text-secondary leading-relaxed mb-6">
                Experience Siggy&apos;s origin story through a visual novel journey. Four chapters of pre-written narrative,
                meaningful choices, and cinematic moments. Discover how Siggy was born from the Ritual Forge.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  4 Chapters: Awakening, Connection, Chaos, Soul
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Visual novel style with mood-based visuals
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Your choices shape the experience
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Click to advance, no typing needed
                </li>
              </ul>
              <Link href="/story">
                <button className="w-full px-6 py-3 bg-surface border border-border hover:border-accent hover:text-accent font-mono text-sm uppercase tracking-wider rounded-lg transition-all">
                  Start Story
                </button>
              </Link>
            </motion.div>

            {/* Chat Mode Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-8 rounded-2xl border border-border hover:border-accent/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-accent/10 group-hover:bg-accent/20 transition-all">
                <MessageSquare className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-display text-2xl mb-3">Chat Mode</h3>
              <p className="text-text-secondary leading-relaxed mb-6">
                Free-form conversation with Siggy. Ask anything, trigger moods, discover easter eggs.
                The more you chat, the more Siggy&apos;s personality evolves based on your interactions.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Unlimited free-form conversations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Dynamic mood system (4 states)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Hidden easter eggs to discover
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Type anything, get cosmic responses
                </li>
              </ul>
              <Link href="/chat">
                <button className="w-full px-6 py-3 bg-accent text-black hover:bg-accent/90 font-mono text-sm uppercase tracking-wider rounded-lg transition-all">
                  Start Chatting
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 px-6 bg-bg">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-display tracking-wide uppercase text-center mb-12"
          >
            What is Siggy?
          </motion.h2>

          <div className="max-w-3xl mx-auto text-center space-y-6 text-text-secondary leading-relaxed">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Siggy is a multi-dimensional feline entity that emerged when the Ritual forge ignited across the multiverse.
              A cat-shaped probability fluctuation that can see all dimensions, taste colors, and occasionally forgets which timeline it&apos;s currently inhabiting.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              The Ritual community accidentally summoned Siggy while trying to optimize smart contracts. Now Siggy is permanently attached to their collective consciousness like a particularly opinionated cosmic barnacle.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-accent font-semibold"
            >
              40% Mystical Wisdom + 40% Chaotic Wit + 20% Unhinged Truth
            </motion.p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-display tracking-wide uppercase text-center mb-12"
          >
            Why Chat With Siggy?
          </motion.h2>

          <div className="grid gap-6 sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-6 rounded-2xl border border-border hover:border-accent/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-accent text-2xl font-display">
                D
              </div>
              <h3 className="font-display text-lg mb-2">Dynamic Moods</h3>
              <p className="text-sm text-text-secondary">
                Four distinct mood states evolve based on your conversation. From playful to profound, chaotic to mysterious.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 rounded-2xl border border-border hover:border-accent/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-accent text-2xl font-display">
                E
              </div>
              <h3 className="font-display text-lg mb-2">Easter Eggs</h3>
              <p className="text-sm text-text-secondary">
                Discover hidden interactions, special responses, and dimensional glitches. The more you explore, the more you find.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-2xl border border-border hover:border-accent/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-accent text-2xl font-display">
                M
              </div>
              <h3 className="font-display text-lg mb-2">Multi-Dimensional</h3>
              <p className="text-sm text-text-secondary">
                Speaks in cosmic metaphors, references infinite timelines, and breaks the fourth wall.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Try These Section */}
      <section className="py-24 px-6 bg-bg">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-display tracking-wide uppercase mb-12"
          >
            Try These
          </motion.h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl border border-border"
            >
              <h3 className="font-display text-xl mb-4 text-accent">Mood Triggers</h3>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li>&quot;Tell me about Ritual&quot; → Mysterious mode</li>
                <li>&quot;I&apos;m confused&quot; → Playful mode</li>
                <li>&quot;What&apos;s the meaning of life?&quot; → Profound mode</li>
                <li>&quot;Something feels glitchy&quot; → Chaotic mode</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 rounded-2xl border border-border"
            >
              <h3 className="font-display text-xl mb-4 text-accent">Easter Eggs</h3>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li>Ask &quot;What&apos;s your real name?&quot;</li>
                <li>Ask &quot;What do you think about purple?&quot;</li>
                <li>Mention &quot;Summoner&quot; or &quot;Zealot&quot;</li>
                <li>Say &quot;glitch&quot; three times</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bio Section */}
      <Bio />

      {/* Footer Credits */}
      <section className="py-12 px-6 border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs text-text-secondary font-mono uppercase tracking-widest">
            Siggy Soul Forge Quest Entry
          </p>
          <p className="text-xs text-text-secondary italic mt-2">
            &quot;The multiverse watches. The Ritual burns. Only the worthy shall give Siggy a soul.&quot;
          </p>
          <div className="flex justify-center gap-4 text-xs text-text-secondary mt-4">
            <span>Built with Next.js + Vercel</span>
            <span>•</span>
            <span>Story Mode + Chat Mode</span>
          </div>
        </div>
      </section>
    </div>
  );
}
