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
      className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${copied ? 'bg-emerald-500/20 text-emerald-300' : 'bg-accent/15 text-accent hover:bg-accent/25'}`}
    >
      {copied ? 'Disalin' : 'Salin'}
    </button>
  );
}
