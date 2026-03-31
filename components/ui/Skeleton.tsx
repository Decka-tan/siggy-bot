'use client';

import { motion } from 'framer-motion';

export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={`bg-gradient-to-r from-surface via-white/10 to-surface bg-[length:200%_100%] rounded ${className}`}
      animate={{
        backgroundPosition: ['0% 0%', '200% 0%'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Avatar skeleton */}
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2 max-w-[80%]">
        {/* Header skeleton */}
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        {/* Content skeleton */}
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-5/6 rounded" />
        <Skeleton className="h-3 w-4/6 rounded" />
        {/* Buttons skeleton */}
        <div className="flex gap-1 mt-2 pt-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="p-3 space-y-2 animate-in fade-in duration-300">
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-3 w-2/3 rounded" />
    </div>
  );
}

export function InputSkeleton() {
  return (
    <div className="flex gap-2 items-center">
      <Skeleton className="h-11 w-11 rounded-lg" />
      <Skeleton className="h-11 flex-1 rounded-lg" />
      <Skeleton className="h-11 w-20 rounded-lg" />
    </div>
  );
}
