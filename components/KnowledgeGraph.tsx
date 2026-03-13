'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Brain, Zap, Users, PartyPopper, Activity } from 'lucide-react';
import { getKnowledgeCounts, formatCount, type KnowledgeCounts } from '@/lib/knowledge-counter';

interface KnowledgeNode {
  id: string;
  label: string;
  icon: React.ElementType;
  count: number;
  color: string;
  description: string;
  connections: string[];
}

const staticNodes: Omit<KnowledgeNode, 'count'>[] = [
  {
    id: 'lore',
    label: 'Lore',
    icon: Brain,
    color: 'from-purple-500 to-purple-700',
    description: 'Origin, Forms, Ritual Forge, Characters',
    connections: ['tech', 'community'],
  },
  {
    id: 'tech',
    label: 'Ritual Tech',
    icon: Zap,
    color: 'from-yellow-500 to-amber-600',
    description: 'EVM++, Infernet, Architecture, Team',
    connections: ['lore', 'community', 'events'],
  },
  {
    id: 'community',
    label: 'Community',
    icon: Users,
    color: 'from-emerald-500 to-teal-600',
    description: 'People, Roles, Programs, Partners',
    connections: ['lore', 'tech', 'events'],
  },
  {
    id: 'events',
    label: 'Events',
    icon: PartyPopper,
    color: 'from-pink-500 to-rose-600',
    description: 'Game Nights, Karaoke, Tournaments',
    connections: ['tech', 'community'],
  }
];

export function KnowledgeGraph() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeConnections, setActiveConnections] = useState<string[]>([]);
  const [counts, setCounts] = useState<KnowledgeCounts>({ lore: 10, tech: 35, community: 36, events: 1200, total: 1281 });

  // Load actual counts on mount
  useEffect(() => {
    const actualCounts = getKnowledgeCounts();
    setCounts(actualCounts);
  }, []);

  const nodes: KnowledgeNode[] = staticNodes.map(node => ({
    ...node,
    count: counts[node.id as keyof KnowledgeCounts] || 0
  }));

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* 2x2 Grid - Same for Mobile and Desktop */}
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        {nodes.map((node, index) => {
          const Icon = node.icon;
          const isHovered = hoveredNode === node.id;
          const isConnected = activeConnections.includes(node.id);
          const shouldDim = hoveredNode && !isHovered && !isConnected;

          return (
            <motion.div
              key={node.id}
              className={`
                relative bg-black/80 backdrop-blur-xl rounded-xl border-2 overflow-hidden
                ${isHovered ? 'border-white/20 shadow-2xl' : 'border-white/5'}
                ${shouldDim ? 'opacity-40' : 'opacity-100'}
              `}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onHoverStart={() => setHoveredNode(node.id)}
              onHoverEnd={() => setHoveredNode(null)}
            >
              {/* Gradient Background */}
              <div className={`
                absolute inset-0 opacity-10 transition-opacity duration-300
                bg-gradient-to-br ${node.color}
              `} />

              {/* Content */}
              <div className="relative p-4 md:p-6">
                {/* Icon + Count */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`
                    p-2.5 md:p-3 rounded-lg bg-gradient-to-br ${node.color}
                  `}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] md:text-xs font-mono text-text-secondary/60 uppercase tracking-wider">
                      {node.label}
                    </div>
                    <div className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                      {formatCount(node.count)}
                    </div>
                  </div>
                </div>

                {/* Description - Show on hover */}
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs md:text-sm text-text-secondary/80 leading-relaxed overflow-hidden"
                  >
                    {node.description}
                  </motion.div>
                )}

                {/* Connection Indicator */}
                {isHovered && node.connections.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5 mt-3 text-[9px] md:text-[10px] font-mono text-accent/60"
                  >
                    <Activity className="w-3 h-3" />
                    {node.connections.length} connection{node.connections.length > 1 ? 's' : ''}
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Center Stats */}
      {!hoveredNode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-8 py-6 bg-black/40 backdrop-blur-sm rounded-xl border border-white/5"
        >
          <div className="text-5xl md:text-6xl font-display font-bold bg-gradient-to-br from-accent to-yellow-400 bg-clip-text text-transparent">
            {formatCount(counts.total)}
          </div>
          <div className="text-[10px] md:text-xs font-mono text-text-secondary/60 uppercase tracking-widest mt-2">
            Total Knowledge Entries
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex justify-center gap-4 md:gap-6 mt-6 text-[9px] md:text-[10px] font-mono text-text-secondary/40">
        <span>Hover nodes to explore</span>
        <span>•</span>
        <span>See connections</span>
      </div>
    </div>
  );
}
