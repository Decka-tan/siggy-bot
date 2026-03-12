'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, RefreshCw, Send, BookOpen, Plus, MessageSquare, Trash2, X, Copy, ThumbsUp, ThumbsDown, Share2, ChevronLeft, ChevronRight, MessageSquareMore, Sparkles, MessageCircle, User, Upload, ChevronUp, ChevronDown, Pencil, Clock } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

type MoodState = 'DEFAULT' | 'HAPPY' | 'SAD' | 'SHOCK' | 'SHY' | 'ANGRY';

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
  relationshipLevel?: string;
  relationshipScore?: number;
}

interface ContextInfo {
  totalMessages: number;
  estimatedTokens: number;
  hasSummary: boolean;
}

const moodColors: Record<MoodState, string> = {
  DEFAULT: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  HAPPY: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  SAD: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
  SHOCK: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
  SHY: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
  ANGRY: 'bg-red-500/20 border-red-500/30 text-red-400',
};

// Sprite mapping based on personality + mood
const getSpriteForMood = (personality: string, mood: MoodState): string => {
  const prefix = personality === 'CAT' ? '/siggy-cat' : '/siggy-girl';
  return `${prefix}-${mood.toLowerCase()}.png`;
};

const getBondColor = (level?: string): string => {
  if (!level) return 'text-accent';
  switch (level.toUpperCase()) {
    case 'SOULBOUND': return 'text-yellow-400';
    case 'BESTIE': return 'text-pink-400';
    case 'FRIEND': return 'text-accent';
    case 'ACQUAINTANCE': return 'text-blue-400';
    case 'SKETCHY': return 'text-orange-400';
    case 'ENEMY': return 'text-red-500';
    default: return 'text-accent';
  }
};

const getBondBarColor = (level?: string): string => {
  if (!level) return 'bg-accent';
  switch (level.toUpperCase()) {
    case 'SOULBOUND': return 'bg-yellow-400';
    case 'BESTIE': return 'bg-pink-400';
    case 'ENEMY': return 'bg-red-500';
    default: return 'bg-accent';
  }
};

const CONVERSATIONS_KEY = 'siggy-conversations';
const ACTIVE_CONV_KEY = 'siggy-active-conversation';
const SIDEBAR_KEY = 'siggy-sidebar-collapsed';
const VN_MODE_KEY = 'siggy-vn-mode';
const USER_AVATAR_KEY = 'siggy-user-avatar';
const USER_NAME_KEY = 'siggy-user-name';
const GLOBAL_BOND_SCORE_KEY = 'siggy-global-bond-score';
const GLOBAL_BOND_LEVEL_KEY = 'siggy-global-bond-level';

