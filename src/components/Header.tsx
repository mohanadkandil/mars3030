import { motion } from 'framer-motion';
import { MISSION_DAYS } from '../data/crops';

interface Props {
  day: number;
  solHour: number;
  running: boolean;
  speed: number;
  onToggle: () => void;
  onSpeedChange: (speed: number) => void;
  activeEventCount: number;
}

export default function Header({ day, solHour, running, speed, onToggle, onSpeedChange, activeEventCount }: Props) {
  const progress = (day / MISSION_DAYS) * 100;
  const isDaytime = solHour >= 6 && solHour < 18;
  const sunProgress = isDaytime ? (solHour - 6) / 12 : 0;

  return (
    <header className="relative rounded-2xl px-5 py-3 flex items-center gap-6 bg-gradient-to-r from-mars-900/90 via-mars-800/80 to-mars-900/90 backdrop-blur-xl border border-rust-500/30 shadow-lg shadow-rust-500/10 ring-1 ring-rust-400/10">
      {/* Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rust-400 to-rust-500 flex items-center justify-center text-lg shadow-lg">
          🌱
        </div>
        <div>
          <h1 className="text-base font-bold text-mars-300 leading-tight">AresFarm</h1>
          <p className="text-[10px] text-mars-600">Mars Greenhouse AI</p>
        </div>
      </div>

      {/* Mission progress */}
      <div className="flex-1 mx-4">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs text-mars-500">Mission Progress</span>
          <span className="text-xs font-mono text-mars-400 tabular-nums">
            SOL {day} / {MISSION_DAYS} · {isDaytime ? '☀️' : '🌙'} {String(Math.floor(solHour)).padStart(2, '0')}:{String(Math.round((solHour % 1) * 60)).padStart(2, '0')}
          </span>
        </div>
        <div className="h-2 bg-mars-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-rust-500 via-rust-400 to-bio-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Active events badge */}
      {activeEventCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-alert-500/20 border border-alert-500/30"
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-alert-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
          <span className="text-[10px] font-semibold text-alert-300">{activeEventCount} ALERT{activeEventCount > 1 ? 'S' : ''}</span>
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Speed selector */}
        <div className="flex rounded-lg overflow-hidden border border-mars-700">
          {[1, 3, 10].map(s => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                speed === s
                  ? 'bg-rust-500 text-white'
                  : 'bg-mars-900 text-mars-500 hover:text-mars-300'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Play/Pause */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggle}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            running
              ? 'bg-mars-700 text-mars-300 hover:bg-mars-600'
              : 'bg-gradient-to-r from-rust-500 to-rust-400 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {running ? '⏸ Pause' : '▶ Start'}
        </motion.button>
      </div>
    </header>
  );
}
