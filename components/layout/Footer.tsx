'use client';

import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  
  // Hide footer on full-screen VN routes and Chat routes
  if (pathname === '/story' || pathname === '/chat') return null;

  return (
    <footer className="py-8 text-center border-t border-border font-mono text-xs text-text-secondary uppercase tracking-widest">
      <div>© 2026 Siggy Bot</div>
      <div className="mt-2">Built by Decka-tan</div>
    </footer>
  );
}
