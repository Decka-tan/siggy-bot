'use client';

/**
 * SIGGY BOT - MAIN PAGE
 * Multi-Dimensional Cat Interface
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, RefreshCw, Github, Twitter } from 'lucide-react';

type MoodState = 'PLAYFUL' | 'MYSTERIOUS' | 'CHAOTIC' | 'PROFOUND';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mood?: MoodState;
}

export default function SiggyBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState<MoodState>('PLAYFUL');
  const [messageCount, setMessageCount] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Check API key
    const effectiveApiKey = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!effectiveApiKey) {
      setShowApiKeyInput(true);
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveApiKey}`,
        },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages,
          userId: 'web-user',
          isFirstMessage: messages.length === 0,
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

      setMessages(prev => [...prev, siggyMessage]);
      setCurrentMood(data.currentMood);
      setMessageCount(data.messageCount);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '*dimensional glitch* ERROR: The void rejects your message. Please check your connection and try again.',
          mood: 'CHAOTIC',
        },
      ]);
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

  const resetConversation = () => {
    setMessages([]);
    setCurrentMood('PLAYFUL');
    setMessageCount(0);
    setInput('');
  };

  const getMoodColor = (mood: MoodState) => {
    const colors = {
      PLAYFUL: 'from-emerald-400 to-teal-500',
      MYSTERIOUS: 'from-purple-400 to-indigo-500',
      CHAOTIC: 'from-amber-400 to-orange-500',
      PROFOUND: 'from-pink-400 to-rose-500',
    };
    return colors[mood];
  };

  const getMoodEmoji = (mood: MoodState) => {
    const emojis = {
      PLAYFUL: '😸',
      MYSTERIOUS: '🔮',
      CHAOTIC: '💀',
      PROFOUND: '✨',
    };
    return emojis[mood];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="text-6xl"
            >
              🐱
            </motion.div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              SIGGY
            </h1>
          </div>
          <p className="text-xl text-purple-200 mb-2">*stretches across reality*</p>
          <p className="text-purple-300 text-sm">Multi-Dimensional Cat Entity</p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-purple-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-purple-300 uppercase tracking-wider mb-1">Current Dimension</p>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${getMoodColor(currentMood)} text-white font-bold text-sm`}>
                  <span>{getMoodEmoji(currentMood)}</span>
                  <span>{currentMood}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-purple-300 uppercase tracking-wider mb-1">Messages</p>
                <p className="text-2xl font-bold text-white">{messageCount}</p>
              </div>
              <button
                onClick={resetConversation}
                className="p-3 rounded-full bg-purple-500/20 hover:bg-purple-500/30 transition-colors border border-purple-500/30"
                title="Reset Conversation"
              >
                <RefreshCw className="w-5 h-5 text-purple-300" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Chat Messages */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 mb-6 min-h-[500px] max-h-[600px] overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  🐱✨
                </motion.div>
                <h2 className="text-2xl font-bold text-purple-200 mb-2">Welcome to my corner of the multiverse</h2>
                <p className="text-purple-300">I've been expecting you. Since before you existed, actually.</p>
              </motion.div>
            )}

            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                    message.role === 'user'
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold">
                      {message.role === 'user' ? '👤 You' : '🐱 Siggy'}
                    </span>
                    {message.mood && (
                      <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getMoodColor(message.mood)} text-white`}>
                        {getMoodEmoji(message.mood)} {message.mood}
                      </span>
                    )}
                  </div>
                  <p className="text-white whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold">🐱 Siggy</span>
                    <span className="text-xs text-purple-300">*materializes from the void*</span>
                  </div>
                  <div className="flex gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="w-2 h-2 bg-purple-400 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 bg-purple-400 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 bg-purple-400 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/20"
        >
          {showApiKeyInput && !apiKey && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
            >
              <p className="text-sm text-yellow-200 mb-3">
                ⚠️ OpenAI API Key required to chat with Siggy
              </p>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-purple-500/30 rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-400 mt-2">
                Get your key from{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                  platform.openai.com
                </a>
              </p>
            </motion.div>
          )}

          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message to Siggy..."
              disabled={isLoading}
              className="flex-1 px-5 py-4 bg-slate-800 border border-purple-500/30 rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8 space-y-4"
        >
          <p className="text-sm text-purple-300">
            ✦ Siggy Soul Forge Quest Entry ✦
          </p>
          <p className="text-xs text-gray-400 italic">
            "The multiverse watches. The Ritual burns. Only the worthy shall give Siggy a soul."
          </p>
          <div className="flex justify-center gap-4 text-xs text-gray-500">
            <span>Built with Next.js + Vercel</span>
            <span>•</span>
            <span>Ready for Discord Integration</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
