import { motion, AnimatePresence } from 'framer-motion';
import type { PendingCrewAction } from '../types';
import { SEED_LIBRARY } from '../data/crops';

interface Props {
  actions: PendingCrewAction[];
  onConfirm: (actionId: string) => void;
  onDismiss: (actionId: string) => void;
  onConfirmAll: () => void;
}

function getCropEmoji(cropId: string) {
  return SEED_LIBRARY.find(c => c.id === cropId)?.emoji || '🌱';
}

function ActionCard({ action, onConfirm, onDismiss }: {
  action: PendingCrewAction;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const isHarvest = action.type === 'harvest';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      className="bg-mars-900/90 border border-mars-700 rounded-xl p-4 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
          isHarvest ? 'bg-bio-500/20' : 'bg-sun-500/20'
        }`}>
          {isHarvest ? '🌾' : getCropEmoji(action.newCropId || action.cropId)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isHarvest
                ? 'bg-bio-500/20 text-bio-400'
                : 'bg-sun-500/20 text-sun-400'
            }`}>
              {isHarvest ? 'Harvest' : 'Replant'}
            </span>
            <span className="text-[10px] text-mars-500">Sol {action.day}</span>
          </div>

          <p className="text-sm text-white mb-1">{action.description}</p>
          <p className="text-xs text-mars-400 leading-relaxed">{action.reasoning}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 ml-15">
        <button
          onClick={onConfirm}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
            isHarvest
              ? 'bg-bio-500/30 text-bio-300 hover:bg-bio-500/50 active:scale-95'
              : 'bg-sun-500/30 text-sun-300 hover:bg-sun-500/50 active:scale-95'
          }`}
        >
          {isHarvest ? '✅ Harvest Now' : '🌱 Plant Now'}
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2 rounded-lg text-xs font-medium bg-mars-800 text-mars-400 hover:bg-mars-700 hover:text-mars-300 transition-all active:scale-95"
        >
          Skip
        </button>
      </div>
    </motion.div>
  );
}

export default function CrewActionAlert({ actions, onConfirm, onDismiss, onConfirmAll }: Props) {
  if (actions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="glass rounded-t-2xl p-4 border-b border-alert-500/30">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-alert-500/20 flex items-center justify-center">
                  <span className="text-xl">👨‍🚀</span>
                </div>
                {/* Pulsing dot */}
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-alert-400 rounded-full border-2 border-mars-950"
                />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Crew Action Required
                </h2>
                <p className="text-xs text-mars-400">
                  {actions.length} task{actions.length > 1 ? 's' : ''} awaiting crew confirmation
                </p>
              </div>
            </div>
          </div>

          {/* Action list */}
          <div className="glass rounded-b-2xl overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {actions.map(action => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onConfirm={() => onConfirm(action.id)}
                  onDismiss={() => onDismiss(action.id)}
                />
              ))}
            </AnimatePresence>

            {/* Batch action */}
            {actions.length > 1 && (
              <motion.button
                layout
                onClick={onConfirmAll}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-bio-500/30 to-sun-500/30 text-white hover:from-bio-500/50 hover:to-sun-500/50 transition-all active:scale-[0.98] border border-mars-700"
              >
                ✅ Confirm All ({actions.length} tasks)
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
