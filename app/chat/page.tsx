'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, RefreshCw, Send, BookOpen, Plus, MessageSquare, Trash2, X, Copy, ThumbsUp, ThumbsDown, Share2, ChevronLeft, ChevronRight, MessageSquareMore, Sparkles, MessageCircle, User, Upload } from 'lucide-react';

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
const USER_AVATAR_KEY = 'siggy-user-avatar';

// VN Mode backgrounds (rotate every 10s)
const VN_BACKGROUNDS = [
  '/vn-bg/1.jpg',
  '/vn-bg/2.jpg',
  '/vn-bg/3.jpg',
  '/vn-bg/4.jpg',
];

const parseMessageContent = (content: string) => {
  let html = content;

  // First, preserve paragraph breaks (double newlines)
  html = html.replace(/\n\n/g, '</p><p class="mt-2">');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>');

  // Italic (but not when part of ** already) - muted color for actions
  html = html.replace(/\*([^*]+)\*/g, '<em class="text-text-secondary not-italic">$1</em>');
  html = html.replace(/\[i\](.*?)\[\/i\]/gi, '<em class="text-text-secondary not-italic">$1</em>');

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

// Typewriter Text Component
const TypewriterText = ({ text, isLatest }: { text: string; isLatest: boolean }) => {
  const [displayedText, setDisplayedText] = useState(isLatest ? '' : text);

  useEffect(() => {
    if (!isLatest) {
      setDisplayedText(text);
      return;
    }

    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 20); // 20ms per char for anime VN feel

    return () => clearInterval(interval);
  }, [text, isLatest]);

  return <p className="text-sm md:text-base leading-relaxed font-mono whitespace-pre-wrap text-text-primary" dangerouslySetInnerHTML={{ __html: parseMessageContent(displayedText) }} />;
};

