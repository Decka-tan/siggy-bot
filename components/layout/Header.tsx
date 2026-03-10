'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToBio = () => {
    const bioSection = document.getElementById('bio-section');
    if (bioSection) {
      bioSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-6 flex items-center justify-between bg-gradient-to-b from-bg via-bg/80 to-transparent">
      <div className="w-full max-w-7xl mx-auto px-8 flex items-center justify-between">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="Logo"
          width={40}
          height={40}
          className="h-10 object-contain"
          onError={(e) => {
            // Fallback if logo isn't available
            e.currentTarget.src = "https://via.placeholder.com/100x40?text=Siggy";
          }}
        />
      </Link>

      {/* Desktop Navigation - Centered */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
        <Link href="/" className="hover:text-accent transition-colors">Home</Link>
        <a href="#about" className="hover:text-accent transition-colors">About</a>
        <Link href="/story" className="hover:text-accent transition-colors">Story</Link>
        <Link href="/chat" className="hover:text-accent transition-colors">Chat</Link>
      </nav>

      {/* Author Button */}
      <div className="hidden md:block">
        <button
          onClick={scrollToBio}
          className="bg-accent text-bg px-6 py-2 rounded-full font-bold text-sm hover:bg-opacity-90 transition-all"
        >
          AUTHOR
        </button>
      </div>

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
                  scrollToBio();
                  setMobileMenuOpen(false);
                }}
                className="w-full block font-mono text-xs uppercase tracking-wider bg-accent text-bg py-2 px-3 rounded-lg hover:bg-opacity-90 transition-colors text-center"
              >
                AUTHOR
              </button>
            </nav>
          </div>
        </>
      )}
      </div>
    </header>
  );
}
