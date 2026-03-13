'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Brain, Zap, Users, PartyPopper, Activity } from 'lucide-react';

interface KnowledgeNode {
  id: string;
  label: string;
  icon: React.ElementType;
  count: string;
  color: string;
  description: string;
  connections: string[];
  position: { x: number; y: number };
}

const nodes: KnowledgeNode[] = [
  {
    id: 'lore',
    label: 'Lore',
    icon: Brain,
    count: '10',
    color: 'from-purple-500 to-purple-700',
    description: 'Origin, Forms, Ritual Forge, Characters',
    connections: ['tech', 'community'],
    position: { x: 25, y: 30 }
  },
  {
    id: 'tech',
    label: 'Ritual Tech',
    icon: Zap,
    count: '35',
    color: 'from-yellow-500 to-amber-600',
    description: 'EVM++, Infernet, Architecture, Team',
    connections: ['lore', 'community', 'events'],
    position: { x: 75, y: 25 }
  },
  {
    id: 'community',
    label: 'Community',
    icon: Users,
    count: '36',
    color: 'from-emerald-500 to-teal-600',
    description: 'People, Roles, Programs, Partners',
    connections: ['lore', 'tech', 'events'],
    position: { x: 30, y: 70 }
  },
  {
    id: 'events',
    label: 'Events',
    icon: PartyPopper,
    count: '1,200+',
    color: 'from-pink-500 to-rose-600',
    description: 'Game Nights, Karaoke, Tournaments',
    connections: ['tech', 'community'],
    position: { x: 70, y: 75 }
  }
];

export function KnowledgeGraph() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeConnections, setActiveConnections] = useState<string[]>([]);

  useEffect(() => {
    if (hoveredNode) {
      const node = nodes.find(n => n.id === hoveredNode);
      setActiveConnections(node?.connections || []);
    } else {
      setActiveConnections([]);
    }
  }, [hoveredNode]);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Graph Container */}
      <div className="relative aspect-[4/3] md:aspect-[16/9] bg-black/40 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden">

        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {nodes.map((node) =>
            node.connections.map((connId) => {
              const connNode = nodes.find(n => n.id === connId);
              if (!connNode) return null;

              const isActive = hoveredNode && (hoveredNode === node.id || hoveredNode === connId);

              return (
                <motion.line
                  key={`${node.id}-${connId}`}
                  x1={`${node.position.x}%`}
                  y1={`${node.position.y}%`}
                  x2={`${connNode.position.x}%`}
                  y2={`${connNode.position.y}%`}
                  stroke={isActive ? 'url(#gradient)' : 'rgba(255,255,255,0.05)'}
                  strokeWidth={isActive ? 2 : 1}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: isActive ? 1 : 0.3,
                    opacity: isActive ? 1 : 0.3
                  }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
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

        {/* Knowledge Nodes */}
        {nodes.map((node, index) => {
          const Icon = node.icon;
          const isHovered = hoveredNode === node.id;
          const isConnected = activeConnections.includes(node.id);
          const shouldShow = !hoveredNode || isHovered || isConnected;

          return (
            <motion.div
              key={node.id}
              className="absolute"
              style={{
                left: `${node.position.x}%`,
                top: `${node.position.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: shouldShow ? 1 : 0.2,
                scale: isHovered ? 1.1 : isConnected ? 1.05 : 1
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
                    background: `linear-gradient(135deg, ${node.color.split(' ')[0].replace('from-', '')} 0%, ${node.color.split(' ')[1].replace('to-', '')} 100%)`
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
                <div className="relative p-4 md:p-6">
                  {/* Icon + Count */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`
                      p-2 rounded-lg bg-gradient-to-br ${node.color}
                    `}>
                      <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] md:text-xs font-mono text-text-secondary/60 uppercase tracking-wider">
                        {node.label}
                      </div>
                      <div className="text-xl md:text-2xl font-display font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
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
                      className="text-[10px] md:text-xs text-text-secondary/80 leading-relaxed"
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
                      className="flex items-center gap-1 mt-2 text-[8px] font-mono text-accent/60"
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

        {/* Center Stats - Only show when nothing hovered */}
        {!hoveredNode && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="text-5xl md:text-7xl font-display font-bold bg-gradient-to-br from-accent to-yellow-400 bg-clip-text text-transparent mb-2">
              1,281
            </div>
            <div className="text-[10px] md:text-xs font-mono text-text-secondary/60 uppercase tracking-widest">
              Total Knowledge Entries
            </div>
          </motion.div>
        )}
      </div>

      {/* Legend - Desktop */}
      <div className="hidden md:flex justify-center gap-6 mt-6 text-[10px] font-mono text-text-secondary/40">
        <span>Hover nodes to explore connections</span>
        <span>•</span>
        <span>Animated data flow between categories</span>
      </div>
    </div>
  );
}
