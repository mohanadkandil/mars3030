import { motion } from 'framer-motion';
import type { NutrientTarget } from '../types';

interface Props {
  dailyCalories: number;
  dailyProtein: number;
  dailyVitaminC: number;
  totalHarvested: number;
  day: number;
  crewTarget: NutrientTarget;
}

function NutrientBar({ label, value, target, unit, color }: {
  label: string; value: number; target: number; unit: string; color: string;
}) {
  const pct = Math.min(150, (value / target) * 100);
  const isMet = pct >= 80;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium text-mars-400">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold tabular-nums" style={{ color: isMet ? color : '#ef4444' }}>
            {Math.round(value).toLocaleString()}
          </span>
          <span className="text-[10px] text-mars-600">/ {target.toLocaleString()} {unit}</span>
        </div>
      </div>
      <div className="h-2 bg-mars-800 rounded-full overflow-hidden relative">
        {/* Target line at 100% */}
        <div className="absolute right-0 top-0 h-full w-px bg-mars-500" style={{ left: `${Math.min(100, (100 / Math.max(pct, 100)) * 100)}%` }} />
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: isMet ? color : '#ef4444' }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <div className="text-right mt-0.5">
        <span className={`text-[10px] font-medium ${isMet ? 'text-bio-400' : 'text-alert-400'}`}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

export default function NutritionPanel({ dailyCalories, dailyProtein, dailyVitaminC, totalHarvested, day, crewTarget }: Props) {
  const overallScore = Math.round(
    ((Math.min(1, dailyCalories / crewTarget.dailyCalories) +
      Math.min(1, dailyProtein / crewTarget.dailyProtein) +
      Math.min(1, dailyVitaminC / crewTarget.dailyVitaminC)) / 3) * 100
  );

  const scoreColor = overallScore >= 80 ? '#22c55e' : overallScore >= 50 ? '#eab308' : '#ef4444';

  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col">
      <h2 className="text-sm font-semibold text-mars-300 uppercase tracking-wider mb-3">Crew Nutrition</h2>

      {/* Score circle */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(68,64,60,0.3)" strokeWidth="4" />
            <motion.circle
              cx="32" cy="32" r="28"
              fill="none"
              stroke={scoreColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${overallScore * 1.76} 176`}
              initial={{ strokeDasharray: '0 176' }}
              animate={{ strokeDasharray: `${overallScore * 1.76} 176` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold tabular-nums" style={{ color: scoreColor }}>
              {overallScore}
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs text-mars-500">Nutrition Score</div>
          <div className="text-xs text-mars-400 mt-1">
            {overallScore >= 80 ? '✅ Crew well-nourished' :
             overallScore >= 50 ? '⚠️ Partial deficit' :
             '🚨 Critical deficit'}
          </div>
        </div>
      </div>

      <NutrientBar label="Calories" value={dailyCalories} target={crewTarget.dailyCalories} unit="kcal" color="#eab308" />
      <NutrientBar label="Protein" value={dailyProtein} target={crewTarget.dailyProtein} unit="g" color="#0ea5e9" />
      <NutrientBar label="Vitamin C" value={dailyVitaminC} target={crewTarget.dailyVitaminC} unit="mg" color="#fb923c" />

      <div className="mt-auto pt-3 border-t border-mars-800 flex justify-between text-xs text-mars-500">
        <span>Total harvested: <strong className="text-mars-300">{Math.round(totalHarvested)} kg</strong></span>
        <span>Day {day} / 450</span>
      </div>
    </div>
  );
}
