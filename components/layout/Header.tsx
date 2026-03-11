'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/components/providers/SettingsProvider';

const VN_MODE_KEY = 'siggy-vn-mode';

export function Header() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [vnMode, setVnMode] = useState(false);

  // Story Mode Settings State
  const [showSettings, setShowSettings] = useState(false);
  const {
    sfxEnabled, setSfxEnabled,
    sfxVolume, setSfxVolume,
    typingSfxEnabled, setTypingSfxEnabled,
    bgmEnabled, setBgmEnabled,
    bgmVolume, setBgmVolume,
    textSpeed, setTextSpeed,
    showTimestamps, setShowTimestamps
  } = useSettings();
  
  // Close settings when clicking outside
  const settingsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMounted(true);
    // Load VN mode state
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VN_MODE_KEY);
      setVnMode(saved === 'true');
    }
  }, []);

  const scrollToBio = () => {
    const bioSection = document.getElementById('bio-section');
    if (bioSection) {
      bioSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleVNMode = () => {
    const newMode = !vnMode;
    setVnMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VN_MODE_KEY, String(newMode));
      // Dispatch custom event for chat page to listen
      window.dispatchEvent(new CustomEvent('vnModeToggle', { detail: newMode }));
    }
  };

  const getRightButton = () => {
    // On chat page, show VN mode toggle
    if (pathname === '/chat') {
      return {
        text: vnMode ? 'CHAT MODE' : 'VN MODE',
        onClick: toggleVNMode,
        className: 'bg-gradient-to-r from-accent to-yellow-400 text-bg'
      };
    }
    // On story page, show SETTINGS button
    if (pathname === '/story') {
      return {
        text: 'SETTINGS',
        onClick: () => setShowSettings(!showSettings),
        className: 'bg-accent text-bg'
      };
    }
    // On other pages, show AUTHOR button
    return {
      text: 'AUTHOR',
      onClick: scrollToBio,
      className: 'bg-accent text-bg'
    };
  };

  const rightButton = getRightButton();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-6 bg-gradient-to-b from-bg via-bg/80 to-transparent">
      <div className="w-full max-w-7xl mx-auto px-8 grid grid-cols-3 items-center">
        {/* Logo - Left */}
        <Link href="/" className="flex items-center gap-6 justify-start">
          <Image
            src="/logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="h-10 object-contain"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/100x40?text=Siggy";
            }}
          />
          <span className="text-2xl font-mono tracking-widest uppercase text-accent">SIGGY</span>
        </Link>

        {/* Desktop Navigation - Centered */}
        <nav className="hidden md:flex items-center justify-center gap-8 text-sm font-medium">
          <Link href="/" className="hover:text-accent transition-colors">Home</Link>
          <a href="#about" className="hover:text-accent transition-colors">About</a>
          <Link href="/story" className="hover:text-accent transition-colors">Story</Link>
          <Link href="/chat" className="hover:text-accent transition-colors">Chat</Link>
        </nav>

        {/* Right Button - Adaptive */}
        <div className="hidden md:flex justify-end relative" ref={settingsRef}>
          <button
            onClick={rightButton.onClick}
            className={`${rightButton.className} px-6 py-2 rounded-full font-bold text-sm hover:opacity-90 transition-all font-mono tracking-wider flex items-center gap-2`}
          >
            {rightButton.text}
          </button>

          {/* Settings Modal Dropdown specifically for Story Mode */}
          <AnimatePresence>
            {pathname === '/story' && showSettings && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full mt-4 bg-black/90 backdrop-blur-2xl border border-white/20 p-6 rounded-2xl shadow-2xl w-[320px] md:w-[380px] text-white max-h-[75vh] overflow-y-auto signature-scroll"
              >
                <h3 className="font-display text-xl tracking-wider text-accent mb-6 border-b border-white/20 pb-3 text-left">Settings</h3>
                
                <div className="space-y-8 text-left">
                  {/* Audio Section */}
                  <div>
                    <h4 className="font-mono text-sm uppercase text-gray-400 mb-4 tracking-widest pl-2 border-l-2 border-accent">Audio</h4>
                    <div className="space-y-5 pl-2">
                      {/* SFX Toggle */}
                      <div className="flex items-start justify-between">
                        <div>
                          <label className="text-sm font-bold block mb-1">Sound Effects</label>
                          <span className="text-xs text-gray-400 block max-w-[200px]">Emotion transitions, UI sounds</span>
                        </div>
                        <button 
                          onClick={() => setSfxEnabled(!sfxEnabled)} 
                          className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${sfxEnabled ? 'bg-accent' : 'bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${sfxEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      {/* SFX Volume */}
                      <div className="space-y-2 opacity-50 pointer-events-none">
                        <div className="flex justify-between text-xs font-mono text-gray-400">
                          <span>SFX Volume</span>
                          <span>{sfxVolume}</span>
                        </div>
                        <input type="range" min="0" max="100" value={sfxVolume} onChange={(e) => setSfxVolume(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent" />
                      </div>

                      {/* Typing Sounds */}
                      <div className="flex items-start justify-between">
                        <div>
                          <label className="text-sm font-bold block mb-1">Typing Sounds</label>
                          <span className="text-xs text-gray-400 block max-w-[200px]">Typewriter SFX while Siggy responds</span>
                        </div>
                        <button 
                          onClick={() => setTypingSfxEnabled(!typingSfxEnabled)} 
                          className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${typingSfxEnabled ? 'bg-accent' : 'bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${typingSfxEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      {/* BGM Toggle */}
                      <div className="flex items-start justify-between pt-2 border-t border-white/10">
                        <div>
                          <label className="text-sm font-bold block mb-1">Background Music</label>
                        </div>
                        <button 
                          onClick={() => setBgmEnabled(!bgmEnabled)} 
                          className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${bgmEnabled ? 'bg-accent' : 'bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${bgmEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      {/* BGM Volume */}
                      <div className="space-y-2 opacity-50 pointer-events-none">
                        <div className="flex justify-between text-xs font-mono text-gray-400">
                          <span>BGM Volume</span>
                          <span>{bgmVolume}</span>
                        </div>
                        <input type="range" min="0" max="100" value={bgmVolume} onChange={(e) => setBgmVolume(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent" />
                      </div>
                    </div>
                  </div>

                  {/* Text & Display Section */}
                  <div>
                    <h4 className="font-mono text-sm uppercase text-gray-400 mb-4 tracking-widest pl-2 border-l-2 border-accent">Text & Display</h4>
                    <div className="space-y-5 pl-2">
                      {/* Text Speed */}
                      <div>
                        <label className="text-sm font-bold block mb-1">Text Speed</label>
                        <span className="text-xs text-gray-400 block mb-3">How fast Siggy's text appears</span>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'Slow', value: 60 },
                            { label: 'Normal', value: 30 },
                            { label: 'Fast', value: 10 },
                            { label: 'Instant', value: 0 }
                          ].map(speed => (
                            <button
                              key={speed.label}
                              onClick={() => setTextSpeed(speed.value)}
                              className={`py-1.5 px-1 text-[10px] sm:text-xs font-mono rounded transition-colors border ${textSpeed === speed.value ? 'bg-accent/20 border-accent text-accent' : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30'}`}
                            >
                              {speed.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Show Timestamps */}
                      <div className="flex items-start justify-between">
                        <div>
                          <label className="text-sm font-bold block mb-1">Show Timestamps</label>
                        </div>
                        <button 
                          onClick={() => setShowTimestamps(!showTimestamps)} 
                          className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${showTimestamps ? 'bg-accent' : 'bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showTimestamps ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-text-primary p-2 col-start-3 justify-self-end"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

      {/* Mobile Menu Sidebar */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sidebar */}
          <div className="absolute right-8 top-20 w-64 bg-surface border border-border rounded-2xl z-50 md:hidden shadow-2xl">
            {/* Navigation Links */}
            <nav className="p-4 space-y-2">
              <Link
                href="/"
                className="block font-mono text-xs uppercase tracking-wider text-text-primary hover:text-accent transition-colors py-2 px-3 rounded-lg hover:bg-surface"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <a
                href="#about"
                className="block font-mono text-xs uppercase tracking-wider text-text-primary hover:text-accent transition-colors py-2 px-3 rounded-lg hover:bg-surface"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </a>
              <Link
                href="/story"
                className="block font-mono text-xs uppercase tracking-wider text-text-primary hover:text-accent transition-colors py-2 px-3 rounded-lg hover:bg-surface"
                onClick={() => setMobileMenuOpen(false)}
              >
                Story
              </Link>
              <Link
                href="/chat"
                className="block font-mono text-xs uppercase tracking-wider text-text-primary hover:text-accent transition-colors py-2 px-3 rounded-lg hover:bg-surface"
                onClick={() => setMobileMenuOpen(false)}
              >
                Chat
              </Link>
              <button
                onClick={() => {
                  rightButton.onClick();
                  setMobileMenuOpen(false);
                }}
                className="w-full block font-mono text-xs uppercase tracking-wider py-2 px-3 rounded-lg hover:bg-opacity-90 transition-colors text-center text-bg"
                style={{ backgroundColor: pathname === '/chat' ? 'rgb(250, 204, 21)' : 'var(--color-accent)' }}
              >
                {rightButton.text}
              </button>
            </nav>
          </div>
        </>
      )}
      </div>
    </header>
  );
}
