import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEED_LIBRARY } from '../data/crops';
import type { CropType } from '../types';

type SortKey = 'name' | 'growthDays' | 'caloriesPerKg' | 'proteinPerKg' | 'vitaminCPerKg' | 'marsSuitability' | 'waterPerDay' | 'yieldPerM2';
type Category = CropType['category'] | 'all';

const CATEGORY_CONFIG: { id: Category; label: string; emoji: string; color: string }[] = [
  { id: 'all', label: 'All Seeds', emoji: '📦', color: '#a8a29e' },
  { id: 'leafy', label: 'Leafy Greens', emoji: '🥬', color: '#4ade80' },
  { id: 'root', label: 'Roots & Tubers', emoji: '🥕', color: '#f97316' },
  { id: 'legume', label: 'Legumes', emoji: '🫘', color: '#a3e635' },
  { id: 'fruit', label: 'Fruits', emoji: '🍅', color: '#ef4444' },
  { id: 'grain', label: 'Grains', emoji: '🌾', color: '#eab308' },
  { id: 'herb', label: 'Herbs', emoji: '🌿', color: '#22d3ee' },
];

const SORT_OPTIONS: { key: SortKey; label: string; desc: boolean }[] = [
  { key: 'marsSuitability', label: 'Mars Score', desc: true },
  { key: 'name', label: 'Name', desc: false },
  { key: 'growthDays', label: 'Growth Days', desc: false },
  { key: 'caloriesPerKg', label: 'Calories', desc: true },
  { key: 'proteinPerKg', label: 'Protein', desc: true },
  { key: 'vitaminCPerKg', label: 'Vitamin C', desc: true },
  { key: 'waterPerDay', label: 'Water Need', desc: false },
  { key: 'yieldPerM2', label: 'Yield/m²', desc: true },
];

const NUTRI_SCORE_COLORS = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#eab308',
  D: '#f97316',
  E: '#ef4444',
};

const DIFFICULTY_CONFIG = {
  easy: { color: '#22c55e', label: 'Easy' },
  moderate: { color: '#eab308', label: 'Moderate' },
  hard: { color: '#ef4444', label: 'Hard' },
};

