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

  useEffect(() => {
    if (hoveredNode) {
      const node = nodes.find(n => n.id === hoveredNode);
      setActiveConnections(node?.connections || []);
    } else {
      setActiveConnections([]);
    }
  }, [hoveredNode]);

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Mobile: Grid Layout */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-3">
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
                  ${isHovered ? 'border-white/20' : 'border-white/5'}
                  ${shouldDim ? 'opacity-40' : 'opacity-100'}
                `}
                initial={{ opacity: 0, scale: 0.9 }}
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
                <div className="relative p-4">
                  {/* Icon + Count */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`
                      p-2 rounded-lg bg-gradient-to-br ${node.color}
                    `}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[8px] font-mono text-text-secondary/60 uppercase tracking-wider">
                        {node.label}
                      </div>
                      <div className="text-lg font-display font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
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
                      className="text-[9px] text-text-secondary/80 leading-relaxed overflow-hidden"
                    >
                      {node.description}
                    </motion.div>
                  )}

                  {/* Connection Indicator */}
                  {isHovered && node.connections.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1 mt-2 text-[7px] font-mono text-accent/60"
                    >
                      <Activity className="w-2.5 h-2.5" />
                      {node.connections.length} connection{node.connections.length > 1 ? 's' : ''}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Center Stats - Mobile */}
        {!hoveredNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center mt-6 py-4 bg-black/40 backdrop-blur-sm rounded-xl border border-white/5"
          >
            <div className="text-4xl font-display font-bold bg-gradient-to-br from-accent to-yellow-400 bg-clip-text text-transparent">
              {formatCount(counts.total)}
            </div>
            <div className="text-[9px] font-mono text-text-secondary/60 uppercase tracking-widest mt-1">
              Total Knowledge Entries
            </div>
          </motion.div>
        )}
      </div>

      {/* Desktop: Diamond Layout */}
      <div className="hidden md:block">
        <div className="relative aspect-[16/10] bg-black/40 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden p-8">
          {/* Animated Background Grid */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} />
          </div>

          {/* Connection Lines - SVG overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {nodes.map((node) =>
              node.connections.map((connId) => {
                const connNode = nodes.find(n => n.id === connId);
                if (!connNode) return null;

                // Diamond positions: top, right, bottom, left (SYMMETRICAL + PADDING)
                const positions: Record<string, { x: number; y: number }> = {
                  lore: { x: 50, y: 18 },
                  tech: { x: 72, y: 50 },
                  community: { x: 50, y: 82 },
                  events: { x: 28, y: 50 }
                };

                const nodePos = positions[node.id];
                const connPos = positions[connId];
                const isActive = hoveredNode && (hoveredNode === node.id || hoveredNode === connId);

                return (
                  <motion.line
                    key={`${node.id}-${connId}`}
                    x1={`${nodePos.x}%`}
                    y1={`${nodePos.y}%`}
                    x2={`${connPos.x}%`}
                    y2={`${connPos.y}%`}
                    stroke={isActive ? 'url(#gradient)' : 'rgba(255,255,255,0.05)'}
                    strokeWidth={isActive ? 2 : 1}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                      pathLength: isActive ? 1 : 0.5,
                      opacity: isActive ? 1 : 0.3
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    strokeDasharray={isActive ? "10, 5" : undefined}
                  >
                    {isActive && (
                      <animate
                        attributeName="stroke-dashoffset"
                        from="100"
                        to="0"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    )}
                  </motion.line>
                );
              })
            )}

            {/* Gradient Definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FFA500" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Knowledge Nodes - Desktop */}
          {nodes.map((node, index) => {
            const Icon = node.icon;
            const isHovered = hoveredNode === node.id;
            const isConnected = activeConnections.includes(node.id);
            const shouldShow = !hoveredNode || isHovered || isConnected;

            // Diamond positions (SYMMETRICAL)
            const positions: Record<string, { x: number; y: number }> = {
              lore: { x: 50, y: 12 },
              tech: { x: 88, y: 50 },
              community: { x: 50, y: 88 },
              events: { x: 12, y: 50 }
            };

            const pos = positions[node.id];

            return (
              <motion.div
                key={node.id}
                className="absolute"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: shouldShow ? 1 : 0.2,
                  scale: isHovered ? 1.05 : 1
                }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
                onHoverStart={() => setHoveredNode(node.id)}
                onHoverEnd={() => setHoveredNode(null)}
              >
                {/* Glow Effect */}
                {isHovered && (
                  <motion.div
                    className="absolute inset-0 -z-10 blur-3xl rounded-full opacity-50"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.5, scale: 1.5 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))`
                    }}
                  />
                )}

                {/* Node Card */}
                <div className={`
                  relative bg-black/80 backdrop-blur-xl rounded-xl border-2 transition-all duration-300
                  ${isHovered ? 'border-white/20 shadow-2xl' : 'border-white/5'}
                `}>
                  {/* Gradient Border */}
                  <div className={`
                    absolute inset-0 rounded-xl opacity-20 transition-opacity duration-300
                    bg-gradient-to-br ${node.color}
                  `} />

                  {/* Content */}
                  <div className="relative p-5">
                    {/* Icon + Count */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`
                        p-2.5 rounded-lg bg-gradient-to-br ${node.color}
                      `}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-text-secondary/60 uppercase tracking-wider">
                          {node.label}
                        </div>
                        <div className="text-2xl font-display font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                          {node.count}
                        </div>
                      </div>
                    </div>

                    {/* Description - Show on hover */}
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs text-text-secondary/80 leading-relaxed"
                      >
                        {node.description}
                      </motion.div>
                    )}

                    {/* Connection Indicator */}
                    {isHovered && node.connections.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        className="flex items-center gap-1 mt-2 text-[9px] font-mono text-accent/60"
                      >
                        <Activity className="w-3 h-3" />
                        {node.connections.length} connection{node.connections.length > 1 ? 's' : ''}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Center Stats - Desktop */}
          {!hoveredNode && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="text-6xl font-display font-bold bg-gradient-to-br from-accent to-yellow-400 bg-clip-text text-transparent mb-2">
                {formatCount(counts.total)}
              </div>
              <div className="text-xs font-mono text-text-secondary/60 uppercase tracking-widest">
                Total Knowledge Entries
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-6 text-[10px] font-mono text-text-secondary/40">
        <span>Hover nodes to explore</span>
        <span>•</span>
        <span>Animated connections</span>
      </div>
    </div>
  );
}
