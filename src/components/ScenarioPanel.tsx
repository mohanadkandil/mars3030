import { motion } from 'framer-motion';
import { SCENARIO_TEMPLATES } from '../data/crops';

interface Props {
  onInject: (type: string, name: string, description: string, severity: number, duration: number) => void;
  activeEventTypes: string[];
  disabled: boolean;
}

export default function ScenarioPanel({ onInject, activeEventTypes, disabled }: Props) {
  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col">
      <h2 className="text-sm font-semibold text-mars-300 uppercase tracking-wider mb-3">Scenario Injection</h2>
      <p className="text-[11px] text-mars-500 mb-3">Trigger events to test the AI agent's crisis response.</p>

      <div className="space-y-2 flex-1 overflow-y-auto">
        {SCENARIO_TEMPLATES.map(scenario => {
          const isActive = activeEventTypes.includes(scenario.type);
          return (
            <motion.button
              key={scenario.type}
              whileHover={!isActive && !disabled ? { scale: 1.02 } : {}}
              whileTap={!isActive && !disabled ? { scale: 0.98 } : {}}
              onClick={() => {
                if (!isActive && !disabled) {
                  onInject(scenario.type, scenario.name, scenario.description, scenario.severity, scenario.duration);
                }
              }}
              disabled={isActive || disabled}
              className={`w-full text-left rounded-xl p-3 border transition-all ${
                isActive
                  ? 'bg-alert-500/15 border-alert-500/40 cursor-not-allowed'
                  : disabled
                    ? 'bg-mars-900/50 border-mars-700/30 cursor-not-allowed opacity-50'
                    : 'bg-mars-900/50 border-mars-700/50 hover:border-rust-400/50 hover:bg-mars-800/50 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{scenario.icon}</span>
                <span className="text-xs font-semibold text-mars-300">{scenario.name}</span>
                {isActive && (
                  <motion.span
                    className="text-[10px] px-1.5 py-0.5 rounded bg-alert-500/20 text-alert-300 ml-auto"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    ACTIVE
                  </motion.span>
                )}
                {!isActive && (
                  <div className="ml-auto flex gap-0.5">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i <= scenario.severity ? 'bg-rust-400' : 'bg-mars-700'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-mars-500 leading-relaxed">{scenario.description}</p>
              <p className="text-[10px] text-mars-600 mt-1">Duration: {scenario.duration} sols</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
