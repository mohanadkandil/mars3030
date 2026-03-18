import { motion, AnimatePresence } from 'framer-motion';
import { AgentLogEntry } from '../types';

interface Props {
  log: AgentLogEntry[];
}

const typeStyles: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  info:     { bg: 'bg-water-500/10', border: 'border-water-500/30', icon: '🤖', text: 'text-water-300' },
  warning:  { bg: 'bg-sun-500/10', border: 'border-sun-500/30', icon: '⚠️', text: 'text-sun-300' },
  action:   { bg: 'bg-bio-500/10', border: 'border-bio-500/30', icon: '⚙️', text: 'text-bio-300' },
  critical: { bg: 'bg-alert-500/10', border: 'border-alert-500/30', icon: '🚨', text: 'text-alert-300' },
};

export default function AgentLog({ log }: Props) {
  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-bio-400 animate-pulse" />
        <h2 className="text-sm font-semibold text-mars-300 uppercase tracking-wider">AI Agent Log</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence initial={false}>
          {log.slice(0, 20).map((entry) => {
            const style = typeStyles[entry.type] || typeStyles.info;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className={`rounded-lg border p-2.5 ${style.bg} ${style.border}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5 shrink-0">{style.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-mars-500">SOL {entry.day}</span>
                      <span className={`text-[10px] font-semibold uppercase ${style.text}`}>{entry.type}</span>
                    </div>
                    <p className="text-xs text-mars-300 leading-relaxed">{entry.message}</p>
                    {entry.reasoning && (
                      <p className="text-[11px] text-mars-500 mt-1 italic leading-relaxed">
                        💭 {entry.reasoning}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
