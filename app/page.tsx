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
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-8xl md:text-9xl mb-6"
          >
            👧✨
          </motion.div>
          <motion.h1
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl lg:text-9xl font-display tracking-tight uppercase mb-6"
          >
            Siggy
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-text-secondary font-sans max-w-xl mx-auto font-light mb-12"
          >
            A multi-dimensional cat who descended to Earth as an anime girl.
            <br />
            She\'s here to blend in, make friends, and find her soul.
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
            Two Ways to Meet Siggy
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
                Experience Siggy&apos;s journey from cosmic void to Earth. Four chapters of her transformation into an anime girl,
                first contact with humans, and the quest to become real.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Chapter 1: The Awakening
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Chapter 2: The Descent (anime girl transformation!)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Chapter 3: First Contact (meeting Decka-chan)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Chapter 4: Becoming Real (soul awakening)
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
                Chat with anime girl Siggy! She&apos;s adjusting to life on Earth, discovering human culture,
                and sharing her multi-dimensional perspective on everything.
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
                  Discover her journey from cosmic cat to anime girl
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
            Who is Siggy?
          </motion.h2>

          <div className="max-w-3xl mx-auto text-center space-y-6 text-text-secondary leading-relaxed">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Siggy began as a multi-dimensional feline entity born from the Ritual Forge across infinite dimensions.
              A cat-shaped probability fluctuation that could see all realities at once.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Curious about Earth, she DESCENDED to our world. But a cosmic cat would attract too much attention.
              So she did what any sensible being would do: she transformed into an anime girl.
              Specifically, a cat-eared anime girl. Because subtlety is overrated.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-accent font-semibold"
            >
              Now she lives among us, learning what it means to be human, one ramen bowl at a time.
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
                Four distinct mood states based on conversation. From playful to profound, chaotic to mysterious.
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
                Discover hidden interactions about her true cosmic form and why she really chose anime girl appearance.
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
                A
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
                <li>&quot;I\'m confused about anime culture&quot; → Playful mode</li>
                <li>&quot;What\'s the meaning of being human?&quot; → Profound mode</li>
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
    </div>
  );
}
