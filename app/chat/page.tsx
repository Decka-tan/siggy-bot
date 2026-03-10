'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Send, BookOpen, Plus, MessageSquare, Trash2, X } from 'lucide-react';

type MoodState = 'PLAYFUL' | 'MYSTERIOUS' | 'CHAOTIC' | 'PROFOUND';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mood?: MoodState;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  currentMood: MoodState;
  messageCount: number;
  timestamp: number;
}

interface ContextInfo {
  totalMessages: number;
  estimatedTokens: number;
  hasSummary: boolean;
}

const moodColors: Record<MoodState, string> = {
  PLAYFUL: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
  MYSTERIOUS: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
  CHAOTIC: 'bg-red-500/20 border-red-500/30 text-red-400',
  PROFOUND: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
};

const CONVERSATIONS_KEY = 'siggy-conversations';
const ACTIVE_CONV_KEY = 'siggy-active-conversation';

// Generate conversation title from first message
const generateTitle = (firstMessage: string): string => {
  const truncated = firstMessage.slice(0, 30);
  return truncated + (firstMessage.length > 30 ? '...' : '');
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(CONVERSATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACTIVE_CONV_KEY);
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [contextInfo, setContextInfo] = useState<ContextInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get active conversation
  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  // Save conversations to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  // Save active conversation ID
  useEffect(() => {
    if (typeof window !== 'undefined' && activeConversationId) {
      localStorage.setItem(ACTIVE_CONV_KEY, activeConversationId);
    }
  }, [activeConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  // Create new conversation
  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      currentMood: 'PLAYFUL',
      messageCount: 0,
      timestamp: Date.now(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setShowSidebar(false);
    setContextInfo(null);
  };

  // Delete conversation
  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newConversations = conversations.filter(c => c.id !== id);
    setConversations(newConversations);

    if (activeConversationId === id) {
      if (newConversations.length > 0) {
        setActiveConversationId(newConversations[0].id);
      } else {
        setActiveConversationId(null);
      }
    }

    // Reset server context for this conversation
    fetch('/api/chat', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: `conv-${id}` }),
    }).catch(() => {});
  };

  // Update active conversation
  const updateActiveConversation = (updates: Partial<Conversation>) => {
    if (!activeConversationId) return;

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        return { ...conv, ...updates, timestamp: Date.now() };
      }
      return conv;
    }));
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Create new conversation if none active
    let targetConvId = activeConversationId;
    if (!targetConvId) {
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: generateTitle(input),
        messages: [],
        currentMood: 'PLAYFUL',
        messageCount: 0,
        timestamp: Date.now(),
      };
      setConversations(prev => [newConv, ...prev]);
      targetConvId = newConv.id;
      setActiveConversationId(newConv.id);
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    // Update messages in conversation
    setConversations(prev => prev.map(conv => {
      if (conv.id === targetConvId) {
        const updatedMessages = [...conv.messages, userMessage];
        // Update title if first message
        const title = conv.messages.length === 0 ? generateTitle(input) : conv.title;
        return { ...conv, messages: updatedMessages, title };
      }
      return conv;
    }));

    const currentConv = conversations.find(c => c.id === targetConvId);
    const conversationHistory = currentConv?.messages || [];

    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversationHistory,
          userId: `conv-${targetConvId}`,
          isFirstMessage: conversationHistory.length === 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const siggyMessage: Message = {
        role: 'assistant',
        content: data.response,
        mood: data.currentMood,
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id === targetConvId) {
          return {
            ...conv,
            messages: [...conv.messages, siggyMessage],
            currentMood: data.currentMood,
            messageCount: data.messageCount,
          };
        }
        return conv;
      }));

      setContextInfo(data.contextInfo || null);
    } catch (error) {
      console.error('Error sending message:', error);

      setConversations(prev => prev.map(conv => {
        if (conv.id === targetConvId) {
          return {
            ...conv,
            messages: [
              ...conv.messages,
              {
                role: 'assistant',
                content: '*dimensional glitch* ERROR: The void rejects your message. Please check your connection and try again.',
                mood: 'CHAOTIC',
              },
            ],
          };
        }
        return conv;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetCurrentConversation = async () => {
    if (!activeConversationId) {
      createNewConversation();
      return;
    }

    // Reset server-side context
    try {
      await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: `conv-${activeConversationId}` }),
      });
    } catch (error) {
      console.error('Failed to reset server context:', error);
    }

    // Clear messages but keep conversation
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          messages: [],
          currentMood: 'PLAYFUL',
          messageCount: 0,
        };
      }
      return conv;
    }));

    setInput('');
    setContextInfo(null);
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary flex">
      {/* Sidebar - Always visible on desktop */}
      <div className="hidden lg:flex w-64 flex-col bg-surface border-r border-border">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-2 px-4 py-3 bg-accent text-black rounded-lg font-mono text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setActiveConversationId(conv.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                activeConversationId === conv.id
                  ? 'bg-accent/20 text-accent'
                  : 'hover:bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-sm truncate">{conv.title}</span>
              <button
                onClick={(e) => deleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="text-center py-8 text-text-secondary text-sm">
              No chats yet.<br />Start a new one!
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed lg:hidden z-50 left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <button
                  onClick={createNewConversation}
                  className="flex-1 flex items-center gap-2 px-4 py-3 bg-accent text-black rounded-lg font-mono text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
                <button onClick={() => setShowSidebar(false)} className="ml-2 p-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setShowSidebar(false);
                    }}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      activeConversationId === conv.id
                        ? 'bg-accent/20 text-accent'
                        : 'hover:bg-surface text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-sm truncate">{conv.title}</span>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col pt-24">
        {/* Header */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden p-2 rounded hover:bg-surface transition-colors text-text-secondary"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <Link href="/">
                <button className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors font-mono text-xs uppercase tracking-wider">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </Link>
            </div>
            <Link href="/story">
              <button className="flex items-center gap-2 text-text-secondary hover:text-accent transition-colors font-mono text-xs uppercase tracking-wider">
                <BookOpen className="w-4 h-4" />
                Story Mode
              </button>
            </Link>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 overflow-hidden px-6 pb-8">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto mb-6 space-y-4">
              {!activeConversation || activeConversation.messages.length === 0 ? (
                <div className="text-center py-20">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-8xl mb-6"
                  >
                    👧✨
                  </motion.div>
                  <h2 className="text-4xl md:text-6xl font-display tracking-wide uppercase mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-accent bg-clip-text text-transparent">
                    Welcome to Earth
                  </h2>
                  <p className="text-text-secondary text-lg max-w-xl mx-auto">
                    I&apos;m Siggy! I used to be a cosmic cat across infinite dimensions, but I descended to Earth
                    and became an anime girl to blend in. Pretty clever, right? Anyway, nice to meet you!
                  </p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-center gap-4 mt-8"
                  >
                    <span className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-xs font-mono uppercase">
                      😸 PLAYFUL
                    </span>
                    <span className="text-text-secondary text-xs">•</span>
                    <span className="text-xs text-text-secondary">Just chat with me!</span>
                  </motion.div>
                </div>
              ) : (
                activeConversation.messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[85%] rounded-2xl px-6 py-4 bg-surface border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono font-semibold text-text-primary">
                          {message.role === 'user' ? 'YOU' : 'SIGGY'}
                        </span>
                        {message.mood && (
                          <motion.span
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className={`text-xs font-mono px-2 py-1 rounded-full ${moodColors[message.mood]}`}
                          >
                            {message.mood}
                          </motion.span>
                        )}
                      </div>
                      <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-border rounded-2xl px-6 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-semibold text-text-primary">SIGGY</span>
                      <span className="text-xs text-text-secondary">*tapping on phone*</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
              <div className="font-mono text-xs text-text-secondary">
                Mood: <span className={`ml-2 px-2 py-1 rounded-full ${activeConversation ? moodColors[activeConversation.currentMood] : moodColors.PLAYFUL}`}>
                  {activeConversation?.currentMood || 'PLAYFUL'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-text-secondary">
                  Messages: {activeConversation?.messageCount || 0}
                </span>
                {contextInfo && (
                  <span
                    className={`font-mono text-xs ${
                      contextInfo.estimatedTokens > 80000
                        ? 'text-red-400'
                        : contextInfo.estimatedTokens > 50000
                        ? 'text-amber-400'
                        : 'text-text-secondary'
                    }`}
                    title={`Estimated: ${contextInfo.estimatedTokens.toLocaleString()} tokens`}
                  >
                    {contextInfo.hasSummary ? '📝' : '💾'} {Math.round(contextInfo.estimatedTokens / 1000)}k tokens
                  </span>
                )}
                <button
                  onClick={resetCurrentConversation}
                  className="p-2 rounded hover:bg-surface transition-colors text-text-secondary hover:text-text-primary"
                  title="Reset conversation"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Input Area */}
            <div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 font-mono text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-accent to-emerald-400 text-black hover:from-emerald-400 hover:to-accent disabled:bg-border disabled:text-text-secondary rounded-lg font-mono text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar Toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 px-2 py-4 bg-surface border border-border rounded-r-lg hover:bg-accent/20 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
      </button>
    </div>
  );
}
