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

const AVATAR_COLORS = [
  'from-orange-500 to-red-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-red-600',
  'from-lime-500 to-green-600',
];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function AstronautCard({ astronaut, index, onUpdate, onRemove }: {
  astronaut: Astronaut;
  index: number;
  onUpdate: (a: Astronaut) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const needs = calculateAstronautNeeds(astronaut);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass rounded-2xl border border-mars-800/50 flex flex-col overflow-hidden"
    >
      {/* Main row: large photo left, info right */}
      <div className="flex items-stretch">
        {/* Photo */}
        <div className="relative w-36 flex-shrink-0 overflow-hidden">
          {astronaut.photo ? (
            <img
              src={astronaut.photo}
              alt={astronaut.name}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${AVATAR_COLORS[index % AVATAR_COLORS.length]} flex items-center justify-center`}>
              <span className="text-4xl">{astronaut.gender === 'female' ? '👩‍🚀' : '👨‍🚀'}</span>
            </div>
          )}
        </div>

        {/* Info + buttons */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {astronaut.title && (
                  <div className="text-xs font-semibold uppercase tracking-wider text-rust-400 mb-0.5">{astronaut.title}</div>
                )}
                {editing ? (
                  <input
                    className="bg-mars-800 text-white text-base font-bold rounded-lg px-2 py-1 w-full border border-mars-700 focus:border-rust-400 outline-none"
                    value={astronaut.name}
                    onChange={e => onUpdate({ ...astronaut, name: e.target.value })}
                  />
                ) : (
                  <div className="text-base font-bold text-white truncate">{astronaut.name}</div>
                )}
              </div>
              {/* Buttons */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditing(e => !e)}
                  className="text-sm w-7 h-7 rounded-lg bg-mars-800 text-mars-300 hover:text-white hover:bg-mars-700 transition font-medium flex items-center justify-center"
                >
                  {editing ? '✓' : '✎'}
                </button>
                <button
                  onClick={onRemove}
                  className="text-sm w-7 h-7 rounded-lg bg-mars-800 text-alert-400 hover:text-alert-300 hover:bg-alert-500/10 transition flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-mars-400 mt-1">
              <span>{astronaut.gender === 'male' ? '♂' : '♀'} {astronaut.age}y</span>
              <span>{astronaut.weightKg}kg · {astronaut.heightCm}cm</span>
            </div>
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border mt-1.5 ${ACTIVITY_COLORS[astronaut.activityLevel]}`}>
              {ACTIVITY_LABELS[astronaut.activityLevel]}
            </span>
          </div>

          {/* Nutrition row */}
          <div className="flex gap-1.5 mt-2">
            <div className="flex-1 bg-mars-900/60 rounded-lg py-1 px-1.5 text-center border border-mars-800/40">
              <div className="text-sm font-bold text-sun-400">{needs.dailyCalories.toLocaleString()}</div>
              <div className="text-[10px] text-mars-500">kcal</div>
            </div>
            <div className="flex-1 bg-mars-900/60 rounded-lg py-1 px-1.5 text-center border border-mars-800/40">
              <div className="text-sm font-bold text-water-400">{needs.dailyProtein}g</div>
              <div className="text-[10px] text-mars-500">protein</div>
            </div>
            <div className="flex-1 bg-mars-900/60 rounded-lg py-1 px-1.5 text-center border border-mars-800/40">
              <div className="text-sm font-bold text-rust-400">{needs.dailyVitaminC}mg</div>
              <div className="text-[10px] text-mars-500">vit C</div>
            </div>
          </div>
        </div>
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
            <div className="bg-mars-900/60 mx-3 mb-3 rounded-xl p-3 border border-mars-800/50">
              <div className="grid grid-cols-4 gap-2">
                <label className="text-xs text-mars-400">
                  Gender
                  <select
                    className="block mt-0.5 w-full bg-mars-800 text-white text-xs rounded-lg px-2 py-1.5 border border-mars-700 focus:border-rust-400 outline-none"
                    value={astronaut.gender}
                    onChange={e => onUpdate({ ...astronaut, gender: e.target.value as Gender })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
                <label className="text-xs text-mars-400">
                  Age
                  <input type="number" min={20} max={65}
                    className="block mt-0.5 w-full bg-mars-800 text-white text-xs rounded-lg px-2 py-1.5 border border-mars-700 focus:border-rust-400 outline-none"
                    value={astronaut.age}
                    onChange={e => onUpdate({ ...astronaut, age: Math.max(20, Math.min(65, +e.target.value || 20)) })}
                  />
                </label>
                <label className="text-xs text-mars-400">
                  Weight
                  <input type="number" min={40} max={140}
                    className="block mt-0.5 w-full bg-mars-800 text-white text-xs rounded-lg px-2 py-1.5 border border-mars-700 focus:border-rust-400 outline-none"
                    value={astronaut.weightKg}
                    onChange={e => onUpdate({ ...astronaut, weightKg: Math.max(40, Math.min(140, +e.target.value || 40)) })}
                  />
                </label>
                <label className="text-xs text-mars-400">
                  Height
                  <input type="number" min={140} max={210}
                    className="block mt-0.5 w-full bg-mars-800 text-white text-xs rounded-lg px-2 py-1.5 border border-mars-700 focus:border-rust-400 outline-none"
                    value={astronaut.heightCm}
                    onChange={e => onUpdate({ ...astronaut, heightCm: Math.max(140, Math.min(210, +e.target.value || 140)) })}
                  />
                </label>
              </div>
              <label className="text-xs text-mars-400 block mt-2">
                Activity Level
                <select
                  className="block mt-0.5 w-full bg-mars-800 text-white text-xs rounded-lg px-2 py-1.5 border border-mars-700 focus:border-rust-400 outline-none"
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

      {/* Compact nutrition row */}
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
    <div className="glass rounded-2xl p-6 px-12 h-full flex flex-col overflow-hidden">
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

      {/* Crew grid */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-0">
        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence>
            {crew.map((a, i) => (
              <AstronautCard
                key={a.id}
                astronaut={a}
                index={i}
                onUpdate={updated => handleUpdate(i, updated)}
                onRemove={() => handleRemove(i)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Aggregate Summary */}
      <div className="mt-3 pt-3 border-t border-mars-700">
        <div className="text-xs font-semibold text-mars-400 uppercase tracking-wider mb-2">
          Total Daily Crew Requirements
        </div>
        <div className="grid grid-cols-6 gap-2 text-center">
          <div className="bg-mars-900/60 rounded-lg py-2 border border-mars-800/40">
            <div className="text-base font-bold text-sun-400">{crewTarget.dailyCalories.toLocaleString()}</div>
            <div className="text-[10px] text-mars-500">kcal</div>
          </div>
          <div className="bg-mars-900/60 rounded-lg py-2 border border-mars-800/40">
            <div className="text-base font-bold text-water-400">{crewTarget.dailyProtein}g</div>
            <div className="text-[10px] text-mars-500">protein</div>
          </div>
          <div className="bg-mars-900/60 rounded-lg py-2 border border-mars-800/40">
            <div className="text-base font-bold text-rust-400">{crewTarget.dailyVitaminC}mg</div>
            <div className="text-[10px] text-mars-500">vit C</div>
          </div>
          <div className="bg-mars-900/60 rounded-lg py-2 border border-mars-800/40">
            <div className="text-base font-bold text-bio-400">{crewTarget.dailyFiber}g</div>
            <div className="text-[10px] text-mars-500">fiber</div>
          </div>
          <div className="bg-mars-900/60 rounded-lg py-2 border border-mars-800/40">
            <div className="text-base font-bold text-alert-400">{crewTarget.dailyIron}mg</div>
            <div className="text-[10px] text-mars-500">iron</div>
          </div>
          <div className="bg-mars-900/60 rounded-lg py-2 border border-mars-800/40">
            <div className="text-base font-bold text-mars-300">{crewTarget.dailyCalcium}mg</div>
            <div className="text-[10px] text-mars-500">calcium</div>
          </div>
        </div>
      </div>
    </div>
  );
}
