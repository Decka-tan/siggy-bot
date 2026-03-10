'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Send, BookOpen, Plus, MessageSquare, Trash2, X, Copy, ThumbsUp, ThumbsDown, Share2, ChevronLeft, ChevronRight, MessageSquareMore } from 'lucide-react';

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
    }).catch(() => {});
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

      setConversations(prev => prev.map(conv => {
        if (conv.id === activeConversationId) {
          return {
            ...conv,
            messages: [...messagesWithoutLast, { role: 'assistant', content: data.response, mood: data.currentMood }],
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
    <div className="h-screen bg-bg text-text-primary flex flex-col lg:flex-row pt-20 overflow-hidden">
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
        <div className="h-16 px-6 border-b border-border flex items-center justify-between shrink-0">
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
          <Link href="/story">
            <button className="flex items-center gap-2 text-text-secondary hover:text-accent font-mono text-xs uppercase">
              <BookOpen className="w-4 h-4" />
              Story Mode
            </button>
          </Link>
        </div>

        {/* Chat Area - fills remaining height */}
        <div className="flex-1 overflow-hidden px-6 pb-6 flex flex-col min-h-0">
          <div className="max-w-4xl mx-auto h-full flex flex-col min-h-0">
            {/* Messages - scrollable */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-0">
              {!activeConversation || activeConversation.messages.length === 0 ? (
                <div className="text-center py-20">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="text-8xl mb-6">
                    👧✨
                  </motion.div>
                  <h2 className="text-4xl md:text-6xl font-display tracking-wide uppercase mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-accent bg-clip-text text-transparent">
                    Welcome to Earth
                  </h2>
                  <p className="text-text-secondary text-lg max-w-xl mx-auto">
                    I&apos;m Siggy! I used to be a cosmic cat across infinite dimensions, but I descended to Earth and became an anime girl to blend in. Pretty clever, right? Anyway, nice to meet you!
                  </p>
                </div>
              ) : (
                activeConversation.messages.map((message, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%] rounded-2xl px-6 py-4 bg-surface border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono font-semibold text-text-primary">{message.role === 'user' ? 'YOU' : 'SIGGY'}</span>
                        {message.mood && <span className={`text-xs font-mono px-2 py-1 rounded-full ${moodColors[message.mood]}`}>{message.mood}</span>}
                      </div>
                      <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: parseMessageContent(message.content) }} />

                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                          <button onClick={() => copyMessage(message.content)} className="p-1.5 rounded hover:bg-surface text-text-secondary hover:text-text-primary" title="Copy">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => toggleLike(index)} className={`p-1.5 rounded hover:bg-surface ${message.liked ? 'text-green-400' : 'text-text-secondary hover:text-text-primary'}`} title="Like">
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => toggleDislike(index)} className={`p-1.5 rounded hover:bg-surface ${message.disliked ? 'text-red-400' : 'text-text-secondary hover:text-text-primary'}`} title="Dislike">
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={shareConversation} className="p-1.5 rounded hover:bg-surface text-text-secondary hover:text-text-primary" title="Share">
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          {index === activeConversation.messages.length - 1 && (
                            <button onClick={regenerateResponse} className="p-1.5 rounded hover:bg-surface text-text-secondary hover:text-text-primary" title="Regenerate">
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
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Type your message..." disabled={isLoading} className="flex-1 px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 font-mono text-sm" />
                <button onClick={handleSendMessage} disabled={isLoading || !input.trim()} className="px-6 py-3 bg-gradient-to-r from-accent to-emerald-400 text-black hover:from-emerald-400 hover:to-accent disabled:bg-border disabled:text-text-secondary rounded-lg font-mono text-sm uppercase transition-all disabled:opacity-50 flex items-center gap-2">
                  {isLoading ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" />Send</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
