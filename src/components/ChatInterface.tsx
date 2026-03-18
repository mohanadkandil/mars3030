import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { initSession, queryKnowledgeBase, getToolDescriptions } from '../services/mcpClient';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

const SUGGESTED_PROMPTS = [
  'What crops grow best on Mars and why?',
  'Optimal temperature for growing potatoes in low gravity?',
  'Water requirements per crop growth stage',
  'What happens if the water recycling system fails?',
  'Nutritional requirements for 4 astronauts over 450 days',
  'How to handle a dust storm affecting solar panels?',
  'Best crop rotation strategy for a 120m² greenhouse',
  'How does Martian soil affect plant growth?',
];

let msgId = 0;
const nextMsgId = () => `msg-${++msgId}`;

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null); // null = not tried
  const [connecting, setConnecting] = useState(false);
  const [tools, setTools] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Connect to MCP on mount
  const connect = useCallback(async () => {
    setConnecting(true);
    setMessages([{
      id: nextMsgId(),
      role: 'system',
      content: 'Connecting to Mars Crop Knowledge Base...',
      timestamp: new Date(),
      loading: true,
    }]);

    const ok = await initSession();
    setConnected(ok);
    setConnecting(false);

    if (ok) {
      const toolDescs = await getToolDescriptions();
      setTools(toolDescs);
      setMessages([{
        id: nextMsgId(),
        role: 'system',
        content: `Connected to Mars Crop Knowledge Base!\n\n${toolDescs.length} tool${toolDescs.length !== 1 ? 's' : ''} available. Ask me anything about Martian agriculture, crop management, environmental conditions, or greenhouse operations.`,
        timestamp: new Date(),
      }]);
    } else {
      setMessages([{
        id: nextMsgId(),
        role: 'system',
        content: 'Could not connect to the MCP Knowledge Base. This may be due to CORS restrictions (browser → MCP endpoint). For the hackathon, you can:\n\n1. **Use a CORS proxy** or backend relay\n2. **Run via Kiro IDE** which has native MCP support\n3. **Use the offline mode** — try asking questions and I\'ll provide guidance based on built-in crop data\n\nYou can still type questions to test the interface!',
        timestamp: new Date(),
      }]);
    }
  }, []);

  useEffect(() => {
    connect();
  }, [connect]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: nextMsgId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    const loadingMsg: ChatMessage = {
      id: nextMsgId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');

    try {
      const response = await queryKnowledgeBase(text.trim());
      setMessages(prev =>
        prev.map(m => m.id === loadingMsg.id
          ? { ...m, content: response, loading: false }
          : m
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === loadingMsg.id
          ? { ...m, content: 'Failed to get a response. The knowledge base may be temporarily unavailable.', loading: false }
          : m
        )
      );
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="glass rounded-2xl p-3 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm">
            🤖
          </div>
          <div>
            <h3 className="text-sm font-semibold text-mars-300">Mars Crop AI Assistant</h3>
            <p className="text-[10px] text-mars-600">Powered by Syngenta Knowledge Base via MCP</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              connected === null ? 'bg-mars-600' :
              connected ? 'bg-bio-400' : 'bg-alert-400'
            }`}>
              {connecting && (
                <motion.div
                  className="w-2 h-2 rounded-full bg-blue-400"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
            </div>
            <span className="text-[10px] text-mars-500">
              {connecting ? 'Connecting...' : connected ? 'Connected' : connected === false ? 'Offline' : ''}
            </span>
          </div>
          {/* Reconnect button */}
          {connected === false && (
            <button
              onClick={connect}
              className="text-[10px] px-2 py-0.5 rounded bg-mars-800 text-mars-400 hover:text-mars-300 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Available tools info */}
      {tools.length > 0 && (
        <div className="mb-2 shrink-0">
          <details className="text-[10px]">
            <summary className="text-mars-500 cursor-pointer hover:text-mars-400 transition-colors">
              {tools.length} Knowledge Base tools available
            </summary>
            <div className="mt-1 p-2 rounded-lg bg-mars-900/50 text-mars-500 space-y-0.5 max-h-20 overflow-y-auto">
              {tools.map((t, i) => (
                <div key={i} dangerouslySetInnerHTML={{ __html: t.replace(/\*\*(.*?)\*\*/g, '<strong class="text-mars-400">$1</strong>') }} />
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-rust-500/30 to-rust-400/20 border border-rust-500/20'
                  : msg.role === 'system'
                  ? 'bg-mars-800/50 border border-mars-700/30'
                  : 'bg-mars-850/60 border border-purple-500/10'
              }`}>
                {/* Role label */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{
                    color: msg.role === 'user' ? '#f97316' : msg.role === 'system' ? '#64748b' : '#a78bfa',
                  }}>
                    {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'AI Assistant'}
                  </span>
                  <span className="text-[8px] text-mars-700">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {/* Content */}
                {msg.loading ? (
                  <div className="flex items-center gap-1.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-purple-400" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-purple-400" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-purple-400" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                  </div>
                ) : (
                  <div className="text-xs text-mars-300 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Suggested prompts — show only when no user messages yet */}
        {messages.filter(m => m.role === 'user').length === 0 && (
          <div className="pt-2">
            <p className="text-[10px] text-mars-600 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg bg-mars-800/50 border border-mars-700/30 text-mars-400 hover:text-mars-300 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all duration-200 text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-3 shrink-0 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about Mars agriculture, crop data, greenhouse operations..."
          className="flex-1 bg-mars-900/60 border border-mars-700/40 rounded-xl px-4 py-2.5 text-xs text-mars-300 placeholder:text-mars-700 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/10"
        >
          Send
        </button>
      </form>
    </div>
  );
}
