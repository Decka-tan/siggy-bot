'use client';

import { useState } from 'react';

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold backdrop-blur transition ${copied ? 'bg-emerald-400 text-black' : 'bg-white/20 text-white hover:bg-white/30'}`}
    >
      {copied ? '✓ Disalin' : 'Salin'}
    </button>
  );
}
