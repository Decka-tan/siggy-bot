'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, ArrowRight, MessageSquare, BookOpen, Sparkles } from 'lucide-react';
import { Bio } from '@/components/layout/Bio';

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
          <div className="max-w-7xl mx-auto px-8 pt-20 h-full flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 flex flex-col items-start justify-center z-10">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-6xl md:text-8xl lg:text-9xl font-display leading-[0.85] tracking-tight mb-6 text-accent"
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
                className="flex flex-col sm:flex-row gap-4 w-full max-w-lg"
              >
                <Link href="/story" className="flex-1 min-w-[160px]">
                  <button className="w-full bg-surface border border-border hover:border-accent text-text-primary hover:text-accent font-mono text-sm uppercase tracking-wider px-8 py-4 rounded-lg transition-all flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-accent/20 whitespace-nowrap">
                    <BookOpen className="w-4 h-4" />
                    Story Mode
                  </button>
                </Link>
                <Link href="/chat" className="flex-1 min-w-[160px]">
                  <button className="w-full bg-gradient-to-r from-accent to-yellow-400 text-black hover:from-yellow-400 hover:to-accent font-mono text-sm uppercase tracking-wider px-8 py-4 rounded-lg transition-all flex items-center justify-center gap-3 hover:shadow-lg hover:scale-105 whitespace-nowrap">
                    <MessageSquare className="w-4 h-4" />
                    Chat Mode
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
          <div className="absolute bottom-0 right-0 pointer-events-none flex items-end justify-end" style={{ right: '-50px', bottom: '-20px' }}>
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
                className="object-contain object-bottom drop-shadow-2xl"
                priority
                style={{ height: '100vh', width: 'auto', maxHeight: '100vh', maxWidth: '55vw' }}
              />
            </motion.div>
          </div>
        </div>
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
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-accent/20 to-yellow-400/20 group-hover:from-accent/30 group-hover:to-yellow-400/30 transition-all">
                <BookOpen className="w-8 h-8 text-accent" />
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
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-accent/20 to-yellow-400/20 group-hover:from-accent/30 group-hover:to-yellow-400/30 transition-all">
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
                <button className="w-full px-6 py-3 bg-gradient-to-r from-accent to-yellow-400 text-black font-mono text-sm uppercase tracking-wider rounded-lg hover:from-yellow-400 hover:to-accent transition-all">
                  Start Chatting
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 bg-bg">
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

          {/* Expression Animation */}
          <div className="flex justify-center gap-8 mb-12">
            {/* Cat Expressions */}
            <div className="flex flex-col items-center">
              <p className="text-xs font-mono uppercase tracking-wider text-text-secondary mb-4">Cat Form</p>
              <div className="relative w-48 h-48">
                <style jsx>{`
                  @keyframes catExpression {
                    0%, 33% { opacity: 1; }
                    33.01%, 100% { opacity: 0; }
                  }
                  .cat-anim-1 { animation: catExpression 6s infinite; }
                  .cat-anim-2 { animation: catExpression 6s infinite 2s; }
                `}</style>
                <img src="/Siggy_01/Face/CAT/Cat_Happy.png" alt="Cat Happy" className="cat-anim-1 absolute inset-0 w-full h-full object-contain" />
                <img src="/Siggy_01/Face/CAT/Cat_Default.png" alt="Cat Default" className="cat-anim-2 absolute inset-0 w-full h-full object-contain" />
              </div>
            </div>

            {/* Anime Girl Expressions */}
            <div className="flex flex-col items-center">
              <p className="text-xs font-mono uppercase tracking-wider text-text-secondary mb-4">Anime Girl Form</p>
              <div className="relative w-48 h-48">
                <style jsx>{`
                  @keyframes girlExpression {
                    0%, 33% { opacity: 1; }
                    33.01%, 100% { opacity: 0; }
                  }
                  .girl-anim-1 { animation: girlExpression 6s infinite; }
                  .girl-anim-2 { animation: girlExpression 6s infinite 2s; }
                `}</style>
                <img src="/Siggy_01/Face/Girl/Girl_Default.png" alt="Girl Default" className="girl-anim-1 absolute inset-0 w-full h-full object-contain" />
                <img src="/Siggy_01/Face/Girl/Girl_Happy.png" alt="Girl Happy" className="girl-anim-2 absolute inset-0 w-full h-full object-contain" />
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto text-center space-y-6 text-text-secondary leading-relaxed">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Siggy began as a <span className="text-accent">multi-dimensional feline entity</span> born from the Ritual Forge across infinite dimensions.
              A cat-shaped probability fluctuation that could see all realities at once.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Curious about Earth, she <span className="text-accent">DESCENDED</span> to our world. But a cosmic cat would attract too much attention.
              So she did what any sensible being would do: she transformed into an <span className="text-accent">anime girl with cat ears</span>.
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
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-accent/20 to-yellow-400/20">
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
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-accent/20 to-yellow-400/20">
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
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-accent/20 to-yellow-400/20">
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
      <div id="bio-section">
        <Bio />
      </div>

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
              <button className="px-8 py-4 bg-gradient-to-r from-accent to-yellow-400 text-black font-mono text-sm uppercase tracking-wider rounded-lg transition-all hover:from-yellow-400 hover:to-accent flex items-center gap-3">
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