function NutriScoreBadge({ score }: { score: CropType['nutriScore'] }) {
  return (
    <div className="flex gap-0.5">
      {(['A', 'B', 'C', 'D', 'E'] as const).map(letter => (
        <div
          key={letter}
          className={`w-6 h-6 rounded text-[10px] font-black flex items-center justify-center transition-all ${
            letter === score ? 'scale-110 ring-1 ring-white/30' : 'opacity-25 scale-90'
          }`}
          style={{ background: NUTRI_SCORE_COLORS[letter], color: letter === score ? 'white' : 'transparent' }}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

function MarsSuitabilityBar({ score }: { score: number }) {
  const color = score >= 8 ? '#22c55e' : score >= 6 ? '#eab308' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-mars-800/80 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(to right, ${color}88, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-base font-bold min-w-[2ch]" style={{ color }}>{score}</span>
    </div>
  );
}

function StatPill({ label, value, unit, color }: { label: string; value: string | number; unit: string; color: string }) {
  return (
    <div className="bg-mars-900/60 rounded-lg px-3 py-2 text-center border border-mars-800/30">
      <div className="text-[10px] text-mars-500 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold mt-0.5" style={{ color }}>{value}</div>
      <div className="text-[10px] text-mars-500">{unit}</div>
    </div>
  );
}

function CropCard({ crop, expanded, onToggle }: { crop: CropType; expanded: boolean; onToggle: () => void }) {
  const isActive = ['lettuce', 'potato', 'radish', 'beans', 'herbs'].includes(crop.id);

  return (
    <motion.div
      layout
      className={`glass rounded-2xl overflow-hidden cursor-pointer transition-all border ${
        isActive ? 'border-bio-500/40 ring-1 ring-bio-500/20' : 'border-mars-800/40'
      }`}
      onClick={onToggle}
      whileHover={{ scale: 1.005 }}
    >
      {/* Card Header */}
      <div className="p-4 flex items-start gap-4">
        <div className="text-4xl shrink-0">{crop.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white truncate">{crop.name}</h3>
            {isActive && (
              <span className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-bio-500/20 text-bio-400 tracking-wider">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-mars-400 mb-2">
            <span className="capitalize px-2 py-0.5 rounded-full" style={{
              background: `${CATEGORY_CONFIG.find(c => c.id === crop.category)?.color}15`,
              color: CATEGORY_CONFIG.find(c => c.id === crop.category)?.color,
            }}>
              {crop.category}
            </span>
            <span style={{ color: DIFFICULTY_CONFIG[crop.difficulty].color }}>
              {DIFFICULTY_CONFIG[crop.difficulty].label}
            </span>
            <span>{crop.growthDays}d cycle</span>
          </div>
          <MarsSuitabilityBar score={crop.marsSuitability} />
        </div>
        <div className="shrink-0 text-right">
          <NutriScoreBadge score={crop.nutriScore} />
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-mars-800/40">
              {/* Mars notes */}
              <div className="bg-orange-950/30 rounded-xl p-3 mb-4 border border-orange-900/30">
                <div className="text-xs text-orange-400 font-semibold mb-1">🪐 Mars Viability Notes</div>
                <div className="text-sm text-mars-300">{crop.marsNotes}</div>
              </div>

              {/* Nutrition grid */}
              <div className="text-xs text-mars-400 uppercase tracking-wider font-semibold mb-2">Nutrition per kg</div>
              <div className="grid grid-cols-6 gap-2 mb-4">
                <StatPill label="Calories" value={crop.caloriesPerKg.toLocaleString()} unit="kcal" color="#f97316" />
                <StatPill label="Protein" value={crop.proteinPerKg} unit="g" color="#a3e635" />
                <StatPill label="Vitamin C" value={crop.vitaminCPerKg} unit="mg" color="#facc15" />
                <StatPill label="Fiber" value={crop.fiberPerKg} unit="g" color="#22d3ee" />
                <StatPill label="Iron" value={crop.ironPerKg} unit="mg" color="#ef4444" />
                <StatPill label="Calcium" value={crop.calciumPerKg} unit="mg" color="#a78bfa" />
              </div>

              {/* Growing requirements */}
              <div className="text-xs text-mars-400 uppercase tracking-wider font-semibold mb-2">Growing Requirements</div>
              <div className="grid grid-cols-5 gap-2 mb-4">
                <StatPill label="Water" value={crop.waterPerDay} unit="L/m²/day" color="#38bdf8" />
                <StatPill label="Energy" value={crop.energyPerDay} unit="kWh/m²/day" color="#fbbf24" />
                <StatPill label="Space" value={crop.spacePerPlant} unit="m²/plant" color="#c084fc" />
                <StatPill label="Light" value={crop.lightHoursPerDay} unit="hrs/day" color="#fde047" />
                <StatPill label="Yield" value={crop.yieldPerM2} unit="kg/m²" color="#4ade80" />
              </div>

              {/* Growing conditions */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-mars-900/40 rounded-lg p-3">
                  <div className="text-[10px] text-mars-500 uppercase mb-1">Temperature</div>
                  <div className="text-white font-bold">{crop.optimalTemp[0]}° – {crop.optimalTemp[1]}°C</div>
                </div>
                <div className="bg-mars-900/40 rounded-lg p-3">
                  <div className="text-[10px] text-mars-500 uppercase mb-1">Humidity</div>
                  <div className="text-white font-bold">{crop.optimalHumidity[0]}% – {crop.optimalHumidity[1]}%</div>
                </div>
                <div className="bg-mars-900/40 rounded-lg p-3">
                  <div className="text-[10px] text-mars-500 uppercase mb-1">CO₂ Tolerance</div>
                  <div className="text-white font-bold capitalize">{crop.co2Tolerance}</div>
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-3 mt-3 text-xs">
                <span className={`px-2 py-1 rounded-full ${crop.canGrowHydroponic ? 'bg-bio-500/15 text-bio-400' : 'bg-mars-800/50 text-mars-600'}`}>
                  {crop.canGrowHydroponic ? '✅' : '❌'} Hydroponic
                </span>
                <span className={`px-2 py-1 rounded-full ${crop.canGrowAeroponic ? 'bg-water-500/15 text-water-400' : 'bg-mars-800/50 text-mars-600'}`}>
                  {crop.canGrowAeroponic ? '✅' : '❌'} Aeroponic
                </span>
                <span className="px-2 py-1 rounded-full bg-mars-800/50 text-mars-400">
                  🍽️ Edible: {crop.edibleParts}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SeedLibrary() {
  const [category, setCategory] = useState<Category>('all');
  const [sortKey, setSortKey] = useState<SortKey>('marsSuitability');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...SEED_LIBRARY];
    if (category !== 'all') list = list.filter(c => c.category === category);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.marsNotes.toLowerCase().includes(q) ||
        c.edibleParts.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }
    const opt = SORT_OPTIONS.find(o => o.key === sortKey)!;
    list.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string' && typeof vb === 'string') return opt.desc ? vb.localeCompare(va) : va.localeCompare(vb);
      return opt.desc ? (vb as number) - (va as number) : (va as number) - (vb as number);
    });
    return list;
  }, [category, sortKey, search]);

  // Summary stats for filtered set
  const stats = useMemo(() => {
    const avg = (fn: (c: CropType) => number) => filtered.length ? Math.round(filtered.reduce((s, c) => s + fn(c), 0) / filtered.length) : 0;
    return {
      count: filtered.length,
      avgGrowthDays: avg(c => c.growthDays),
      avgMarsScore: (filtered.reduce((s, c) => s + c.marsSuitability, 0) / (filtered.length || 1)).toFixed(1),
      avgCalories: avg(c => c.caloriesPerKg),
    };
  }, [filtered]);

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Header bar */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-white">🌱 Martian Seed Library</h2>
            <p className="text-xs text-mars-400 mt-0.5">
              {SEED_LIBRARY.length} varieties cataloged · Nutritional data per kg edible portion
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-bio-400">{stats.count}</div>
              <div className="text-[10px] text-mars-500">showing</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-400">{stats.avgMarsScore}</div>
              <div className="text-[10px] text-mars-500">avg Mars ⊘</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400">{stats.avgCalories}</div>
              <div className="text-[10px] text-mars-500">avg kcal/kg</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-cyan-400">{stats.avgGrowthDays}d</div>
              <div className="text-[10px] text-mars-500">avg cycle</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Category filters */}
          <div className="flex gap-1">
            {CATEGORY_CONFIG.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  category === c.id
                    ? 'text-white shadow-md'
                    : 'text-mars-400 hover:text-mars-300 hover:bg-mars-800/40'
                }`}
                style={category === c.id ? { background: `${c.color}25`, boxShadow: `0 0 12px ${c.color}20` } : undefined}
              >
                <span>{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search seeds..."
              className="bg-mars-900/60 border border-mars-700/40 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-mars-600 focus:outline-none focus:border-orange-500/50 w-48"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mars-500 text-sm">🔍</span>
          </div>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="bg-mars-900/60 border border-mars-700/40 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>Sort: {o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Seed Card Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(crop => (
              <CropCard
                key={crop.id}
                crop={crop}
                expanded={expandedId === crop.id}
                onToggle={() => setExpandedId(prev => prev === crop.id ? null : crop.id)}
              />
            ))}
          </AnimatePresence>
        </div>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-48 text-mars-500 text-lg">
            No seeds match your search.
          </div>
        )}
      </div>
    </div>
  );
}
