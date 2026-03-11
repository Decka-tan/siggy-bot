'use client';

import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  
  // Hide footer on full-screen VN routes and Chat routes
  if (pathname === '/story' || pathname === '/chat') return null;

  return (
    <footer className="py-12 text-center border-t border-border font-mono text-xs text-text-secondary tracking-[0.2em] uppercase">
      <div className="max-w-7xl mx-auto px-8">
        <div className="mb-4">© 2026 Siggy Bot — All Rights Reserved</div>
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-[10px] opacity-60">
          <span>Built with Next.js, TypeScript and Vercel</span>
          <span className="hidden md:inline">•</span>
          <span>Powered by OpenAI & Ritual Forge</span>
        </div>
        <div className="mt-4 text-[9px] opacity-40">
          Crafted by Decka-tan
        </div>
      </div>
    </footer>
  );
}
