'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';

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
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/chat">
              <button className="group w-full sm:w-auto bg-accent text-black hover:bg-accent/90 font-mono text-sm uppercase tracking-wider px-8 py-4 rounded-lg transition-all flex items-center justify-center gap-3">
                Start Chatting
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

      {/* About Section */}
      <section className="py-24 px-6 border-t border-border bg-surface">
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
      <section className="py-24 px-6 bg-bg">
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
      <section className="py-24 px-6 border-t border-border bg-surface">
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

      {/* About/Bio Section */}
      <section className="py-24 px-6 border-t border-border bg-bg">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-display tracking-wide uppercase mb-8"
            >
              Decka-chan
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm text-text-secondary"
            >
              Creator & Designer
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed"
            >
              As known as Decka-chan in Ritual Discord. Cute anime girl on Ritual. Ritty on Ritual Discord. Passionate about graphic design, lettering, and vibe coding.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
            >
              <a
                href="https://github.com/Decka-tan"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-surface border border-border hover:border-accent hover:text-accent transition-all font-mono text-sm uppercase tracking-wider rounded-lg"
              >
                GitHub
              </a>
              <a
                href="https://github.com/Decka-tan/ritual-word-search"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-surface border border-border hover:border-accent hover:text-accent transition-all font-mono text-sm uppercase tracking-wider rounded-lg"
              >
                Ritual Word Search
              </a>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
