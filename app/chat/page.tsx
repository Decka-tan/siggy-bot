'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, RefreshCw, Send, BookOpen, Plus, MessageSquare, Trash2, X, Copy, ThumbsUp, ThumbsDown, Share2, ChevronLeft, ChevronRight, MessageSquareMore, Sparkles, MessageCircle } from 'lucide-react';

type MoodState = 'PLAYFUL' | 'MYSTERIOUS' | 'CHAOTIC' | 'PROFOUND';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mood?: MoodState;
  liked?: boolean;
  disliked?: boolean;
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
const SIDEBAR_KEY = 'siggy-sidebar-collapsed';
const VN_MODE_KEY = 'siggy-vn-mode';

// Local background for Visual Novel Mode
const VN_BACKGROUND_URL = '/vn-bg-1.png';

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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIDEBAR_KEY) === 'true';
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [contextInfo, setContextInfo] = useState<ContextInfo | null>(null);
  const [vnMode, setVnMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(VN_MODE_KEY) === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    if (typeof window !== 'undefined' && activeConversationId) {
      localStorage.setItem(ACTIVE_CONV_KEY, activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed.toString());
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VN_MODE_KEY, vnMode.toString());
    }
  }, [vnMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

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
    setShowMobileSidebar(false);
    setContextInfo(null);
  };

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

    fetch('/api/chat', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: `conv-${id}` }),
    }).catch(() => { });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

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

    setConversations(prev => prev.map(conv => {
      if (conv.id === targetConvId) {
        const updatedMessages = [...conv.messages, userMessage];
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationHistory,
          userId: `conv-${targetConvId}`,
          isFirstMessage: conversationHistory.length === 0,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      // Post-process response to add line breaks after actions
      let processedResponse = data.response;
      // Add line break after *actions* at the start or middle of text
      processedResponse = processedResponse.replace(/(\*[^*]+\*)\s*/g, '$1\n');
      // Remove extra whitespace after line breaks
      processedResponse = processedResponse.replace(/\n\s+/g, '\n');

      const siggyMessage: Message = {
        role: 'assistant',
        content: processedResponse,
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

    try {
      await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: `conv-${activeConversationId}` }),
      });
    } catch (error) {
      console.error('Failed to reset server context:', error);
    }

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        return { ...conv, messages: [], currentMood: 'PLAYFUL', messageCount: 0 };
      }
      return conv;
    }));

    setInput('');
    setContextInfo(null);
  };

  const parseMessageContent = (content: string) => {
    let html = content;

    // First, preserve paragraph breaks (double newlines)
    html = html.replace(/\n\n/g, '</p><p class="mt-2">');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>');

    // Italic (but not when part of ** already)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>');

    // Code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-bg px-1 py-0.5 rounded text-accent text-sm">$1</code>');
    html = html.replace(/\[code\](.*?)\[\/code\]/gi, '<code class="bg-bg px-1 py-0.5 rounded text-accent text-sm">$1</code>');

    // Quote
    html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-accent pl-3 italic text-text-secondary my-2">$1</blockquote>');
    html = html.replace(/\[quote\](.*?)\[\/quote\]/gi, '<blockquote class="border-l-2 border-accent pl-3 italic text-text-secondary my-2">$1</blockquote>');

    // Single line breaks (but not in code/quote)
    html = html.replace(/\n/g, '<br />');

    return '<p class="whitespace-pre-wrap">' + html + '</p>';
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const toggleLike = (messageIndex: number) => {
    if (!activeConversationId) return;
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        const messages = [...conv.messages];
        messages[messageIndex] = { ...messages[messageIndex], liked: !messages[messageIndex].liked, disliked: false };
        return { ...conv, messages };
      }
      return conv;
    }));
  };

  const toggleDislike = (messageIndex: number) => {
    if (!activeConversationId) return;
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        const messages = [...conv.messages];
        messages[messageIndex] = { ...messages[messageIndex], disliked: !messages[messageIndex].disliked, liked: false };
        return { ...conv, messages };
      }
      return conv;
    }));
  };

  const shareConversation = () => {
    if (!activeConversation) return;
    const shareText = activeConversation.messages.map(m => `${m.role === 'user' ? 'You' : 'Siggy'}: ${m.content}`).join('\n\n');
    if (navigator.share) {
      navigator.share({ title: `Chat with Siggy - ${activeConversation.title}`, text: shareText.slice(0, 500), url: window.location.href });
    } else {
      navigator.clipboard.writeText(shareText.slice(0, 500));
    }
  };

  const regenerateResponse = async () => {
    if (!activeConversationId || !activeConversation || activeConversation.messages.length < 2) return;

    const lastUserMessage = [...activeConversation.messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    const messagesWithoutLast = activeConversation.messages.slice(0, -1);
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        return { ...conv, messages: messagesWithoutLast };
      }
      return conv;
    }));

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: lastUserMessage.content,
          conversationHistory: messagesWithoutLast.slice(0, -1),
          userId: `conv-${activeConversationId}`,
          isFirstMessage: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to regenerate');

      const data = await response.json();

      // Post-process response to add line breaks after actions
      let processedResponse = data.response;
      processedResponse = processedResponse.replace(/(\*[^*]+\*)\s*/g, '$1\n');
      processedResponse = processedResponse.replace(/\n\s+/g, '\n');

      setConversations(prev => prev.map(conv => {
        if (conv.id === activeConversationId) {
          return {
            ...conv,
            messages: [...messagesWithoutLast, { role: 'assistant', content: processedResponse, mood: data.currentMood }],
            currentMood: data.currentMood,
            messageCount: data.messageCount,
          };
        }
        return conv;
      }));

      setContextInfo(data.contextInfo || null);
    } catch (error) {
      console.error('Regenerate failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-bg text-text-primary flex flex-col lg:flex-row pt-20 overflow-hidden relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/bg-night-sky.jpg)' }} />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex flex-col lg:flex-row">
      {/* Sidebar Area */}
      <div className={`hidden lg:flex flex-col bg-surface border-r border-border transition-all duration-300 relative ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Sidebar Header */}
        <div className="h-16 px-4 border-b border-border flex items-center shrink-0">
          {!sidebarCollapsed ? (
            <button onClick={createNewConversation} className="w-full flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg font-mono text-sm uppercase tracking-wider hover:opacity-90">
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          ) : (
            <button onClick={createNewConversation} className="w-full flex items-center justify-center p-2 bg-accent text-black rounded-lg hover:opacity-90">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
            <div key={conv.id} onClick={() => setActiveConversationId(conv.id)} className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeConversationId === conv.id ? 'bg-accent/20 text-accent' : 'hover:bg-surface text-text-secondary hover:text-text-primary'}`}>
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span className="flex-1 text-sm truncate">{conv.title}</span>}
              {!sidebarCollapsed && (
                <button onClick={(e) => deleteConversation(conv.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Collapse/Expand Button */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-accent text-black rounded-full flex items-center justify-center shadow-lg hover:opacity-90 z-20">
          {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {showMobileSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMobileSidebar(false)} className="fixed inset-0 bg-black/50 z-50 lg:hidden" />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed lg:hidden z-50 left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <button onClick={createNewConversation} className="flex-1 flex items-center gap-2 px-4 py-3 bg-accent text-black rounded-lg font-mono text-sm uppercase">
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
                <button onClick={() => setShowMobileSidebar(false)} className="ml-2 p-2"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.map(conv => (
                  <div key={conv.id} onClick={() => { setActiveConversationId(conv.id); setShowMobileSidebar(false); }} className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${activeConversationId === conv.id ? 'bg-accent/20 text-accent' : 'hover:bg-surface'}`}>
                    <MessageSquare className="w-4 h-4" />
                    <span className="flex-1 text-sm truncate">{conv.title}</span>
                    <button onClick={(e) => deleteConversation(conv.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400">
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between shrink-0 relative z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowMobileSidebar(!showMobileSidebar)} className="lg:hidden p-2 rounded hover:bg-surface">
              <MessageSquareMore className="w-5 h-5" />
            </button>
            <Link href="/">
              <button className="flex items-center gap-2 text-text-secondary hover:text-text-primary font-mono text-xs uppercase">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPersonality(personality === 'CAT' ? 'ANIME' : 'CAT')}
              className={`flex items-center gap-2 font-mono text-xs uppercase transition-colors bg-transparent hover:bg-transparent border-0 cursor-pointer ${personality === 'CAT'
                ? 'text-purple-400 hover:text-purple-300'
                : 'text-pink-400 hover:text-pink-300'
                }`}
            >
              {personality === 'CAT' ? (
                <><span className="text-base">🐱</span>Cat Mode</>
              ) : (
                <><span className="text-base">👧</span>Anime Mode</>
              )}
            </button>
            <button
              onClick={() => setVnMode(!vnMode)}
              className={`flex items-center gap-2 font-mono text-xs uppercase transition-colors bg-transparent hover:bg-transparent border-0 cursor-pointer ${vnMode
                ? 'text-accent hover:text-accent/80'
                : 'text-text-secondary hover:text-accent'
                }`}
            >
            {vnMode ? (
              <><MessageCircle className="w-4 h-4" />Chat Mode</>
            ) : (
              <><Sparkles className="w-4 h-4" />Visual Novel Mode</>
            )}
          </button>
        </div>

        {/* Chat Area - fills remaining height */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
          {/* VN Mode Background */}
          {vnMode && (
            <div className="absolute inset-0 z-0">
              <img
                src={VN_BACKGROUND_URL}
                alt="Visual Novel Background"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}

          {/* VN Mode Sprites */}
          {vnMode && (
            <>
              {/* Siggy Sprite - Centered */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-all duration-500"
                style={{ bottom: '300px' }}
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className={`${activeConversation?.messages[activeConversation.messages.length - 1]?.role === 'user' ? 'opacity-50 brightness-50 scale-95' : 'opacity-100 brightness-110 scale-100'} transition-all duration-500 origin-bottom`}
                >
                  <Image
                    src={personality === 'CAT' ? '/siggy-cat.png' : '/siggy-anime.png'}
                    alt="Siggy"
                    width={500}
                    height={700}
                    className="object-contain drop-shadow-[0_0_50px_rgba(139,92,246,0.5)]"
                    priority
                  />
                </motion.div>
              </motion.div>
            </>
          )}
                animate={{ opacity: 1, x: 0 }}
                className={`absolute right-0 md:right-10 z-10 pointer-events-none hidden lg:block transition-all duration-500`}
                style={{ bottom: '240px' }} // Adjusted to sit right on top of the taller dialogue box
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className={`${activeConversation?.messages[activeConversation.messages.length - 1]?.role !== 'user' ? 'opacity-50 brightness-50 scale-95' : 'opacity-100 brightness-110 scale-100'} transition-all duration-500 origin-bottom`}
                >
                  <Image
                    src="/siggy-sprite-1.png"
                    alt="User"
                    width={260}
                    height={380}
                    className="object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                    priority
                  />
                </motion.div>
              </motion.div>
            </>
          )}

          {/* Chat Content (with VN-aware styling) */}
          <div className={`flex-1 flex flex-col min-h-0 relative z-20 ${vnMode ? 'p-0' : 'px-6 pb-6'}`}>
            {vnMode ? (
              /* =========================================================
                 VN MODE LAYOUT
                 ========================================================= */
              <div className="absolute bottom-0 w-full flex flex-col z-20">
                {/* Name Tag (if there are messages) */}
                {activeConversation && activeConversation.messages.length > 0 && (
                  <div className="flex justify-start max-w-7xl mx-auto w-full px-8 relative z-30">
                    <div className="px-8 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-xl shadow-[0_-5px_15px_rgba(0,0,0,0.3)] border-b-0 border border-white/20">
                      <span className="font-sans tracking-wider text-white font-bold text-base md:text-xl drop-shadow-sm">
                        {activeConversation.messages[activeConversation.messages.length - 1].role === 'user'
                          ? 'YOU'
                          : 'SIGGY'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Main Dialogue Box (Full Width) */}
                <div className="w-full bg-black/40 backdrop-blur-xl border-t border-purple-500/30 px-4 py-8 md:px-16 md:py-10 shadow-[0_-10px_30px_rgba(139,92,246,0.3)]">
                  <div className="max-w-7xl mx-auto">
                    <div className="min-h-[140px] max-h-[140px] overflow-y-auto mb-4 pr-4 signature-scroll flex items-start">
                      {!activeConversation || activeConversation.messages.length === 0 ? (
                        <div className="text-center">
                          <h2 className="text-3xl font-display uppercase mb-2 bg-gradient-to-r from-purple-400 to-accent bg-clip-text text-transparent">
                            Welcome to Earth
                          </h2>
                          <p className="text-gray-200 text-lg">
                            I&apos;m Siggy! I used to be a cosmic cat across infinite dimensions, but I descended to Earth and became an anime girl to blend in. Say hello!
                          </p>
                        </div>
                      ) : (
                        <div className="relative">
                          {isLoading && activeConversation.messages[activeConversation.messages.length - 1].role === 'user' ? (
                            <div className="flex items-center gap-2 text-lg text-gray-400 italic font-mono">
                              *Siggy is thinking...*
                            </div>
                          ) : (
                            <div className="relative">
                              <p
                                className={`text-lg md:text-xl leading-relaxed font-sans ${activeConversation.messages[activeConversation.messages.length - 1].role === 'user'
                                  ? 'italic text-blue-200'
                                  : 'text-gray-100'
                                  }`}
                                dangerouslySetInnerHTML={{
                                  __html: parseMessageContent(activeConversation.messages[activeConversation.messages.length - 1].content)
                                }}
                              />
                              {/* Action buttons moved down below the chat scroll area */}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons & Input Area integrated into Dialogue Box */}
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center border-t border-white/10 pt-4 mt-2">
                      {/* Action Buttons (Left) */}
                      {activeConversation && activeConversation.messages.length > 0 && activeConversation.messages[activeConversation.messages.length - 1].role === 'assistant' && (
                        <div className="flex items-center gap-1 md:pr-4 md:border-r border-white/10">
                          <span className={`text-xs font-mono px-3 py-1.5 rounded-full mr-2 ${moodColors[activeConversation.messages[activeConversation.messages.length - 1].mood || 'PLAYFUL']}`}>
                            {activeConversation.messages[activeConversation.messages.length - 1].mood}
                          </span>
                          <button onClick={() => copyMessage(activeConversation.messages[activeConversation.messages.length - 1].content)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Copy">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleLike(activeConversation.messages.length - 1)} className={`p-2 rounded-lg ${activeConversation.messages[activeConversation.messages.length - 1].liked ? 'text-green-400' : 'text-gray-400 hover:text-white hover:bg-white/10'} transition-colors`} title="Like">
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleDislike(activeConversation.messages.length - 1)} className={`p-2 rounded-lg ${activeConversation.messages[activeConversation.messages.length - 1].disliked ? 'text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/10'} transition-colors`} title="Dislike">
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                          <button onClick={regenerateResponse} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Regenerate">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={shareConversation} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Share log">
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Input Form (Right) */}
                      <div className="flex-1 flex gap-3 w-full">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="What will you say?"
                          disabled={isLoading}
                          className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 text-base transition-all font-mono"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={isLoading || !input.trim()}
                          className="px-6 py-2.5 bg-gradient-to-r from-accent to-purple-500 text-black font-bold rounded-lg uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all flex items-center shadow-[0_0_15px_rgba(139,92,246,0.3)] text-sm"
                        >
                          {isLoading ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'SAY'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* =========================================================
                 STANDARD CHAT LAYOUT
                 ========================================================= */
              <div className="max-w-4xl mx-auto h-full flex flex-col min-h-0 w-full">
                {/* Messages - scrollable */}
                <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-0">
                  {!activeConversation || activeConversation.messages.length === 0 ? (
                    <div className={`text-center py-20 ${vnMode ? 'bg-black/50 dark:bg-black/60 backdrop-blur-md rounded-2xl p-8' : ''}`}>
                      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="text-8xl mb-6">
                        👧✨
                      </motion.div>
                      <h2 className={`text-4xl md:text-6xl font-display tracking-wide uppercase mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-accent bg-clip-text text-transparent`}>
                        Welcome to Earth
                      </h2>
                      <p className={`text-lg max-w-xl mx-auto ${vnMode ? 'text-gray-200' : 'text-text-secondary'}`}>
                        I&apos;m Siggy! I used to be a cosmic cat across infinite dimensions, but I descended to Earth and became an anime girl to blend in. Pretty clever, right? Anyway, nice to meet you!
                      </p>
                    </div>
                  ) : (
                    activeConversation.messages.map((message, index) => (
                      <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-6 py-4 border ${vnMode
                          ? message.role === 'user'
                            ? 'bg-blue-950/80 dark:bg-blue-950/80 border-blue-500/30 backdrop-blur-md'
                            : 'bg-purple-950/80 dark:bg-purple-950/80 border-purple-500/30 backdrop-blur-md'
                          : 'bg-surface border-border'
                          }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-mono font-semibold ${vnMode ? 'text-white' : 'text-text-primary'}`}>{message.role === 'user' ? 'YOU' : 'SIGGY'}</span>
                            {message.mood && <span className={`text-xs font-mono px-2 py-1 rounded-full ${moodColors[message.mood]}`}>{message.mood}</span>}
                          </div>
                          <p className={`text-sm whitespace-pre-wrap leading-relaxed ${vnMode ? 'text-gray-100' : 'text-text-primary'}`} dangerouslySetInnerHTML={{ __html: parseMessageContent(message.content) }} />

                          {message.role === 'assistant' && (
                            <div className={`flex items-center gap-1 mt-3 pt-3 border-t ${vnMode ? 'border-white/10' : 'border-border'}`}>
                              <button onClick={() => copyMessage(message.content)} className={`p-1.5 rounded ${vnMode ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-surface text-text-secondary hover:text-text-primary'}`} title="Copy">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => toggleLike(index)} className={`p-1.5 rounded ${message.liked ? 'text-green-400' : vnMode ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`} title="Like">
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => toggleDislike(index)} className={`p-1.5 rounded ${message.disliked ? 'text-red-400' : vnMode ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`} title="Dislike">
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={shareConversation} className={`p-1.5 rounded ${vnMode ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-surface text-text-secondary hover:text-text-primary'}`} title="Share">
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              {index === activeConversation.messages.length - 1 && (
                                <button onClick={regenerateResponse} className={`p-1.5 rounded ${vnMode ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-surface text-text-secondary hover:text-text-primary'}`} title="Regenerate">
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-surface border border-border rounded-2xl px-6 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono font-semibold">SIGGY</span>
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

                {/* Controls - fixed at bottom */}
                <div className="shrink-0 space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="font-mono text-xs text-text-secondary">
                      Mood: <span className={`ml-2 px-2 py-1 rounded-full ${activeConversation ? moodColors[activeConversation.currentMood] : moodColors.PLAYFUL}`}>{activeConversation?.currentMood || 'PLAYFUL'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-text-secondary">Messages: {activeConversation?.messageCount || 0}</span>
                      {contextInfo && <span className={`font-mono text-xs ${contextInfo.estimatedTokens > 80000 ? 'text-red-400' : contextInfo.estimatedTokens > 50000 ? 'text-amber-400' : 'text-text-secondary'}`}>{contextInfo.hasSummary ? '📝' : '💾'} {Math.round(contextInfo.estimatedTokens / 1000)}k</span>}
                      <button onClick={resetCurrentConversation} className="p-2 rounded hover:bg-surface">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="flex gap-3">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Type your message..." disabled={isLoading} className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 font-mono text-sm bg-surface border-border text-text-primary placeholder:text-text-secondary" />
                    <button onClick={handleSendMessage} disabled={isLoading || !input.trim()} className="px-6 py-3 bg-gradient-to-r from-accent to-emerald-400 text-black hover:from-emerald-400 hover:to-accent disabled:bg-border disabled:text-text-secondary rounded-lg font-mono text-sm uppercase transition-all disabled:opacity-50 flex items-center gap-2">
                      {isLoading ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" />Send</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
