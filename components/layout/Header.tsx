'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex items-center justify-between bg-gradient-to-b from-bg via-bg/80 to-transparent backdrop-blur-md">
      <Link href="/" className="flex items-center gap-3 group">
        <span className="text-2xl font-display tracking-tight uppercase text-text-primary group-hover:text-accent transition-colors">
          Siggy
        </span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest text-text-primary">
        <Link href="/story" className="hover:text-accent transition-colors">Story</Link>
        <Link href="/chat" className="hover:text-accent transition-colors">Chat</Link>
        <a href="https://github.com/Decka-tan/siggy-bot" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">GitHub</a>
      </nav>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden text-text-primary p-2"
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
          <div className="absolute right-6 top-20 w-64 bg-surface border border-border rounded-2xl z-50 md:hidden shadow-2xl">
            {/* Navigation Links */}
            <nav className="p-4 space-y-2">
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
              <a
                href="https://github.com/Decka-tan/siggy-bot"
                target="_blank"
                rel="noopener noreferrer"
                className="block font-mono text-xs uppercase tracking-wider text-text-primary hover:text-accent transition-colors py-2 px-3 rounded-lg hover:bg-surface"
              >
                GitHub
              </a>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
