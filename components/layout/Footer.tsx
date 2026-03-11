'use client';

import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  
  // Hide footer on full-screen VN routes and Chat routes
  if (pathname === '/story' || pathname === '/chat') return null;

    <footer className="py-8 text-center border-t border-border font-mono text-xs text-text-secondary uppercase tracking-widest">
      <div>© 2026 Siggy Bot</div>
      <div className="mt-2 text-[10px] text-text-secondary/60 flex flex-col items-center gap-1">
        <span>Built by Decka-tan</span>
        <span>Built with Next.js and Vercel</span>
      </div>
    </footer>
}
