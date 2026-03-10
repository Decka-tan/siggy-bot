'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Send, BookOpen } from 'lucide-react';

type MoodState = 'PLAYFUL' | 'MYSTERIOUS' | 'CHAOTIC' | 'PROFOUND';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mood?: MoodState;
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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState<MoodState>('PLAYFUL');
  const [messageCount, setMessageCount] = useState(0);
  const [contextInfo, setContextInfo] = useState<ContextInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

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
      setContextInfo(data.contextInfo || null);
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

  const resetConversation = async () => {
    // Also reset server-side context
    try {
      await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'web-user' }),
      });
    } catch (error) {
      console.error('Failed to reset server context:', error);
    }

    setMessages([]);
    setCurrentMood('PLAYFUL');
    setMessageCount(0);
    setInput('');
    setContextInfo(null);
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex flex-col pt-24">
      {/* Back Button + Mode Switch */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link href="/">
            <button className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors font-mono text-xs uppercase tracking-wider">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
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
            {messages.length === 0 && (
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
            )}

            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                    message.role === 'user'
                      ? 'bg-surface border border-border'
                      : 'bg-surface border border-border'
                  }`}
                >
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
            ))}

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
              Mood: <span className={`ml-2 px-2 py-1 rounded-full ${moodColors[currentMood]}`}>{currentMood}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-text-secondary">
                Messages: {messageCount}
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
                onClick={resetConversation}
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
  );
}
