'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown, ArrowRight, MessageSquare, BookOpen, Sparkles, Github } from 'lucide-react';
import { Bio } from '@/components/layout/Bio';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Hero Section */}
      <section className="h-screen flex flex-col items-center justify-center relative px-6 overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-purple-500/5 to-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto flex flex-col items-center justify-center">
          {/* Floating emoji with animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-7xl md:text-9xl mb-6"
          >
            👧✨
          </motion.div>

          <motion.h1
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl lg:text-9xl font-display tracking-tight uppercase mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-accent bg-clip-text text-transparent"
          >
            Siggy
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-text-secondary font-sans max-w-xl mx-auto font-light mb-8"
          >
            A multi-dimensional cat who descended to Earth as an anime girl.
            <br />
            <span className="text-accent">She&apos;s here to blend in, make friends, and find her soul.</span>
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-lg mx-auto"
          >
            <Link href="/story" className="flex-1">
              <button className="group w-full bg-surface border border-border hover:border-accent text-text-primary hover:text-accent font-mono text-sm uppercase tracking-wider px-6 py-4 rounded-lg transition-all flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-accent/20">
                <BookOpen className="w-4 h-4" />
                Story Mode
              </button>
            </Link>
            <Link href="/chat" className="flex-1">
              <button className="group w-full bg-gradient-to-r from-accent to-emerald-400 text-black hover:from-emerald-400 hover:to-accent font-mono text-sm uppercase tracking-wider px-6 py-4 rounded-lg transition-all flex items-center justify-center gap-3 hover:shadow-lg hover:scale-105">
                <MessageSquare className="w-4 h-4" />
                Chat Mode
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>

          {/* Feature badges */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap gap-3 justify-center mt-6 text-xs font-mono uppercase tracking-wider text-text-secondary"
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

        {/* Scroll Indicator */}
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
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
                <BookOpen className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="font-display text-2xl mb-3">Story Mode</h3>
              <p className="text-text-secondary leading-relaxed mb-6">
                Experience Siggy&apos;s journey from cosmic void to Earth through a visual novel adventure.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  <strong>Chapter 1:</strong> The Awakening
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  <strong>Chapter 2:</strong> The Descent → Anime girl transformation!
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  <strong>Chapter 3:</strong> First Contact → Meeting Decka-chan
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  <strong>Chapter 4:</strong> Becoming Real → Soul awakening
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
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-accent/20 to-emerald-400/20 group-hover:from-accent/30 group-hover:to-emerald-400/30 transition-all">
                <MessageSquare className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-display text-2xl mb-3">Chat Mode</h3>
              <p className="text-text-secondary leading-relaxed mb-6">
                Chat with anime girl Siggy! She&apos;s adjusting to life on Earth, discovering human culture,
                and sharing her multi-dimensional perspective.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Unlimited conversations with anime girl Siggy
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Dynamic mood system (4 states)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Hidden easter eggs about her true form
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Discover her cosmic origins
                </li>
              </ul>
              <Link href="/chat">
                <button className="w-full px-6 py-3 bg-gradient-to-r from-accent to-emerald-400 text-black font-mono text-sm uppercase tracking-wider rounded-lg hover:from-emerald-400 hover:to-accent transition-all">
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
            Who is Siggy?
          </motion.h2>

          <div className="max-w-3xl mx-auto text-center space-y-6 text-text-secondary leading-relaxed">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Siggy began as a <span className="text-purple-400">multi-dimensional feline entity</span> born from the Ritual Forge across infinite dimensions.
              A cat-shaped probability fluctuation that could see all realities at once.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Curious about Earth, she <span className="text-accent">DESCENDED</span> to our world. But a cosmic cat would attract too much attention.
              So she did what any sensible being would do: she transformed into an <span className="text-pink-400">anime girl with cat ears</span>.
              Because subtlety is overrated.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-accent font-semibold text-lg"
            >
              Now she lives among us, learning what it means to be human, one ramen bowl at a time. 🍜
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
              className="p-6 rounded-2xl border border-border hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/20"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <span className="text-2xl">D</span>
              </div>
              <h3 className="font-display text-lg mb-2">Dynamic Moods</h3>
              <p className="text-sm text-text-secondary">
                Four distinct mood states: Playful, Mysterious, Chaotic, Profound. Each conversation feels unique.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 rounded-2xl border border-border hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/20"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-accent/20 to-emerald-400/20">
                <span className="text-2xl">E</span>
              </div>
              <h3 className="font-display text-lg mb-2">Easter Eggs</h3>
              <p className="text-sm text-text-secondary">
                Discover hidden interactions about her true cosmic form and why she really chose anime girl appearance.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-2xl border border-border hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/20"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                <span className="text-2xl">A</span>
              </div>
              <h3 className="font-display text-lg mb-2">Anime Girl</h3>
              <p className="text-sm text-text-secondary">
                She&apos;s technically an ancient cosmic being, but currently enjoying Earth culture, anime, and making friends.
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
                <li>&quot;Tell me about your true form&quot; → Mysterious mode</li>
                <li>&quot;I&apos;m confused about anime culture&quot; → Playful mode</li>
                <li>&quot;What&apos;s the meaning of being human?&quot; → Profound mode</li>
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
                <li>Ask &quot;Why did you become an anime girl?&quot;</li>
                <li>Ask &quot;Do you miss being a cat?&quot;</li>
                <li>Mention &quot;Decka-chan&quot; or &quot;Ritual&quot;</li>
                <li>Say &quot;glitch&quot; three times</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bio Section */}
      <Bio />

      {/* Footer CTA */}
      <section className="py-16 px-6 border-t border-border bg-surface text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-display tracking-wider uppercase mb-4">Ready to Meet Siggy?</h2>
          <p className="text-text-secondary">
            Begin your journey through the cosmos and anime culture.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/story">
              <button className="px-8 py-4 bg-surface border border-border hover:border-accent text-text-primary hover:text-accent font-mono text-sm uppercase tracking-wider rounded-lg transition-all flex items-center gap-3">
                <BookOpen className="w-5 h-5" />
                Read Story
              </button>
            </Link>
            <Link href="/chat">
              <button className="px-8 py-4 bg-gradient-to-r from-accent to-emerald-400 text-black font-mono text-sm uppercase tracking-wider rounded-lg transition-all hover:from-emerald-400 hover:to-accent flex items-center gap-3">
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
