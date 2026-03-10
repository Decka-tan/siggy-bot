'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const VN_MODE_KEY = 'siggy-vn-mode';

export function Header() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [vnMode, setVnMode] = useState(false);

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
        <div className="hidden md:flex justify-end">
          <button
            onClick={rightButton.onClick}
            className={`${rightButton.className} px-6 py-2 rounded-full font-bold text-sm hover:opacity-90 transition-all`}
          >
            {rightButton.text}
          </button>
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
                style={{ backgroundColor: pathname === '/chat' ? 'rgb(250, 204, 21)' : 'rgb(0, 255, 148)' }}
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