// VN Mode backgrounds (rotate every 10s)
const VN_BACKGROUNDS = [
  '/vn-bg/1.jpg',
  '/vn-bg/2.jpg',
  '/vn-bg/3.jpg',
  '/vn-bg/4.jpg',
  '/story-bg/chapter1.jpg',
  '/story-bg/chapter2.jpg',
  '/story-bg/chapter4.jpg',
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
const TypewriterText = ({ text, isLatest, className, alreadyAnimated, onAnimationComplete, playTyping, playVoiceLine, personality }: { text: string; isLatest: boolean; className?: string; alreadyAnimated: boolean; onAnimationComplete?: () => void; playTyping?: () => void; playVoiceLine?: (t: 'CAT' | 'ANIME') => void; personality?: 'CAT' | 'ANIME' }) => {
  const hasAnimatedRef = useRef(alreadyAnimated);
  const [displayedText, setDisplayedText] = useState(() => {
    if (!isLatest || alreadyAnimated) return text;
    return '';
  });

  useEffect(() => {
    if (!isLatest || hasAnimatedRef.current || alreadyAnimated) {
      setDisplayedText(text);
      if (!hasAnimatedRef.current) {
        hasAnimatedRef.current = true;
        onAnimationComplete?.();
      }
      return;
    }

    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      // Check for a hidden window property that we'll set on 'Enter'
      if ((window as any).forceSkipAnimation) {
        setDisplayedText(text);
        clearInterval(interval);
        onAnimationComplete?.();
        return;
      }

      if (i === 0 && playVoiceLine && personality) playVoiceLine(personality);
      setDisplayedText(text.substring(0, i + 1));
      if (i % 3 === 0 && playTyping) playTyping();
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        hasAnimatedRef.current = true;
        onAnimationComplete?.();
      }
    }, 20);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, isLatest, alreadyAnimated]);

  return <p className={className || "text-sm md:text-base leading-relaxed font-mono whitespace-pre-wrap text-text-primary"} dangerouslySetInnerHTML={{ __html: parseMessageContent(displayedText) }} />;
};


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
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('new') === 'true') {
      return null;
    }
    return localStorage.getItem(ACTIVE_CONV_KEY);
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('new') === 'true') {
        const url = new URL(window.location.href);
        url.searchParams.delete('new');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

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
  const [userName, setUserName] = useState(() => {
    if (typeof window === 'undefined') return 'Ritualist';
    return localStorage.getItem(USER_NAME_KEY) || 'Ritualist';
  });
  const [editingName, setEditingName] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const { playClick, playHeavyClick, playTyping, playVoiceLine } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animatedMessages = useRef<Set<string>>(new Set());
  const [vnMode, setVnMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(VN_MODE_KEY) === 'true';
  });
  const [personality, setPersonality] = useState<'CAT' | 'ANIME'>('ANIME');
  const [vnBgIndex, setVnBgIndex] = useState(0);
  const [showStats, setShowStats] = useState(true);
  const [vnHistoryIndex, setVnHistoryIndex] = useState<number>(-1); // -1 means latest
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track global bond across sessions
  const [globalRelationshipScore, setGlobalRelationshipScore] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem(GLOBAL_BOND_SCORE_KEY)) || 0;
  });
  const [globalRelationshipLevel, setGlobalRelationshipLevel] = useState<string>(() => {
    if (typeof window === 'undefined') return 'ACQUAINTANCE';
    return localStorage.getItem(GLOBAL_BOND_LEVEL_KEY) || 'ACQUAINTANCE';
  });

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  // Initialize animatedMessages with all existing messages on load so they don't re-animate
  useEffect(() => {
    if (typeof window !== 'undefined') {
      conversations.forEach(conv => {
        conv.messages.forEach((_, idx) => {
          animatedMessages.current.add(`${conv.id}-${idx}`);
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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

  // Sync global bond to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GLOBAL_BOND_SCORE_KEY, globalRelationshipScore.toString());
      localStorage.setItem(GLOBAL_BOND_LEVEL_KEY, globalRelationshipLevel);
    }
  }, [globalRelationshipScore, globalRelationshipLevel]);

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
    // Reset VN history index when messages change
    setVnHistoryIndex(-1);
  }, [activeConversation?.messages, activeConversationId]);

  // Rotate VN backgrounds every 10s
  useEffect(() => {
    if (!vnMode) return;
    const interval = setInterval(() => {
      setVnBgIndex(prev => (prev + 1) % VN_BACKGROUNDS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [vnMode]);

  // Listen for VN mode toggle from header
  useEffect(() => {
    const handleVNModeToggle = ((e: CustomEvent) => {
      setVnMode(e.detail);
      if (typeof window !== 'undefined') {
        localStorage.setItem(VN_MODE_KEY, String(e.detail));
      }
    }) as EventListener;

    window.addEventListener('vnModeToggle', handleVNModeToggle);
    return () => {
      window.removeEventListener('vnModeToggle', handleVNModeToggle);
    };
  }, []);

  // Keyboard navigation for VN History
  useEffect(() => {
    if (!vnMode || !activeConversation || activeConversation.messages.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') {
        const currentIdx = vnHistoryIndex === -1 ? activeConversation.messages.length - 1 : vnHistoryIndex;
        if (currentIdx > 0) setVnHistoryIndex(currentIdx - 1);
        playClick();
      } else if (e.key === 'ArrowRight') {
        if (vnHistoryIndex !== -1 && vnHistoryIndex < activeConversation.messages.length - 1) {
          setVnHistoryIndex(vnHistoryIndex + 1);
          playClick();
        } else if (vnHistoryIndex === activeConversation.messages.length - 1) {
          setVnHistoryIndex(-1);
          playClick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vnMode, vnHistoryIndex, activeConversation, playClick]);

  const createNewConversation = () => {
    // Inherit relationship from newest existing conversation
    const lastConv = conversations[0];
    
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      currentMood: 'DEFAULT' as MoodState,
      messageCount: 0,
      timestamp: Date.now(),
      relationshipLevel: globalRelationshipLevel || 'ACQUAINTANCE',
      relationshipScore: globalRelationshipScore || 0,
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
    playHeavyClick();
    const textToSend = typeof overrideInput === 'string' ? overrideInput : input;
    if (!textToSend.trim() || isLoading) return;

    let targetConvId = activeConversationId;
    if (!targetConvId) {
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: generateTitle(textToSend),
        messages: [],
        currentMood: 'DEFAULT' as MoodState,
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
          userName,
          currentForm: personality,
          relationshipScore: globalRelationshipScore, // Send global score
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
            relationshipLevel: data.relationshipLevel,
            relationshipScore: data.relationshipScore,
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
                mood: 'SHOCK' as MoodState,
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
        return { 
          ...conv, 
          messages: [], 
          currentMood: 'DEFAULT' as MoodState, 
          messageCount: 0,
          relationshipLevel: globalRelationshipLevel || 'ACQUAINTANCE',
          relationshipScore: globalRelationshipScore || 0
        };
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
          userName,
          relationshipScore: globalRelationshipScore,
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
            relationshipLevel: data.relationshipLevel,
            relationshipScore: data.relationshipScore,
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
    playHeavyClick();
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
      // Inherit relationship from newest existing conversation
      const lastConv = conversations[0];

      const newConv: Conversation = {
        id: Date.now().toString(),
        title: generateTitle(transformMsg),
        messages: [],
        currentMood: 'DEFAULT' as MoodState,
        messageCount: 0,
        timestamp: Date.now(),
        relationshipLevel: globalRelationshipLevel || 'ACQUAINTANCE',
        relationshipScore: globalRelationshipScore || 0,
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
          userName,
          relationshipScore: globalRelationshipScore,
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
    <div className="h-screen bg-bg text-text-primary flex flex-col overflow-hidden relative">
      {vnMode && (
        <style dangerouslySetInnerHTML={{ __html: `footer { display: none !important; }` }} />
      )}
      {/* Decorative Transparent Right-side Graphic - Fixed to viewport */}
      <div className="fixed bottom-0 right-0 z-0 opacity-30 pointer-events-none max-w-[40%] h-[56vh] flex items-end pointer-events-none">
        <img src="/siggy-transparent.png" alt="Decorative Anime Girl" className="object-contain h-full" />
      </div>

      {/* Desktop Sidebar - Full height, fixed position */}
      {(!vnMode || !sidebarCollapsed) && (
        <div className={`hidden lg:flex flex-col bg-surface border-r border-border transition-all duration-300 fixed left-0 top-0 bottom-0 z-[60] ${vnMode ? 'w-56 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : (sidebarCollapsed ? 'w-14' : 'w-56')}`}>
          {/* Profile Section */}
          <div className={`border-b border-border shrink-0 ${(!vnMode && sidebarCollapsed) ? 'py-4 flex flex-col items-center gap-2' : 'p-4 pt-6'}`}>
            {/* Avatar */}
            <button onClick={() => setShowAvatarModal(true)} className={`rounded-full overflow-hidden border-2 border-border hover:border-accent transition-colors shrink-0 ${(!vnMode && sidebarCollapsed) ? 'w-8 h-8' : 'w-16 h-16 mx-auto block'}`} title="Change Avatar">
              {userAvatar ? (
                <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-bg flex items-center justify-center">
                  <User className={`${(!vnMode && sidebarCollapsed) ? 'w-4 h-4' : 'w-8 h-8'} text-text-secondary/50`} />
                </div>
              )}
            </button>
            {/* Username */}
            {(!sidebarCollapsed || vnMode) && (
              <div className="mt-3 text-center w-full px-2">
                {editingName ? (
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onBlur={() => { setEditingName(false); localStorage.setItem('siggy-user-name', userName); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setEditingName(false); localStorage.setItem('siggy-user-name', userName); } }}
                    autoFocus
                    className="w-full text-center text-sm font-mono font-semibold text-text-primary bg-bg border border-accent rounded px-2 py-1 focus:outline-none"
                  />
                ) : (
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={() => setEditingName(true)} 
                      className="flex items-center gap-2 text-sm font-mono font-semibold text-text-primary hover:text-accent transition-colors group" 
                      title="Edit Username"
                    >
                      {userName}
                      <Pencil className="w-3 h-3 text-text-secondary opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <p className="font-mono text-[9px] text-text-secondary uppercase tracking-widest mt-1">Earth Resident</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* New Chat Button */}
          <div className={`shrink-0 ${(!vnMode && sidebarCollapsed) ? 'p-1' : 'p-3'}`}>
            <button onClick={() => { createNewConversation(); if (vnMode) setSidebarCollapsed(true); }} className={`w-full flex items-center ${(!vnMode && sidebarCollapsed) ? 'justify-center p-2' : 'gap-2 px-4 py-2'} bg-accent text-black rounded-lg font-mono text-sm uppercase tracking-wider hover:opacity-90`}>
              <Plus className="w-4 h-4" />
              {(!sidebarCollapsed || vnMode) && 'New Chat'}
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map(conv => (
              <div key={conv.id} onClick={() => { setActiveConversationId(conv.id); if (vnMode) setSidebarCollapsed(true); }} className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeConversationId === conv.id ? 'bg-accent/20 text-accent' : 'hover:bg-surface text-text-secondary hover:text-text-primary'}`}>
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                {(!sidebarCollapsed || vnMode) && <span className="flex-1 text-sm truncate">{conv.title}</span>}
                {(!sidebarCollapsed || vnMode) && (
                  <button onClick={(e) => deleteConversation(conv.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Collapse/Expand Button */}
          {!vnMode && (
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-accent text-black rounded-full flex items-center justify-center shadow-lg hover:opacity-90 z-20">
              {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
          )}
        </div>
      )}

      {/* Main content wrapper */}
      <div className={`flex flex-1 flex-col pt-20 overflow-hidden min-h-0 ${!vnMode ? (sidebarCollapsed ? 'lg:ml-14' : 'lg:ml-56') : ''} transition-all duration-300`}>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {showMobileSidebar && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMobileSidebar(false)} className="fixed inset-0 bg-black/50 z-50 lg:hidden" />
              <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed lg:hidden z-50 left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col shadow-2xl">
                <div className="p-8 border-b border-border bg-surface/30">
                  <div className="flex flex-col items-center gap-4 relative">
                    {/* Close button - top right of sidebar */}
                    <button onClick={() => setShowMobileSidebar(false)} className="absolute -top-4 -right-4 p-2 text-text-secondary hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center gap-4">
                      <div 
                        className="w-20 h-20 rounded-full border-2 border-border bg-bg overflow-hidden flex items-center justify-center shadow-[0_0_25px_rgba(255,215,0,0.1)] hover:border-accent transition-all cursor-pointer group"
                        onClick={() => { setShowMobileSidebar(false); setShowAvatarModal(true); }}
                        title="Change Avatar"
                      >
                        {userAvatar ? (
                          <img src={userAvatar} alt="Profile" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <User className="w-10 h-10 text-text-secondary/50 group-hover:scale-110 transition-transform" />
                        )}
                      </div>
                      <div className="text-center w-full px-4">
                        {editingName ? (
                          <input
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            onBlur={() => { setEditingName(false); localStorage.setItem('siggy-user-name', userName); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { setEditingName(false); localStorage.setItem('siggy-user-name', userName); } }}
                            autoFocus
                            className="w-full text-center text-sm font-mono font-semibold text-text-primary bg-bg border border-accent rounded px-2 py-1 focus:outline-none"
                          />
                        ) : (
                          <h3 
                            className="font-mono text-base font-bold text-text-primary uppercase flex items-center justify-center gap-2 cursor-pointer hover:text-accent transition-colors group"
                            onClick={() => setEditingName(true)}
                            title="Edit Username"
                          >
                            {userName}
                            <Pencil className="w-3 h-3 text-text-secondary opacity-50 group-hover:opacity-100 transition-opacity" />
                          </h3>
                        )}
                        <p className="font-mono text-[10px] text-text-secondary uppercase tracking-widest mt-1">Earth Resident</p>
                      </div>
                    </div>
                  </div>
                </div>
                    
                <div className="p-4 border-b border-border">
                  <button onClick={createNewConversation} className="w-full h-12 flex justify-center items-center gap-3 bg-accent hover:opacity-90 text-black rounded-xl font-mono text-sm uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,215,0,0.2)] active:scale-95">
                    <Plus className="w-4 h-4" />
                    New Chat
                  </button>
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

        {/* Floating Action Buttons (below header) */}
        <div className="fixed top-24 left-0 right-0 z-40 flex px-8 pointer-events-none">
          <div className="max-w-7xl w-full mx-auto flex justify-between items-start pointer-events-none">
            {/* Desktop Center-Top Sidebar Toggle */}
            {vnMode && (
              <div className="flex-1 flex justify-center pointer-events-none">
                <button 
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
                  className="hidden lg:flex pointer-events-auto px-4 py-2 rounded-full bg-surface/80 backdrop-blur-sm border border-border hover:bg-surface shadow-lg items-center gap-2 text-xs font-mono tracking-wider uppercase text-text-primary hover:text-accent transition-colors"
                  title="Toggle Sidebar"
                >
                  <MessageSquareMore className="w-4 h-4" />
                  {sidebarCollapsed ? 'Open Sidebar' : 'Close Sidebar'}
                </button>
              </div>
            )}

            {/* Mobile sidebar toggle (Right Aligned) */}
            <div className="flex flex-col gap-2 pointer-events-auto shrink-0 ml-auto z-[70] relative">
              <button 
                onClick={() => setShowMobileSidebar(!showMobileSidebar)} 
                className="lg:hidden p-2 rounded-full bg-surface/80 backdrop-blur-sm border border-border hover:bg-surface shadow-lg"
                title="Toggle Mobile Sidebar"
              >
                <MessageSquareMore className="w-4 h-4" />
              </button>
            </div>
          </div>
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
              </>
            )}

            {/* Chat Content (with VN-aware styling) */}
            <div className={`flex-1 flex flex-col min-h-0 relative z-20 ${vnMode ? 'p-0' : 'px-4 sm:px-6 pb-2 sm:pb-4'}`}>
              {vnMode ? (
                /* =========================================================
                   VN MODE LAYOUT
                   ========================================================= */
                <div className="w-full h-full flex flex-col justify-end z-20 overflow-hidden">

                  {/* Sprites placed cleanly on top of dialogue box */}
                  <div className="w-full max-w-7xl mx-auto px-8 relative z-10 flex justify-between items-end">
                    {/* Siggy Sprite (Left Side) */}
                    <div className="flex-1 flex justify-start">
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${(vnHistoryIndex === -1 ? activeConversation?.messages[activeConversation.messages.length - 1]?.role : activeConversation?.messages[vnHistoryIndex]?.role) === 'user' ? 'opacity-50 brightness-50 scale-95' : 'opacity-100 brightness-110 scale-100'} transition-all duration-500 origin-bottom`}
                      >
                        <Image
                          src={getSpriteForMood(personality, (vnHistoryIndex === -1 ? activeConversation?.messages[activeConversation.messages.length - 1]?.mood : activeConversation?.messages[vnHistoryIndex]?.mood) || activeConversation?.currentMood || 'DEFAULT')}
                          alt="Siggy"
                          width={260}
                          height={360}
                          className="object-contain drop-shadow-[0_0_30px_rgba(255,215,0,0.2)]"
                          priority
                        />
                      </motion.div>
                    </div>

                    {/* User Sprite (Right Side) */}
                    <div className="flex-1 flex justify-end">
                      <AnimatePresence>
                        {(vnHistoryIndex === -1 ? activeConversation?.messages[activeConversation.messages.length - 1]?.role : activeConversation?.messages[vnHistoryIndex]?.role) === 'user' && userAvatar && (
                          <motion.div
                            initial={{ opacity: 0, y: 50, x: 20 }}
                            animate={{ opacity: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, y: 50, x: 20 }}
                            className="origin-bottom ml-8 mb-4 max-w-[200px] md:max-w-[260px]"
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
                  </div>
                  {/* Main Dialogue Box (Full Width) */}
                  <div className="w-full relative bg-black/80 backdrop-blur-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] transition-all">
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 relative">
                      {/* Box Header: Name + Mode Info */}
                      {activeConversation && (
                        <div className="mb-2 flex items-center justify-between pb-3 relative">
                          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-white/5 to-transparent" />
                          <div className="flex items-center gap-3">
                            <span className={`font-display uppercase tracking-wider text-xl md:text-2xl ${(vnHistoryIndex === -1 ? activeConversation.messages[activeConversation.messages.length - 1].role : activeConversation.messages[vnHistoryIndex].role) === 'user' ? 'text-text-secondary' : 'text-accent'}`}>
                              {(vnHistoryIndex === -1 ? activeConversation.messages[activeConversation.messages.length - 1].role : activeConversation.messages[vnHistoryIndex].role) === 'user' ? 'You' : 'Siggy'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* History Status Pill (Moved next to Bond) */}
                            {activeConversation.messages.length > 1 && (
                              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full transition-all duration-300">
                                <Clock className="w-3 h-3 text-accent animate-pulse" />
                                <span className="text-[10px] font-mono font-bold text-white tracking-tighter">
                                  HISTORY: {(vnHistoryIndex === -1 ? activeConversation.messages.length : vnHistoryIndex + 1)}/{activeConversation.messages.length}
                                </span>
                                <button 
                                  onClick={() => setVnHistoryIndex(-1)}
                                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded transition-all ${vnHistoryIndex === -1 ? 'bg-accent text-black' : 'text-accent/60 hover:text-accent'}`}
                                >
                                  LATEST
                                </button>
                              </div>
                            )}

                            {/* Bond Resonance Meter (RIGHT SIDE) */}
                            {activeConversation.relationshipLevel && (
                              <div className={`flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 mr-2 transition-all duration-500 ${activeConversation.relationshipLevel === 'SOULBOUND' ? 'shadow-[0_0_15px_rgba(255,215,0,0.2)] border-yellow-500/30' : ''}`}>
                                <Sparkles className={`w-3 h-3 animate-pulse ${getBondColor(activeConversation.relationshipLevel)}`} />
                                <span className={`text-[10px] font-mono font-bold tracking-tighter ${getBondColor(activeConversation.relationshipLevel)}`}>
                                  BOND: {activeConversation.relationshipLevel}
                                </span>
                                <div className="hidden md:flex gap-0.5 ml-1">
                                  {[...Array(5)].map((_, i) => (
                                    <div 
                                      key={i} 
                                      className={`h-1.5 w-3 rounded-sm transition-all duration-500 ${
                                        (activeConversation.relationshipScore || 0) >= (i * 5) 
                                          ? `${getBondBarColor(activeConversation.relationshipLevel)} shadow-[0_0_5px_rgba(0,0,0,0.3)]` 
                                          : 'bg-white/10'
                                      }`} 
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-1">
                              <div className={`h-1 w-6 rounded-full transition-all ${personality === 'CAT' ? 'bg-accent shadow-[0_0_8px_rgba(255,215,0,0.8)]' : 'bg-surface border border-border'}`} />
                              <div className={`h-1 w-6 rounded-full transition-all ${personality === 'ANIME' ? 'bg-accent shadow-[0_0_8px_rgba(255,215,0,0.8)]' : 'bg-surface border border-border'}`} />
                            </div>
                            <span className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-text-secondary hidden sm:inline-block">
                              Mode: {personality === 'CAT' ? 'Cat' : 'Anime'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Side Navigation Arrows - Positioned at EXTREME edges of the SCREEN (-offset relative to center box) */}
                      {vnMode && activeConversation && activeConversation.messages.length > 1 && (
                        <>
                          <button 
                            onClick={() => {
                              const currentIdx = vnHistoryIndex === -1 ? activeConversation.messages.length - 1 : vnHistoryIndex;
                              if (currentIdx > 0) setVnHistoryIndex(currentIdx - 1);
                              playClick();
                            }}
                            disabled={vnHistoryIndex === 0}
                            className="fixed left-4 sm:left-10 top-1/2 -translate-y-1/2 z-40 p-2 text-white/20 hover:text-accent hover:scale-125 disabled:opacity-0 transition-all duration-300 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                            title="Previous Message (Left Arrow)"
                          >
                            <ChevronLeft className="w-16 h-16 sm:w-20 sm:h-20" />
                          </button>
                          <button 
                            onClick={() => {
                              if (vnHistoryIndex !== -1 && vnHistoryIndex < activeConversation.messages.length - 1) {
                                setVnHistoryIndex(vnHistoryIndex + 1);
                                playClick();
                              } else if (vnHistoryIndex === activeConversation.messages.length - 1) {
                                setVnHistoryIndex(-1);
                                playClick();
                              }
                            }}
                            disabled={vnHistoryIndex === -1}
                            className="fixed right-4 sm:right-10 top-1/2 -translate-y-1/2 z-40 p-2 text-white/20 hover:text-accent hover:scale-125 disabled:opacity-0 transition-all duration-300 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                            title="Next Message (Right Arrow)"
                          >
                            <ChevronRight className="w-16 h-16 sm:w-20 sm:h-20" />
                          </button>
                        </>
                      )}

                      <div className="min-h-[120px] sm:min-h-[180px] max-h-[180px] sm:max-h-[250px] overflow-y-auto mb-2 sm:mb-6 pr-4 signature-scroll flex items-start">
                        {!activeConversation || activeConversation.messages.length === 0 ? (
                          <div className="text-center w-full">
                            <h2 className="text-xl font-display uppercase mb-2 text-accent">
                              Welcome to Earth
                            </h2>
                            <p className="text-text-secondary text-sm max-w-xl mx-auto mb-6">
                              I&apos;m Siggy! I used to be a cosmic cat across infinite dimensions, but I descended to Earth and became an anime girl to blend in. Say hello!
                            </p>
                            
                            {/* Starting Topic Buttons for VN Mode */}
                            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                              <button onClick={() => handleTransform(personality === 'CAT' ? 'ANIME' : 'CAT')} className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider bg-gradient-to-r from-accent to-yellow-400 text-black shadow-[0_0_15px_rgba(255,215,0,0.2)] hover:from-yellow-400 hover:to-accent rounded-lg transition-all text-left">
                                {personality === 'CAT' ? 'Turn into Anime Form!' : 'Turn into Cat Form!'}
                              </button>
                              <button onClick={() => handleSendMessage('What are your cosmic origins?')} className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider bg-black/40 border border-white/10 text-white hover:border-accent hover:text-accent rounded-lg transition-all text-left">
                                Cosmic origins
                              </button>
                              <button onClick={() => handleSendMessage('Tell me a weird dimension you visited.')} className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider bg-black/40 border border-white/10 text-white hover:border-accent hover:text-accent rounded-lg transition-all text-left">
                                Weird dimensions
                              </button>
                              <button onClick={() => handleSendMessage('What is your favorite Earth food?')} className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider bg-black/40 border border-white/10 text-white hover:border-accent hover:text-accent rounded-lg transition-all text-left">
                                Earth food
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            {isLoading && activeConversation.messages[activeConversation.messages.length - 1].role === 'user' ? (
                              <div className="flex items-center gap-2 text-sm text-text-secondary italic font-mono">
                                *Siggy is thinking...*
                              </div>
                            ) : (
                              <div className="relative flex flex-col items-start mt-2 w-full">
                                {(vnHistoryIndex === -1 ? activeConversation.messages[activeConversation.messages.length - 1].role : activeConversation.messages[vnHistoryIndex].role) === 'user' ? (
                                  <p
                                    className="text-sm md:text-base leading-relaxed font-mono italic text-text-secondary w-full"
                                    dangerouslySetInnerHTML={{
                                      __html: parseMessageContent(vnHistoryIndex === -1 ? activeConversation.messages[activeConversation.messages.length - 1].content : activeConversation.messages[vnHistoryIndex].content)
                                    }}
                                  />
                                ) : (
                                  <TypewriterText 
                                    text={vnHistoryIndex === -1 ? activeConversation.messages[activeConversation.messages.length - 1].content : activeConversation.messages[vnHistoryIndex].content} 
                                    isLatest={vnHistoryIndex === -1 || vnHistoryIndex === activeConversation.messages.length - 1} 
                                    alreadyAnimated={vnHistoryIndex !== -1 || animatedMessages.current.has(`${activeConversationId}-${activeConversation.messages.length - 1}`)} 
                                    onAnimationComplete={() => {
                                      if (vnHistoryIndex === -1) {
                                        animatedMessages.current.add(`${activeConversationId}-${activeConversation.messages.length - 1}`);
                                      }
                                    }} 
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Floating Action Buttons & Input Area */}
                      <div className="max-w-7xl mx-auto flex flex-col pt-2 sm:pt-4 mt-1 sm:mt-2 border-t border-border">
                        {/* Input Form & Action Controls integrated tightly */}
                        <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full items-start sm:items-center">
                          <div className="flex items-center justify-between w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar gap-2">
                            {/* Reinstated Floating Action Buttons (Left Aligned) */}
                            {activeConversation && activeConversation.messages.length > 0 && activeConversation.messages[activeConversation.messages.length - 1].role === 'assistant' && (
                              <div className="flex items-center gap-1 pr-2 shrink-0">
                                <span className={`text-xs font-mono px-3 py-1.5 rounded-full mr-1 ${moodColors[activeConversation.messages[activeConversation.messages.length - 1].mood || 'DEFAULT']}`}>
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
                          </div>

                          <div className="flex-1 w-full flex items-center gap-2">
                            <button onClick={() => setShowStats(!showStats)} className="p-2 bg-black/40 border border-white/10 hover:border-accent rounded-lg text-text-secondary hover:text-white transition-colors" title="Toggle UI">
                              {showStats ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                            <button onClick={resetCurrentConversation} className="p-2 bg-black/40 border border-white/10 hover:border-accent rounded-lg text-text-secondary hover:text-white transition-colors" title="Refresh Chat">
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <textarea
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${Math.min(target.scrollHeight, 80)}px`;
                              }}
                              onKeyDown={(e) => { 
                                if (e.key === 'Enter' && !e.shiftKey) { 
                                  e.preventDefault(); 
                                  handleSendMessage(); 
                                  // Reset height after sending
                                  const target = e.target as HTMLTextAreaElement;
                                  setTimeout(() => target.style.height = 'auto', 10);
                                } 
                              }}
                              placeholder="What will you say?"
                              disabled={isLoading}
                              rows={1}
                              className="flex-1 px-3 py-1.5 sm:py-2 bg-black/40 border-none rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 text-[10px] sm:text-xs transition-all font-mono shadow-inner min-w-[10px] resize-none overflow-y-auto max-h-[60px] sm:max-h-[80px]"
                              style={{ minHeight: '28px', height: 'auto' }}
                            />
                            <button
                              onClick={() => handleSendMessage()}
                              disabled={isLoading || !input.trim()}
                              className="shrink-0 px-4 py-2 bg-yellow-400 text-black font-bold rounded-lg uppercase tracking-wider hover:bg-yellow-300 disabled:opacity-50 transition-all flex items-center shadow-[0_0_15px_rgba(255,215,0,0.2)] text-xs"
                            >
                              {isLoading ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'SAY'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* =========================================================
                   STANDARD CHAT LAYOUT
                   ========================================================= */
                <div className="max-w-7xl mx-auto h-full flex flex-col min-h-0 w-full relative">
                  {/* Messages - scrollable */}
                  <div className="flex-1 overflow-y-auto space-y-3 py-3 px-4 sm:px-6 min-h-0 relative z-10">
                    {!activeConversation || activeConversation.messages.length === 0 ? (
                      <div className="text-center py-16">
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="mb-6 flex justify-center">
                          <Image
                            src={getSpriteForMood(personality, 'HAPPY')}
                            alt="Siggy Avatar"
                            width={96}
                            height={96}
                            className="rounded-full bg-black/50 border border-border object-cover shadow-2xl"
                            priority
                          />
                        </motion.div>
                        {conversations.filter(c => c.messages.length > 0).length > 0 ? (
                          <>
                            <h2 className="text-2xl md:text-4xl font-display tracking-wide uppercase mb-2 text-accent">
                              Welcome back, {userName}!
                            </h2>
                            <p className="text-sm text-text-secondary mb-6">
                              Let&apos;s see where you left off~
                            </p>
                            <div className="max-w-md mx-auto space-y-2 mb-8">
                              {conversations.filter(c => c.messages.length > 0).slice(0, 4).map(conv => (
                                <button key={conv.id} onClick={() => setActiveConversationId(conv.id)} className="w-full text-left px-4 py-3 bg-surface border border-border rounded-lg hover:border-accent hover:text-accent transition-all flex items-center gap-3">
                                  <MessageSquare className="w-4 h-4 text-text-secondary shrink-0" />
                                  <span className="text-sm font-mono truncate">{conv.title}</span>
                                  <span className="text-xs text-text-secondary ml-auto shrink-0">{conv.messages.length} msgs</span>
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-text-secondary mb-4">Or start something new:</p>
                          </>
                        ) : (
                          <>
                            <h2 className="text-2xl md:text-4xl font-display tracking-wide uppercase mb-4 text-accent">
                              Welcome to Earth, {userName}!
                            </h2>
                            <p className="text-sm max-w-xl mx-auto text-text-secondary">
                              I&apos;m Siggy! I used to be a cosmic cat across infinite dimensions, but I descended to Earth and became an anime girl to blend in. Pretty clever, right? Anyway, nice to meet you!
                            </p>
                          </>
                        )}
                        {/* Starting Topic Buttons */}
                        <div className="grid grid-cols-2 gap-3 mt-8 max-w-lg mx-auto">
                          <button onClick={() => handleTransform(personality === 'CAT' ? 'ANIME' : 'CAT')} className="px-4 py-3 font-mono text-xs uppercase tracking-wider bg-gradient-to-r from-accent to-yellow-400 text-black shadow-[0_0_15px_rgba(255,215,0,0.2)] hover:from-yellow-400 hover:to-accent rounded-lg transition-all text-left">
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
                      </div>
                    ) : (
                      activeConversation.messages.map((message, index) => (
                        <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} gap-3 items-end`}>
                          {message.role === 'assistant' && (
                            <div className="shrink-0 mb-3">
                              <Image src={getSpriteForMood(personality, message.mood || 'DEFAULT')} alt="Siggy Avatar" width={48} height={48} className="rounded-full bg-black/50 border border-border object-cover" />
                            </div>
                          )}
                          <div className={`max-w-[80%] rounded-xl px-4 py-3 bg-surface border border-border shadow-sm ${message.role === 'assistant' ? 'rounded-bl-none' : 'rounded-br-none'}`}>
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`font-display text-sm md:text-base font-bold uppercase tracking-widest ${message.role === 'assistant' ? 'text-accent' : 'text-text-primary'}`}>
                                {message.role === 'user' ? 'YOU' : 'SIGGY'}
                              </span>
                              {message.mood && <span className={`text-[10px] font-mono px-3 py-1 rounded-full ${moodColors[message.mood]}`}>{message.mood}</span>}
                            </div>
                            {message.role === 'assistant' ? (
                              <TypewriterText text={message.content} isLatest={index === activeConversation.messages.length - 1} className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-text-primary" alreadyAnimated={animatedMessages.current.has(`${activeConversationId}-${index}`)} onAnimationComplete={() => animatedMessages.current.add(`${activeConversationId}-${index}`)} playTyping={playTyping} playVoiceLine={playVoiceLine} personality={personality as 'CAT' | 'ANIME'} />
                            ) : (
                              <p className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-text-primary" dangerouslySetInnerHTML={{ __html: parseMessageContent(message.content) }} />
                            )}

                            {message.role === 'assistant' && (
                              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
                                <button onClick={() => copyMessage(message.content)} className={`p-1.5 rounded ${vnMode ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-surface text-text-secondary hover:text-text-primary'}`} title="Copy">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => toggleLike(index)} className={`p-1.5 rounded ${message.liked ? 'text-accent' : vnMode ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`} title="Like">
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
                            <div className="shrink-0 mb-3 ml-3">
                              {userAvatar ? (
                                <img src={userAvatar} alt="User" className="w-12 h-12 rounded-full bg-black/50 border-2 border-blue-400/50 object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-text-secondary">
                                  <User className="w-6 h-6" />
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
                          <Image src={getSpriteForMood(personality, 'DEFAULT')} alt="Siggy Avatar" width={32} height={32} className="rounded-full bg-black/50 border border-border object-cover" />
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
                  <div className="shrink-0 space-y-3 relative">
                    {/* Collapsible Stats and Suggestions */}
                    <AnimatePresence>
                      {showStats && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-4"
                        >
                          <div className="flex items-center justify-between pb-3">
                            <div className="font-mono text-[10px] text-text-secondary">
                              Mood: <span className={`ml-2 px-2 py-1 rounded-full ${activeConversation ? moodColors[activeConversation.currentMood] : moodColors.DEFAULT}`}>{activeConversation?.currentMood || 'DEFAULT'}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-xs text-text-secondary">Messages: {activeConversation?.messageCount || 0}</span>
                              {contextInfo && <span className={`font-mono text-xs ${contextInfo.estimatedTokens > 80000 ? 'text-red-400' : contextInfo.estimatedTokens > 50000 ? 'text-amber-400' : 'text-text-secondary'}`}>{contextInfo.hasSummary ? 'Summary: ' : 'Memory: '} {Math.round(contextInfo.estimatedTokens / 1000)}k keys</span>}
                            </div>
                          </div>
                          {/* Suggestions Grid (2x2) */}
                          {activeConversation && activeConversation.messages.length > 0 && !isLoading && (
                            <div className="grid grid-cols-2 gap-3 mt-4 mb-2">
                              <button onClick={() => handleTransform(personality === 'CAT' ? 'ANIME' : 'CAT')} className="px-4 py-3 font-mono text-xs uppercase tracking-wider bg-gradient-to-r from-accent to-yellow-400 text-black shadow-[0_0_15px_rgba(255,215,0,0.2)] hover:from-yellow-400 hover:to-accent rounded-lg transition-all text-left">
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
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Input */}
                    <div className="flex gap-2 pt-2 items-center relative z-20">
                      <button onClick={() => setShowStats(!showStats)} className="p-3 bg-surface hover:bg-surface/80 border border-border rounded-lg text-text-secondary hover:text-accent transition-colors" title="Toggle Stats">
                        {showStats ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                      <button onClick={resetCurrentConversation} className="p-3 bg-surface hover:bg-surface/80 border border-border rounded-lg text-text-secondary hover:text-accent transition-colors hidden sm:block" title="Refresh Chat">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${Math.min(target.scrollHeight, 80)}px`;
                        }}
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter' && !e.shiftKey) { 
                            e.preventDefault(); 
                            handleSendMessage(); 
                            const target = e.target as HTMLTextAreaElement;
                            setTimeout(() => target.style.height = 'auto', 10);
                          } 
                        }}
                        placeholder="Type your message..."
                        disabled={isLoading}
                        rows={1}
                        className="flex-1 px-3 py-1.5 sm:py-2 border-none rounded-lg focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 font-mono text-[10px] sm:text-xs bg-surface text-text-primary placeholder:text-text-secondary/50 shadow-inner resize-none overflow-y-auto max-h-[60px] sm:max-h-[80px]"
                        style={{ minHeight: '28px', height: 'auto' }}
                      />
                      <button onClick={() => handleSendMessage()} disabled={isLoading || !input.trim()} className="px-4 py-2 bg-yellow-400 text-black font-bold hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-mono text-xs uppercase transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,215,0,0.2)] disabled:shadow-none">
                        {isLoading ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" />Send</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                      <img src={userAvatar!} alt="Your Custom Avatar" className="w-full h-full object-cover" />
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
                    className="w-full py-3 px-4 bg-gradient-to-r from-accent to-yellow-400 text-black font-bold uppercase tracking-wider font-mono text-sm rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,215,0,0.2)]"
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
  );
}