// Decorative floating bubbles for VN mode
const VN_BUBBLES = [
  { text: 'The sky is cool, right?', top: '12%', left: '8%', size: 90, delay: 0 },
  { text: 'siggy look!', top: '25%', left: '78%', size: 80, delay: 2 },
  { text: 'meow~', top: '45%', left: '5%', size: 60, delay: 4 },
  { text: 'so dark...', top: '15%', left: '55%', size: 50, delay: 1 },
  { text: 'so pretty...', top: '55%', left: '85%', size: 75, delay: 3 },
  { text: 'i am infinite.', top: '35%', left: '30%', size: 45, delay: 5 },
  { text: 'I can see everything~', top: '8%', left: '38%', size: 85, delay: 6 },
];

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
  const [userAvatar, setUserAvatar] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(USER_AVATAR_KEY);
  });
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vnMode, setVnMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(VN_MODE_KEY) === 'true';
  });
  const [personality, setPersonality] = useState<'CAT' | 'ANIME'>('ANIME');
  const [vnBgIndex, setVnBgIndex] = useState(0);
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (userAvatar) {
        localStorage.setItem(USER_AVATAR_KEY, userAvatar);
      } else {
        localStorage.removeItem(USER_AVATAR_KEY);
      }
    }
  }, [userAvatar]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File is too large. Please upload an image under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserAvatar(reader.result as string);
        setShowAvatarModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  // Rotate VN backgrounds every 10s
  useEffect(() => {
    if (!vnMode) return;
    const interval = setInterval(() => {
      setVnBgIndex(prev => (prev + 1) % VN_BACKGROUNDS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [vnMode]);

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

  const handleSendMessage = async (overrideInput?: string) => {
    const textToSend = typeof overrideInput === 'string' ? overrideInput : input;
    if (!textToSend.trim() || isLoading) return;

    let targetConvId = activeConversationId;
    if (!targetConvId) {
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: generateTitle(textToSend),
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
      content: textToSend,
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === targetConvId) {
        const updatedMessages = [...conv.messages, userMessage];
        const title = conv.messages.length === 0 ? generateTitle(textToSend) : conv.title;
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
          message: textToSend,
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

  // Removed duplicate parseMessageContent from here

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

  const handleTransform = async (newForm: 'CAT' | 'ANIME') => {
    setPersonality(newForm);
    const transformMsg = newForm === 'CAT'
      ? '*snaps fingers* Siggy, turn into a cat!'
      : '*snaps fingers* Siggy, turn into an anime girl!';

    // Auto-send the transform message
    setInput(transformMsg);
    setTimeout(() => {
      const fakeEvent = { key: 'Enter', shiftKey: false, preventDefault: () => { } } as React.KeyboardEvent;
      // We'll just set input and trigger send
    }, 0);

    let targetConvId = activeConversationId;
    if (!targetConvId) {
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: generateTitle(transformMsg),
        messages: [],
        currentMood: 'PLAYFUL',
        messageCount: 0,
        timestamp: Date.now(),
      };
      setConversations(prev => [newConv, ...prev]);
      targetConvId = newConv.id;
      setActiveConversationId(newConv.id);
    }

    const userMessage: Message = { role: 'user', content: transformMsg };
    setConversations(prev => prev.map(conv => {
      if (conv.id === targetConvId) {
        const updatedMessages = [...conv.messages, userMessage];
        const title = conv.messages.length === 0 ? generateTitle(transformMsg) : conv.title;
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
          message: transformMsg,
          conversationHistory,
          userId: `conv-${targetConvId}`,
          isFirstMessage: conversationHistory.length === 0,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      let processedResponse = data.response;
      processedResponse = processedResponse.replace(/(\*[^*]+\*)\s*/g, '$1\n');
      processedResponse = processedResponse.replace(/\n\s+/g, '\n');

      const siggyMessage: Message = { role: 'assistant', content: processedResponse, mood: data.currentMood };
      setConversations(prev => prev.map(conv => {
        if (conv.id === targetConvId) {
          return { ...conv, messages: [...conv.messages, siggyMessage], currentMood: data.currentMood, messageCount: data.messageCount };
        }
        return conv;
      }));
      setContextInfo(data.contextInfo || null);
    } catch (error) {
      console.error('Transform failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-text-primary flex flex-col lg:flex-row relative" style={{ backgroundImage: "url('/bg-night-sky.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="pt-20 w-full">
      {vnMode && (
        <style dangerouslySetInnerHTML={{ __html: `footer { display: none !important; }` }} />
      )}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar Area */}
        {!vnMode && (
          <div className={`hidden lg:flex flex-col bg-surface border-r border-border transition-all duration-300 relative z-10 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          {/* Sidebar Header */}
          <div className="h-16 px-4 border-b border-border flex items-center shrink-0 gap-2">
            {!sidebarCollapsed ? (
              <button onClick={createNewConversation} className="flex-1 flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg font-mono text-sm uppercase tracking-wider hover:opacity-90">
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            ) : (
              <button onClick={createNewConversation} className="flex-1 flex items-center justify-center p-2 bg-accent text-black rounded-lg hover:opacity-90">
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setShowAvatarModal(true)} className={`${sidebarCollapsed ? 'hidden' : 'flex'} p-2 bg-surface border border-border text-text-secondary hover:text-accent rounded-lg transition-colors shrink-0`} title="Set Avatar">
              <User className="w-4 h-4" />
            </button>
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
        )}

        {/* Mobile Sidebar */}
        {!vnMode && (
          <AnimatePresence>
          {showMobileSidebar && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMobileSidebar(false)} className="fixed inset-0 bg-black/50 z-50 lg:hidden" />
              <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed lg:hidden z-50 left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between gap-2">
                  <button onClick={createNewConversation} className="flex-1 flex items-center gap-2 px-4 py-3 bg-accent text-black rounded-lg font-mono text-sm uppercase">
                    <Plus className="w-4 h-4" />
                    New Chat
                  </button>
                  <button onClick={() => { setShowMobileSidebar(false); setShowAvatarModal(true); }} className="p-3 bg-surface border border-border text-text-secondary hover:text-accent rounded-lg transition-colors shrink-0" title="Set Avatar">
                    <User className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowMobileSidebar(false)} className="p-2 ml-1 shrink-0"><X className="w-4 h-4" /></button>
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
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Floating Action Buttons (below header) */}
          <div className="fixed top-24 right-4 z-40 flex flex-col gap-2">
            {/* Mobile sidebar toggle */}
            {!vnMode && (
              <button onClick={() => setShowMobileSidebar(!showMobileSidebar)} className="lg:hidden p-2 rounded-full bg-surface/80 backdrop-blur-sm border border-border hover:bg-surface shadow-lg">
                <MessageSquareMore className="w-4 h-4" />
              </button>
            )}
            {/* VN Mode Toggle */}
            <button
              onClick={() => setVnMode(!vnMode)}
              className="px-4 py-2 mt-2 rounded-lg bg-gradient-to-r from-accent to-yellow-400 text-black font-mono text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,255,148,0.2)] hover:from-yellow-400 hover:to-accent transition-all"
            >
              {vnMode ? 'Story Chat' : 'Visual Novel'}
            </button>
          </div>

          {/* Chat Area - fills remaining height */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
            {/* VN Mode Background with rotation */}
            {vnMode && (
              <>
                <div className="fixed inset-0 z-0">
                  {VN_BACKGROUNDS.map((bg, i) => (
                    <img
                      key={bg}
                      src={bg}
                      alt={`VN Background ${i + 1}`}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${i === vnBgIndex ? 'opacity-100' : 'opacity-0'}`}
                    />
                  ))}
                  <div className="absolute inset-0 bg-black/30" />
                </div>

                {/* Decorative floating bubbles */}
                {VN_BUBBLES.map((bubble, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.6, scale: 1, y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: bubble.delay }}
                    className="absolute z-10 cursor-pointer hover:opacity-100 transition-opacity"
                    style={{ top: bubble.top, left: bubble.left }}
                    onClick={() => {
                      setInput(bubble.text);
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                  >
                    <div
                      className="rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                      style={{ width: bubble.size, height: bubble.size }}
                    >
                      <span className="text-white/70 text-[9px] font-mono text-center px-2 leading-tight">{bubble.text}</span>
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {/* Chat Content (with VN-aware styling) */}
            <div className={`flex-1 flex flex-col min-h-0 relative z-20 ${vnMode ? 'p-0' : 'px-4 pb-4'}`}>
              {vnMode ? (
                /* =========================================================
                   VN MODE LAYOUT
                   ========================================================= */
                <div className="w-full h-full flex flex-col justify-end z-20 overflow-hidden">

                  {/* Sprites placed cleanly on top of dialogue box */}
                  <div className="w-full max-w-7xl mx-auto px-4 md:px-12 relative z-10 flex justify-between items-end">
                    {/* User Sprite (Left Side) */}
                    <div className="flex-1 flex justify-start">
                      <AnimatePresence>
                        {activeConversation?.messages[activeConversation.messages.length - 1]?.role === 'user' && userAvatar && (
                          <motion.div
                            initial={{ opacity: 0, y: 50, x: -20 }}
                            animate={{ opacity: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, y: 50, x: -20 }}
                            className="origin-bottom mr-8 mb-4 max-w-[200px] md:max-w-[260px]"
                          >
                            <img
                              src={userAvatar}
                              alt="You"
                              className="object-contain drop-shadow-[0_0_30px_rgba(96,165,250,0.4)] max-h-[250px] md:max-h-[360px] w-auto rounded-3xl border-2 border-blue-400/30"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Siggy Sprite (Right Side) */}
                    <div className="flex-1 flex justify-end">
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${activeConversation?.messages[activeConversation.messages.length - 1]?.role === 'user' ? 'opacity-50 brightness-50 scale-95' : 'opacity-100 brightness-110 scale-100'} transition-all duration-500 origin-bottom`}
                      >
                        <Image
                          src={personality === 'CAT' ? '/siggy-cat.png' : '/siggy-anime.png'}
                          alt="Siggy"
                          width={260}
                          height={360}
                          className="object-contain drop-shadow-[0_0_30px_rgba(0,255,148,0.2)]"
                          priority
                        />
                      </motion.div>
                    </div>
                  </div>
                  {/* Main Dialogue Box (Full Width) */}
                  <div className="w-full bg-surface/90 backdrop-blur-xl border-t border-border px-4 py-5 md:px-16 md:py-8 shadow-[0_-10px_30px_rgba(0,255,148,0.05)] transition-all">
                    <div className="max-w-7xl mx-auto">
                      {/* Box Header: Name + Mode Info */}
                      {activeConversation && activeConversation.messages.length > 0 && (
                        <div className="mb-2 flex items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-3">
                            <span className={`font-display uppercase tracking-wider text-xl md:text-2xl ${activeConversation.messages[activeConversation.messages.length - 1].role === 'user' ? 'text-blue-400' : 'text-accent'}`}>
                              {activeConversation.messages[activeConversation.messages.length - 1].role === 'user' ? 'You' : 'Siggy'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              <div className={`h-1 w-6 rounded-full transition-all ${personality === 'CAT' ? 'bg-accent shadow-[0_0_8px_rgba(0,255,148,0.8)]' : 'bg-surface border border-border'}`} />
                              <div className={`h-1 w-6 rounded-full transition-all ${personality === 'ANIME' ? 'bg-accent shadow-[0_0_8px_rgba(0,255,148,0.8)]' : 'bg-surface border border-border'}`} />
                            </div>
                            <span className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-text-secondary hidden sm:inline-block">
                              Mode: {personality === 'CAT' ? 'Cat Form' : 'Anime Girl Form'}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="min-h-[180px] max-h-[250px] overflow-y-auto mb-6 pr-4 signature-scroll flex items-start">
                        {!activeConversation || activeConversation.messages.length === 0 ? (
                          <div className="text-center">
                            <h2 className="text-xl font-display uppercase mb-2 text-accent">
                              Welcome to Earth
                            </h2>
                            <p className="text-text-secondary text-sm">
                              I&apos;m Siggy! I used to be a cosmic cat across infinite dimensions, but I descended to Earth and became an anime girl to blend in. Say hello!
                            </p>
                          </div>
                        ) : (
                          <div className="relative">
                            {isLoading && activeConversation.messages[activeConversation.messages.length - 1].role === 'user' ? (
                              <div className="flex items-center gap-2 text-sm text-text-secondary italic font-mono">
                                *Siggy is thinking...*
                              </div>
                            ) : (
                              <div className="relative flex flex-col items-start mt-2">
                                {activeConversation.messages[activeConversation.messages.length - 1].role === 'user' ? (
                                  <p
                                    className="text-sm md:text-base leading-relaxed font-mono italic text-text-secondary"
                                    dangerouslySetInnerHTML={{
                                      __html: parseMessageContent(activeConversation.messages[activeConversation.messages.length - 1].content)
                                    }}
                                  />
                                ) : (
                                  <TypewriterText key={activeConversation.messages.length} text={activeConversation.messages[activeConversation.messages.length - 1].content} isLatest={true} />
                                )}
                                {/* Action buttons moved down below the chat scroll area */}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Floating Action Buttons & Input Area */}
                      <div className="max-w-7xl mx-auto flex flex-col pt-4 mt-2 border-t border-border">
                        {/* Input Form & Action Controls integrated tightly */}
                        <div className="flex-1 flex gap-3 w-full items-center">
                          {/* Reinstated Floating Action Buttons (Left Aligned) */}
                          {activeConversation && activeConversation.messages.length > 0 && activeConversation.messages[activeConversation.messages.length - 1].role === 'assistant' && (
                            <div className="flex items-center gap-1 pr-2">
                              <span className={`text-xs font-mono px-3 py-1.5 rounded-full mr-1 ${moodColors[activeConversation.messages[activeConversation.messages.length - 1].mood || 'PLAYFUL']}`}>
                                {activeConversation.messages[activeConversation.messages.length - 1].mood}
                              </span>
                              <button onClick={() => copyMessage(activeConversation.messages[activeConversation.messages.length - 1].content)} className="p-2 rounded-lg hover:bg-surface/50 text-text-secondary hover:text-text-primary transition-colors" title="Copy">
                                <Copy className="w-4 h-4" />
                              </button>
                              <button onClick={() => toggleLike(activeConversation.messages.length - 1)} className={`p-2 rounded-lg ${activeConversation.messages[activeConversation.messages.length - 1].liked ? 'text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'} transition-colors`} title="Like">
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button onClick={() => toggleDislike(activeConversation.messages.length - 1)} className={`p-2 rounded-lg ${activeConversation.messages[activeConversation.messages.length - 1].disliked ? 'text-red-400' : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'} transition-colors`} title="Dislike">
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                              <button onClick={regenerateResponse} className="p-2 rounded-lg hover:bg-surface/50 text-text-secondary hover:text-text-primary transition-colors" title="Regenerate">
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          <button onClick={() => handleTransform(personality === 'CAT' ? 'ANIME' : 'CAT')} className="shrink-0 px-3 py-2 bg-gradient-to-r from-accent to-yellow-400 hover:from-yellow-400 hover:to-accent text-black font-bold flex items-center justify-center rounded-lg uppercase tracking-wider transition-all text-[10px] shadow-[0_0_15px_rgba(255,215,0,0.2)]" title="Transform Form">
                            {personality === 'CAT' ? 'Anime Form' : 'Cat Form'}
                          </button>

                          <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            placeholder="What will you say?"
                            disabled={isLoading}
                            className="flex-1 px-3 py-2 bg-black/40 border-none rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 text-xs transition-all font-mono shadow-inner min-w-[100px]"
                          />
                          <button
                            onClick={() => handleSendMessage()}
                            disabled={isLoading || !input.trim()}
                            className="shrink-0 px-4 py-2 bg-gradient-to-r from-accent to-yellow-400 text-black font-bold rounded-lg uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all flex items-center shadow-[0_0_15px_rgba(255,215,0,0.2)] text-xs"
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
                <div className="max-w-3xl mx-auto h-full flex flex-col min-h-0 w-full relative">
                  
                  {/* Decorative Transparent Right-side Graphic */}
                  <div className="absolute bottom-0 right-0 z-0 opacity-30 pointer-events-none translate-x-12 sm:translate-x-24 md:translate-x-32 max-w-[50%] h-[70vh] flex items-end">
                    <img src="/siggy-transparent.png" alt="Decorative Anime Girl" className="object-contain h-full" />
                  </div>

                  {/* Messages - scrollable */}
                  <div className="flex-1 overflow-y-auto space-y-3 py-3 min-h-0 relative z-10">
                    {!activeConversation || activeConversation.messages.length === 0 ? (
                      <div className="text-center py-16">
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="mb-6 flex justify-center">
                          <Image
                            src={personality === 'CAT' ? '/siggy-cat.png' : '/siggy-anime.png'}
                            alt="Siggy Avatar"
                            width={96}
                            height={96}
                            className="rounded-full bg-black/50 border border-border object-cover shadow-2xl"
                            priority
                          />
                        </motion.div>
                        <h2 className="text-2xl md:text-4xl font-display tracking-wide uppercase mb-4 text-accent">
                          Welcome to Earth
                        </h2>
                        <p className="text-sm max-w-xl mx-auto text-text-secondary">
                          I&apos;m Siggy! I used to be a cosmic cat across infinite dimensions, but I descended to Earth and became an anime girl to blend in. Pretty clever, right? Anyway, nice to meet you!
                        </p>
                      </div>
                    ) : (
                      activeConversation.messages.map((message, index) => (
                        <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} gap-3 items-end`}>
                          {message.role === 'assistant' && (
                            <div className="shrink-0 mb-3">
                              <Image src={personality === 'CAT' ? '/siggy-cat.png' : '/siggy-anime.png'} alt="Siggy Avatar" width={32} height={32} className="rounded-full bg-black/50 border border-border object-cover" />
                            </div>
                          )}
                          <div className={`max-w-[80%] rounded-xl px-4 py-3 bg-surface border border-border shadow-sm ${message.role === 'assistant' ? 'rounded-bl-none' : 'rounded-br-none'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono font-semibold text-text-primary">{message.role === 'user' ? 'YOU' : 'SIGGY'}</span>
                              {message.mood && <span className={`text-xs font-mono px-2 py-1 rounded-full ${moodColors[message.mood]}`}>{message.mood}</span>}
                            </div>
                            <p className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-text-primary" dangerouslySetInnerHTML={{ __html: parseMessageContent(message.content) }} />

                            {message.role === 'assistant' && (
                              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
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
                          {message.role === 'user' && (
                            <div className="shrink-0 mb-3 ml-2">
                              {userAvatar ? (
                                <img src={userAvatar} alt="User" className="w-8 h-8 rounded-full bg-black/50 border-2 border-blue-400/50 object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-text-secondary">
                                  <User className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}

                    {isLoading && (
                      <div className="flex justify-start gap-3 items-end">
                        <div className="shrink-0 mb-3">
                          <Image src={personality === 'CAT' ? '/siggy-cat.png' : '/siggy-anime.png'} alt="Siggy Avatar" width={32} height={32} className="rounded-full bg-black/50 border border-border object-cover" />
                        </div>
                        <div className="bg-surface border border-border shadow-sm rounded-2xl rounded-bl-none px-6 py-4">
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
                  <div className="shrink-0 space-y-3">
                    <div className="flex items-center justify-between pb-2">
                      <div className="font-mono text-[10px] text-text-secondary">
                        Mood: <span className={`ml-2 px-2 py-1 rounded-full ${activeConversation ? moodColors[activeConversation.currentMood] : moodColors.PLAYFUL}`}>{activeConversation?.currentMood || 'PLAYFUL'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-xs text-text-secondary">Messages: {activeConversation?.messageCount || 0}</span>
                        {contextInfo && <span className={`font-mono text-xs ${contextInfo.estimatedTokens > 80000 ? 'text-red-400' : contextInfo.estimatedTokens > 50000 ? 'text-amber-400' : 'text-text-secondary'}`}>{contextInfo.hasSummary ? 'Summary: ' : 'Memory: '} {Math.round(contextInfo.estimatedTokens / 1000)}k keys</span>}
                        <button onClick={resetCurrentConversation} className="p-2 rounded hover:bg-surface">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Suggestions Grid (2x2) */}
                    {!activeConversation || activeConversation.messages.length > 0 && !isLoading && (
                      <div className="grid grid-cols-2 gap-3 mt-4 mb-2">
                        <button onClick={() => handleTransform(personality === 'CAT' ? 'ANIME' : 'CAT')} className="px-4 py-3 font-mono text-xs uppercase tracking-wider bg-gradient-to-r from-accent to-yellow-400 text-black shadow-[0_0_15px_rgba(0,255,148,0.2)] hover:from-yellow-400 hover:to-accent rounded-lg transition-all text-left">
                          {personality === 'CAT' ? 'Turn into Anime Form!' : 'Turn into Cat Form!'}
                        </button>
                        <button onClick={() => handleSendMessage('What are your cosmic origins?')} className="px-4 py-3 font-mono text-xs uppercase tracking-wider bg-surface border border-border text-text-primary hover:border-accent hover:text-accent rounded-lg transition-all text-left">
                          Cosmic origins
                        </button>
                        <button onClick={() => handleSendMessage('Tell me a weird dimension you visited.')} className="px-4 py-3 font-mono text-xs uppercase tracking-wider bg-surface border border-border text-text-primary hover:border-accent hover:text-accent rounded-lg transition-all text-left">
                          Weird dimensions
                        </button>
                        <button onClick={() => handleSendMessage('What is your favorite Earth food?')} className="px-4 py-3 font-mono text-xs uppercase tracking-wider bg-surface border border-border text-text-primary hover:border-accent hover:text-accent rounded-lg transition-all text-left">
                          Earth food
                        </button>
                      </div>
                    )}

                    {/* Input */}
                    <div className="flex gap-2 pt-2 items-center relative z-20">
                      <button onClick={resetCurrentConversation} className="p-3 bg-surface hover:bg-surface/80 border border-border rounded-lg text-text-secondary hover:text-accent transition-colors hidden sm:block" title="Refresh Chat">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Type your message..." disabled={isLoading} className="flex-1 px-3 py-2 border-none rounded-lg focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 font-mono text-xs bg-surface text-text-primary placeholder:text-text-secondary/50 shadow-inner" />
                      <button onClick={() => handleSendMessage()} disabled={isLoading || !input.trim()} className="px-4 py-2 bg-gradient-to-r from-accent to-yellow-400 text-black font-bold hover:from-yellow-400 hover:to-accent disabled:from-surface disabled:to-surface disabled:border disabled:border-border disabled:text-text-secondary/50 rounded-lg font-mono text-xs uppercase transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,215,0,0.2)] disabled:shadow-none">
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

      {/* User Avatar Upload Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAvatarModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden z-10 flex flex-col p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  Your Profile
                </h3>
                <button onClick={() => setShowAvatarModal(false)} className="p-2 hover:bg-bg rounded-lg text-text-secondary hover:text-text-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-6">
                {/* Current Avatar Preview */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full border-4 border-bg overflow-hidden bg-bg flex items-center justify-center shadow-[0_0_30px_rgba(96,165,250,0.2)]">
                    {userAvatar ? (
                      <img src={userAvatar} alt="Your Custom Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-text-secondary/50" />
                    )}
                  </div>
                </div>

                {/* Upload Button */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
                
                <div className="flex flex-col gap-2 w-full">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 bg-gradient-to-r from-accent to-yellow-400 text-black font-bold uppercase tracking-wider font-mono text-sm rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,148,0.2)]"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </button>
                  {userAvatar && (
                    <button 
                      onClick={() => { setUserAvatar(null); setShowAvatarModal(false); }}
                      className="w-full py-3 px-4 bg-bg border border-border text-text-secondary font-mono uppercase tracking-wider text-xs rounded-xl hover:text-red-400 hover:border-red-400/30 transition-colors"
                    >
                      Remove Avatar
                    </button>
                  )}
                </div>
                <p className="text-xs text-text-secondary font-mono text-center opacity-70">
                  Images are saved locally on your browser. Over 5MB will be rejected.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
