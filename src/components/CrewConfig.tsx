import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Astronaut, Gender, ActivityLevel, NutrientTarget } from '../types';
import { calculateAstronautNeeds } from '../data/crew';

interface Props {
  crew: Astronaut[];
  crewTarget: NutrientTarget;
  onUpdateCrew: (crew: Astronaut[]) => void;
}

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  low: 'Low — Lab work',
  moderate: 'Moderate — EVA duty',
  high: 'High — Construction',
};

const ACTIVITY_COLORS: Record<ActivityLevel, string> = {
  low: 'bg-water-500/15 text-water-300 border-water-500/30',
  moderate: 'bg-sun-500/15 text-sun-300 border-sun-500/30',
  high: 'bg-alert-500/15 text-alert-300 border-alert-500/30',
};

function AstronautCard({ astronaut, onUpdate, onRemove }: {
  astronaut: Astronaut;
  onUpdate: (a: Astronaut) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const needs = calculateAstronautNeeds(astronaut);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="glass rounded-2xl p-5 border border-mars-800/50"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-mars-800/80 flex items-center justify-center text-3xl">
            {astronaut.gender === 'female' ? '👩‍🚀' : '👨‍🚀'}
          </div>
          <div>
            {editing ? (
              <input
                className="bg-mars-800 text-white text-lg font-semibold rounded-lg px-3 py-1 w-52 border border-mars-700 focus:border-rust-400 outline-none"
                value={astronaut.name}
                onChange={e => onUpdate({ ...astronaut, name: e.target.value })}
              />
            ) : (
              <div className="text-lg font-bold text-white">{astronaut.name}</div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ACTIVITY_COLORS[astronaut.activityLevel]}`}>
                {ACTIVITY_LABELS[astronaut.activityLevel]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(e => !e)}
            className="text-sm px-4 py-2 rounded-lg bg-mars-800 text-mars-300 hover:text-white hover:bg-mars-700 transition font-medium"
          >
            {editing ? '✓ Done' : '✎ Edit'}
          </button>
          <button
            onClick={onRemove}
            className="text-sm px-3 py-2 rounded-lg bg-mars-800 text-alert-400 hover:text-alert-300 hover:bg-alert-500/10 transition"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Stats row — always visible */}
      <div className="flex items-center gap-4 mb-4 text-sm text-mars-400">
        <span>{astronaut.gender === 'male' ? '♂ Male' : '♀ Female'}</span>
        <span className="text-mars-700">|</span>
        <span>Age <strong className="text-mars-300">{astronaut.age}</strong></span>
        <span className="text-mars-700">|</span>
        <span><strong className="text-mars-300">{astronaut.weightKg}</strong> kg</span>
        <span className="text-mars-700">|</span>
        <span><strong className="text-mars-300">{astronaut.heightCm}</strong> cm</span>
      </div>

      {/* Edit fields */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-mars-900/60 rounded-xl p-4 mb-4 border border-mars-800/50">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="text-sm text-mars-400 font-medium">
                  Gender
                  <select
                    className="block mt-1 w-full bg-mars-800 text-white text-sm rounded-lg px-3 py-2 border border-mars-700 focus:border-rust-400 outline-none"
                    value={astronaut.gender}
                    onChange={e => onUpdate({ ...astronaut, gender: e.target.value as Gender })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
                <label className="text-sm text-mars-400 font-medium">
                  Age
                  <input
                    type="number"
                    min={20} max={65}
                    className="block mt-1 w-full bg-mars-800 text-white text-sm rounded-lg px-3 py-2 border border-mars-700 focus:border-rust-400 outline-none"
                    value={astronaut.age}
                    onChange={e => onUpdate({ ...astronaut, age: Math.max(20, Math.min(65, +e.target.value || 20)) })}
                  />
                </label>
                <label className="text-sm text-mars-400 font-medium">
                  Weight (kg)
                  <input
                    type="number"
                    min={40} max={140}
                    className="block mt-1 w-full bg-mars-800 text-white text-sm rounded-lg px-3 py-2 border border-mars-700 focus:border-rust-400 outline-none"
                    value={astronaut.weightKg}
                    onChange={e => onUpdate({ ...astronaut, weightKg: Math.max(40, Math.min(140, +e.target.value || 40)) })}
                  />
                </label>
                <label className="text-sm text-mars-400 font-medium">
                  Height (cm)
                  <input
                    type="number"
                    min={140} max={210}
                    className="block mt-1 w-full bg-mars-800 text-white text-sm rounded-lg px-3 py-2 border border-mars-700 focus:border-rust-400 outline-none"
                    value={astronaut.heightCm}
                    onChange={e => onUpdate({ ...astronaut, heightCm: Math.max(140, Math.min(210, +e.target.value || 140)) })}
                  />
                </label>
              </div>
              <label className="text-sm text-mars-400 font-medium block">
                Activity Level
                <select
                  className="block mt-1 w-full bg-mars-800 text-white text-sm rounded-lg px-3 py-2 border border-mars-700 focus:border-rust-400 outline-none"
                  value={astronaut.activityLevel}
                  onChange={e => onUpdate({ ...astronaut, activityLevel: e.target.value as ActivityLevel })}
                >
                  {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nutritional needs summary */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-mars-900/60 rounded-xl py-3 px-2 border border-mars-800/40">
          <div className="text-lg font-bold text-sun-400">{needs.dailyCalories.toLocaleString()}</div>
          <div className="text-xs text-mars-400 mt-0.5">kcal / day</div>
        </div>
        <div className="bg-mars-900/60 rounded-xl py-3 px-2 border border-mars-800/40">
          <div className="text-lg font-bold text-water-400">{needs.dailyProtein}g</div>
          <div className="text-xs text-mars-400 mt-0.5">protein / day</div>
        </div>
        <div className="bg-mars-900/60 rounded-xl py-3 px-2 border border-mars-800/40">
          <div className="text-lg font-bold text-rust-400">{needs.dailyVitaminC}mg</div>
          <div className="text-xs text-mars-400 mt-0.5">vitamin C / day</div>
        </div>
      </div>
    </motion.div>
  );
}

let nextId = 100;

export default function CrewConfig({ crew, crewTarget, onUpdateCrew }: Props) {
  const handleUpdate = (index: number, a: Astronaut) => {
    const next = [...crew];
    next[index] = a;
    onUpdateCrew(next);
  };

  const handleRemove = (index: number) => {
    if (crew.length <= 1) return;
    onUpdateCrew(crew.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (crew.length >= 8) return;
    nextId++;
    const newAstronaut: Astronaut = {
      id: `a${nextId}`,
      name: `Crew Member ${crew.length + 1}`,
      age: 35,
      gender: 'male',
      weightKg: 75,
      heightCm: 175,
      activityLevel: 'moderate',
      dietaryRestrictions: [],
    };
    onUpdateCrew([...crew, newAstronaut]);
  };

  return (
    <div className="glass rounded-2xl p-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Crew Roster</h2>
          <p className="text-sm text-mars-400 mt-0.5">{crew.length} astronaut{crew.length !== 1 ? 's' : ''} assigned to greenhouse operations</p>
        </div>
        <button
          onClick={handleAdd}
          disabled={crew.length >= 8}
          className="text-sm px-5 py-2.5 rounded-xl bg-bio-500/20 text-bio-400 hover:bg-bio-500/30 border border-bio-500/20 transition font-semibold disabled:opacity-30"
        >
          + Add Crew Member
        </button>
      </div>

      {/* Crew list */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        <AnimatePresence>
          {crew.map((a, i) => (
            <AstronautCard
              key={a.id}
              astronaut={a}
              onUpdate={updated => handleUpdate(i, updated)}
              onRemove={() => handleRemove(i)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Aggregate Summary */}
      <div className="mt-4 pt-4 border-t border-mars-700">
        <div className="text-sm font-semibold text-mars-300 uppercase tracking-wider mb-3">
          Total Daily Crew Requirements
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-mars-900/60 rounded-xl py-3 border border-mars-800/40">
            <div className="text-xl font-bold text-sun-400">{crewTarget.dailyCalories.toLocaleString()}</div>
            <div className="text-xs text-mars-400 mt-0.5">kcal / day</div>
          </div>
          <div className="bg-mars-900/60 rounded-xl py-3 border border-mars-800/40">
            <div className="text-xl font-bold text-water-400">{crewTarget.dailyProtein}g</div>
            <div className="text-xs text-mars-400 mt-0.5">protein / day</div>
          </div>
          <div className="bg-mars-900/60 rounded-xl py-3 border border-mars-800/40">
            <div className="text-xl font-bold text-rust-400">{crewTarget.dailyVitaminC}mg</div>
            <div className="text-xs text-mars-400 mt-0.5">vitamin C / day</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center mt-3">
          <div className="bg-mars-900/60 rounded-xl py-3 border border-mars-800/40">
            <div className="text-xl font-bold text-bio-400">{crewTarget.dailyFiber}g</div>
            <div className="text-xs text-mars-400 mt-0.5">fiber / day</div>
          </div>
          <div className="bg-mars-900/60 rounded-xl py-3 border border-mars-800/40">
            <div className="text-xl font-bold text-alert-400">{crewTarget.dailyIron}mg</div>
            <div className="text-xs text-mars-400 mt-0.5">iron / day</div>
          </div>
          <div className="bg-mars-900/60 rounded-xl py-3 border border-mars-800/40">
            <div className="text-xl font-bold text-mars-300">{crewTarget.dailyCalcium}mg</div>
            <div className="text-xs text-mars-400 mt-0.5">calcium / day</div>
          </div>
        </div>
      </div>
    </div>
  );
}
