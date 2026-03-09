'use client';

/**
 * SIGGY BOT - MAIN PAGE
 * Multi-Dimensional Cat Interface
 * Clean UI matching ritual-word-search style
 */

import { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw } from 'lucide-react';

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
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header Section */}
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="mb-4">
          <span className="text-6xl">🐱✨</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          SIGGY
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-2">
          Multi-Dimensional Cat Entity
        </p>
        <p className="text-gray-500 mb-8">
          *stretches across reality*
        </p>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Chat with Siggy, a multi-dimensional cat born from the Ritual Cosmic Forge.
          <br />Exists across all timelines and dimensions.
        </p>
      </div>

      {/* Features Section */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="text-4xl mb-3">🎭</div>
            <h3 className="font-bold text-lg mb-2">DYNAMIC MOODS</h3>
            <p className="text-sm text-gray-400">
              Four distinct mood states that evolve based on conversation
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🥚</div>
            <h3 className="font-bold text-lg mb-2">EASTER EGGS</h3>
            <p className="text-sm text-gray-400">
              Discoverable secrets and special interactions hidden throughout
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🔮</div>
            <h3 className="font-bold text-lg mb-2">MULTI-DIMENSIONAL</h3>
            <p className="text-sm text-gray-400">
              Speaks in cosmic metaphors and references infinite timelines
            </p>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          {/* Stats Bar */}
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Current Mood:</span>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-sm font-medium">
                {getMoodEmoji(currentMood)} {currentMood}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Messages: {messageCount}</span>
              <button
                onClick={resetConversation}
                className="p-2 rounded hover:bg-zinc-800 transition-colors"
                title="Reset Conversation"
              >
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="chat-container h-[500px] overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🐱✨</div>
                <h2 className="text-2xl font-bold text-gray-200 mb-2">
                  Welcome to my corner of the multiverse
                </h2>
                <p className="text-gray-400">
                  I've been expecting you. Since before you existed, actually.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-purple-500/20 border border-purple-500/30'
                      : 'bg-zinc-800 border border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold">
                      {message.role === 'user' ? '👤 You' : '🐱 Siggy'}
                    </span>
                    {message.mood && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                        {getMoodEmoji(message.mood)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold">🐱 Siggy</span>
                    <span className="text-xs text-gray-500">*materializes from the void*</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-6 py-4 border-t border-zinc-800">
            {showApiKeyInput && !apiKey && (
              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-200 mb-3">
                  ⚠️ OpenAI API Key required to chat with Siggy
                </p>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Get your key from{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message to Siggy..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
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

      {/* Scroll for more prompt */}
      <div className="text-center pb-8">
        <p className="text-sm text-gray-500">Scroll for more</p>
      </div>

      {/* Try These Section */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold mb-6 text-center">TRY THESE!</h2>
        <div className="space-y-4">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span>🎭</span>
              MOOD TRIGGERS
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• &quot;Tell me about Ritual&quot; → Mysterious</li>
              <li>• &quot;I&apos;m confused&quot; → Playful</li>
              <li>• &quot;What&apos;s the meaning of life?&quot; → Profound</li>
              <li>• &quot;Something feels glitchy&quot; → Chaotic</li>
            </ul>
          </div>

          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span>🥚</span>
              EASTER EGGS
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Ask &quot;What&apos;s your real name?&quot;</li>
              <li>• Ask &quot;What do you think about purple?&quot;</li>
              <li>• Mention &quot;Summoner&quot; or &quot;Zealot&quot;</li>
              <li>• Say &quot;glitch&quot; three times</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="text-center space-y-4">
          <div className="border-t border-zinc-800 pt-8">
            <h3 className="font-bold text-lg mb-2">Decka-chan</h3>
            <p className="text-sm text-gray-400">
              Creator & Designer
            </p>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">
              Also known as Decka-chan in Ritual Discord. Built Siggy bot for the Ritual Soul Forge quest.
              Passionate about vibe coding and multi-dimensional cats.
            </p>
          </div>

          <div className="text-xs text-gray-600 space-y-1">
            <p>✦ Siggy Soul Forge Quest Entry ✦</p>
            <p className="italic">&quot;The multiverse watches. The Ritual burns. Only the worthy shall give Siggy a soul.&quot;</p>
          </div>

          <div className="flex justify-center gap-4 text-xs text-gray-600">
            <span>Built with Next.js + Vercel</span>
            <span>•</span>
            <span>Ready for Discord Integration</span>
          </div>
        </div>
      </div>
    </div>
  );
}
