import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import ceresApi, { type Source } from '../services/ceresApi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Source[];
  timestamp: Date;
  loading?: boolean;
}

const SUGGESTED_PROMPTS = [
  'What crops grow best on Mars?',
  'Optimal temperature for potatoes?',
  'Water requirements per growth stage',
  'Nutritional needs for 4 astronauts',
  'Best crop rotation strategy',
  'How does Martian soil affect growth?',
];

let msgId = 0;
const nextMsgId = () => `msg-${++msgId}`;

function SourceCard({ source, index }: { source: Source; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-mars-700/30 rounded-lg overflow-hidden bg-mars-900/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-mars-800/30 transition-colors"
      >
        <span className="text-emerald-400 text-xs">📄</span>
        <span className="text-[10px] text-mars-300 flex-1 truncate">
          {source.filename || `Source ${index + 1}`}
        </span>
        <span className="text-mars-500 text-[10px]">{expanded ? '▼' : '▶'}</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 border-t border-mars-700/20 text-[10px] text-mars-400 max-h-40 overflow-y-auto">
              {source.content.slice(0, 500)}
              {source.content.length > 500 && '...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setMessages([{
      id: nextMsgId(),
      role: 'system',
      content: 'Initializing CERES...',
      timestamp: new Date(),
      loading: true,
    }]);

    const ok = await ceresApi.healthCheck();
    setConnected(ok);
    setConnecting(false);

    if (ok) {
      const status = await ceresApi.getStatus();
      setMessages([{
        id: nextMsgId(),
        role: 'system',
        content: `**CERES online** — ${status?.tagline || 'Crop Environment Resource & Evaluation System'}\n\nConnected to Syngenta Knowledge Base. Ask anything about Mars agriculture!`,
        timestamp: new Date(),
      }]);
    } else {
      setMessages([{
        id: nextMsgId(),
        role: 'system',
        content: 'Could not connect to CERES.\n\nStart the backend:\n```bash\ncd backend && ./run.sh\n```',
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
      const response = await ceresApi.chat(text.trim());
      setMessages(prev =>
        prev.map(m => m.id === loadingMsg.id
          ? { ...m, content: response.response, sources: response.sources, loading: false }
          : m
        )
      );
    } catch {
      try {
        const fallback = await ceresApi.queryKnowledgeBase(text.trim());
        setMessages(prev =>
          prev.map(m => m.id === loadingMsg.id
            ? { ...m, content: fallback.content, sources: fallback.sources, loading: false }
            : m
          )
        );
      } catch {
        setMessages(prev =>
          prev.map(m => m.id === loadingMsg.id
            ? { ...m, content: 'Failed to connect. Is the backend running?', loading: false }
            : m
          )
        );
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="glass rounded-2xl p-3 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white">
            C
          </div>
          <div>
            <h3 className="text-sm font-semibold text-mars-300">CERES</h3>
            <p className="text-[10px] text-mars-600">Crop Environment Resource & Evaluation System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              connected === null ? 'bg-mars-600' :
              connected ? 'bg-emerald-400' : 'bg-alert-400'
            }`}>
              {connecting && (
                <motion.div
                  className="w-2 h-2 rounded-full bg-teal-400"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
            </div>
            <span className="text-[10px] text-mars-500">
              {connecting ? 'Connecting...' : connected ? 'Online' : connected === false ? 'Offline' : ''}
            </span>
          </div>
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
              <div className={`max-w-[90%] rounded-xl px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-rust-500/30 to-rust-400/20 border border-rust-500/20'
                  : msg.role === 'system'
                  ? 'bg-mars-800/50 border border-mars-700/30'
                  : 'bg-mars-850/60 border border-emerald-500/10'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{
                    color: msg.role === 'user' ? '#f97316' : msg.role === 'system' ? '#64748b' : '#34d399',
                  }}>
                    {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'CERES'}
                  </span>
                  <span className="text-[8px] text-mars-700">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {msg.loading ? (
                  <div className="flex items-center gap-1.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-mars-300 leading-relaxed prose prose-invert prose-xs max-w-none prose-headings:text-mars-200 prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:text-emerald-400 prose-code:bg-mars-900/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-mars-900/70 prose-pre:border prose-pre:border-mars-700/30 prose-strong:text-mars-200">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-mars-700/20">
                        <p className="text-[9px] text-mars-500 uppercase tracking-wider mb-2">
                          📚 Sources ({msg.sources.length})
                        </p>
                        <div className="space-y-1.5">
                          {msg.sources.map((source, i) => (
                            <SourceCard key={i} source={source} index={i} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.filter(m => m.role === 'user').length === 0 && (
          <div className="pt-2">
            <p className="text-[10px] text-mars-600 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg bg-mars-800/50 border border-mars-700/30 text-mars-400 hover:text-mars-300 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200 text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask CERES about Mars agriculture..."
          className="flex-1 bg-mars-900/60 border border-mars-700/40 rounded-xl px-4 py-2.5 text-xs text-mars-300 placeholder:text-mars-700 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/10"
        >
          Send
        </button>
      </form>
    </div>
  );
}
