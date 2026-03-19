import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MissionConfig, SeedAllocation, Astronaut, NutrientTarget } from '../types';
import { SEED_LIBRARY } from '../data/crops';
import CrewConfig from './CrewConfig';

interface Props {
  crew: Astronaut[];
  crewTarget: NutrientTarget;
  onUpdateCrew: (crew: Astronaut[]) => void;
  onLaunch: (config: MissionConfig) => void;
}

type SetupStep = 'crew' | 'mission' | 'resources' | 'seeds';

const STEPS: { id: SetupStep; label: string; icon: string }[] = [
  { id: 'crew', label: 'Crew', icon: '👨‍🚀' },
  { id: 'mission', label: 'Mission', icon: '🚀' },
  { id: 'resources', label: 'Resources', icon: '💧' },
  { id: 'seeds', label: 'Seeds', icon: '🌱' },
];

const CATEGORY_LABELS: Record<string, string> = {
  leafy: '🥬 Leafy Greens',
  root: '🥕 Root Vegetables',
  legume: '🫘 Legumes',
  fruit: '🍅 Fruits',
  grain: '🌾 Grains',
  herb: '🌿 Herbs',
};

export default function MissionSetup({ crew, crewTarget, onUpdateCrew, onLaunch }: Props) {
  const [step, setStep] = useState<SetupStep>('crew');

  // Mission params
  const [missionDays, setMissionDays] = useState(450);
  const [greenhouseArea, setGreenhouseArea] = useState(120);

  // Resources
  const [waterReservoir, setWaterReservoir] = useState(8000);
  const [waterCapacity, setWaterCapacity] = useState(10000);
  const [energyStored, setEnergyStored] = useState(500);
  const [energyCapacity, setEnergyCapacity] = useState(800);
  const [nutrientReservoir, setNutrientReservoir] = useState(2000);
  const [nutrientCapacity, setNutrientCapacity] = useState(2500);

  // Seed selection
  const [seedAllocations, setSeedAllocations] = useState<Record<string, number>>({
    lettuce: 25,
    potato: 30,
    beans: 25,
    radish: 20,
    herbs: 20,
  });

  const allocatedArea = useMemo(
    () => Object.values(seedAllocations).reduce((s, v) => s + v, 0),
    [seedAllocations]
  );
  const remainingArea = greenhouseArea - allocatedArea;

  const toggleSeed = (cropId: string) => {
    setSeedAllocations(prev => {
      const copy = { ...prev };
      if (copy[cropId] !== undefined) {
        delete copy[cropId];
      } else {
        const defaultArea = Math.min(15, Math.max(5, remainingArea));
        if (defaultArea > 0) copy[cropId] = defaultArea;
      }
      return copy;
    });
  };

  const updateSeedArea = (cropId: string, area: number) => {
    setSeedAllocations(prev => ({ ...prev, [cropId]: Math.max(1, area) }));
  };

  const handleLaunch = () => {
    const selectedSeeds: SeedAllocation[] = Object.entries(seedAllocations)
      .filter(([, area]) => area > 0)
      .map(([cropId, area]) => ({ cropId, area }));

    onLaunch({
      missionDays,
      greenhouseArea,
      waterReservoir,
      waterCapacity,
      energyStored,
      energyCapacity,
      nutrientReservoir,
      nutrientCapacity,
      selectedSeeds,
    });
  };

  const stepIdx = STEPS.findIndex(s => s.id === step);

  const seedsByCategory = useMemo(() => {
    const map: Record<string, typeof SEED_LIBRARY> = {};
    SEED_LIBRARY.forEach(crop => {
      if (!map[crop.category]) map[crop.category] = [];
      map[crop.category].push(crop);
    });
    return map;
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Step Navigation */}
      <div className="relative z-10 flex justify-center gap-2 mb-4">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-semibold transition-all duration-200 ${
              step === s.id
                ? 'glass text-white border border-orange-400/50 shadow-lg shadow-orange-500/10'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <span className="text-xl">{s.icon}</span>
            {s.label}
            {step === s.id && (
              <motion.div
                layoutId="step-indicator"
                className="absolute -bottom-1 h-0.5 bg-orange-400 rounded-full"
                style={{ width: '40px' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-h-0 overflow-auto px-2">
        <AnimatePresence mode="wait">
          {step === 'crew' && (
            <motion.div key="crew" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
              <CrewConfig crew={crew} crewTarget={crewTarget} onUpdateCrew={onUpdateCrew} />
            </motion.div>
          )}

          {step === 'mission' && (
            <motion.div key="mission" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="max-w-2xl mx-auto space-y-8 py-4">
                <div className="glass rounded-2xl p-8 border border-mars-800/50">
                  <h2 className="text-2xl font-bold text-white mb-6">🚀 Mission Parameters</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-lg text-white/80 mb-2">Mission Duration (sols)</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={90}
                          max={900}
                          step={10}
                          value={missionDays}
                          onChange={e => setMissionDays(Number(e.target.value))}
                          className="flex-1 accent-orange-500 h-2"
                        />
                        <input
                          type="number"
                          min={90}
                          max={900}
                          value={missionDays}
                          onChange={e => setMissionDays(Math.max(90, Math.min(900, Number(e.target.value))))}
                          className="w-24 bg-mars-900/80 border border-mars-700 rounded-lg px-3 py-2 text-white text-center text-lg font-mono"
                        />
                      </div>
                      <p className="text-sm text-white/40 mt-1">Standard mission: 450 sols (~462 Earth days)</p>
                    </div>

                    <div>
                      <label className="block text-lg text-white/80 mb-2">Greenhouse Area (m²)</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={40}
                          max={300}
                          step={5}
                          value={greenhouseArea}
                          onChange={e => setGreenhouseArea(Number(e.target.value))}
                          className="flex-1 accent-orange-500 h-2"
                        />
                        <input
                          type="number"
                          min={40}
                          max={300}
                          value={greenhouseArea}
                          onChange={e => setGreenhouseArea(Math.max(40, Math.min(300, Number(e.target.value))))}
                          className="w-24 bg-mars-900/80 border border-mars-700 rounded-lg px-3 py-2 text-white text-center text-lg font-mono"
                        />
                      </div>
                      <p className="text-sm text-white/40 mt-1">Standard: 120 m² (about the size of a large apartment)</p>
                    </div>
                  </div>
                </div>

                {/* Quick summary */}
                <div className="glass rounded-2xl p-6 border border-mars-800/50">
                  <h3 className="text-lg font-semibold text-white/80 mb-3">Mission Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-orange-400">{missionDays}</div>
                      <div className="text-sm text-white/50">Sols</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-blue-400">{crew.length}</div>
                      <div className="text-sm text-white/50">Astronauts</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-400">{greenhouseArea} m²</div>
                      <div className="text-sm text-white/50">Growing Area</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'resources' && (
            <motion.div key="resources" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="max-w-3xl mx-auto py-4 space-y-6">
                <div className="glass rounded-2xl p-8 border border-mars-800/50">
                  <h2 className="text-2xl font-bold text-white mb-6">💧 Initial Resources</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Water */}
                    <ResourceSlider
                      label="Water Supply"
                      icon="💧"
                      value={waterReservoir}
                      capacity={waterCapacity}
                      onValueChange={setWaterReservoir}
                      onCapacityChange={setWaterCapacity}
                      unit="L"
                      min={1000}
                      max={20000}
                      capMin={2000}
                      capMax={25000}
                      color="text-blue-400"
                      description="Recycling rate: ~35 L/day"
                    />
                    {/* Energy */}
                    <ResourceSlider
                      label="Energy Storage"
                      icon="⚡"
                      value={energyStored}
                      capacity={energyCapacity}
                      onValueChange={setEnergyStored}
                      onCapacityChange={setEnergyCapacity}
                      unit="kWh"
                      min={100}
                      max={2000}
                      capMin={200}
                      capMax={3000}
                      color="text-yellow-400"
                      description="Solar output: ~120 kWh/day"
                    />
                    {/* Nutrients */}
                    <ResourceSlider
                      label="Nutrient Stock"
                      icon="🧪"
                      value={nutrientReservoir}
                      capacity={nutrientCapacity}
                      onValueChange={setNutrientReservoir}
                      onCapacityChange={setNutrientCapacity}
                      unit="kg"
                      min={200}
                      max={5000}
                      capMin={500}
                      capMax={8000}
                      color="text-green-400"
                      description="Hydroponic nutrient solution"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'seeds' && (
            <motion.div key="seeds" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="max-w-5xl mx-auto py-4 space-y-4">
                {/* Area gauge */}
                <div className="glass rounded-2xl p-5 border border-mars-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-white">🌱 Seed Selection & Allocation</h2>
                    <div className="text-lg font-mono">
                      <span className={remainingArea < 0 ? 'text-red-400' : 'text-green-400'}>{allocatedArea}</span>
                      <span className="text-white/40"> / {greenhouseArea} m² used</span>
                      {remainingArea < 0 && <span className="text-red-400 ml-2">(over by {-remainingArea} m²!)</span>}
                    </div>
                  </div>
                  <div className="w-full bg-mars-900 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${remainingArea < 0 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, (allocatedArea / greenhouseArea) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Seed catalog by category */}
                {Object.entries(seedsByCategory).map(([category, crops]) => (
                  <div key={category} className="glass rounded-2xl p-5 border border-mars-800/50">
                    <h3 className="text-lg font-bold text-white/80 mb-3">{CATEGORY_LABELS[category] || category}</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {crops.map(crop => {
                        const isSelected = seedAllocations[crop.id] !== undefined;
                        const area = seedAllocations[crop.id] ?? 0;
                        return (
                          <div
                            key={crop.id}
                            className={`rounded-xl p-4 border transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'bg-white/10 border-orange-400/50 shadow-lg shadow-orange-500/5'
                                : 'bg-white/3 border-mars-800/30 hover:border-mars-700/50 opacity-60 hover:opacity-80'
                            }`}
                            onClick={() => !isSelected && toggleSeed(crop.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{crop.emoji}</span>
                                <span className="text-base font-semibold text-white">{crop.name}</span>
                              </div>
                              {isSelected && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleSeed(crop.id); }}
                                  className="text-white/30 hover:text-red-400 text-lg"
                                  title="Remove"
                                >✕</button>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-white/50 mb-2">
                              <span>🌡 {crop.optimalTemp[0]}-{crop.optimalTemp[1]}°C</span>
                              <span>📅 {crop.growthDays}d</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                crop.nutriScore === 'A' ? 'bg-green-600 text-white' :
                                crop.nutriScore === 'B' ? 'bg-lime-600 text-white' :
                                crop.nutriScore === 'C' ? 'bg-yellow-600 text-white' :
                                'bg-orange-600 text-white'
                              }`}>{crop.nutriScore}</span>
                            </div>

                            {isSelected && (
                              <div className="mt-2" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min={1}
                                    max={Math.min(80, area + Math.max(0, remainingArea))}
                                    value={area}
                                    onChange={e => updateSeedArea(crop.id, Number(e.target.value))}
                                    className="flex-1 accent-orange-500 h-1.5"
                                  />
                                  <span className="text-sm font-mono text-orange-300 w-14 text-right">{area} m²</span>
                                </div>
                              </div>
                            )}

                            <p className="text-[11px] text-white/30 mt-1 line-clamp-2">{crop.marsNotes}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom nav + launch */}
      <div className="relative z-10 flex items-center justify-between px-8 py-4">
        <button
          onClick={() => {
            const idx = STEPS.findIndex(s => s.id === step);
            if (idx > 0) setStep(STEPS[idx - 1].id);
          }}
          disabled={stepIdx === 0}
          className="px-6 py-3 rounded-xl text-lg text-white/60 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 disabled:pointer-events-none"
        >
          ← Back
        </button>

        {stepIdx < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(STEPS[stepIdx + 1].id)}
            className="px-8 py-3 rounded-xl text-lg font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/20 transition-all"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleLaunch}
            disabled={allocatedArea === 0 || remainingArea < 0}
            className="group relative px-12 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-2xl font-bold shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <span className="flex items-center gap-3">🚀 Launch Mission</span>
            <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Reusable Resource Slider ── */
function ResourceSlider({ label, icon, value, capacity, onValueChange, onCapacityChange, unit, min, max, capMin, capMax, color, description }: {
  label: string; icon: string; value: number; capacity: number;
  onValueChange: (v: number) => void; onCapacityChange: (v: number) => void;
  unit: string; min: number; max: number; capMin: number; capMax: number;
  color: string; description: string;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <span className="text-xl">{icon}</span> {label}
      </h3>

      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-white/60">Initial Amount</span>
          <span className={`font-mono ${color}`}>{value.toLocaleString()} {unit}</span>
        </div>
        <input
          type="range"
          min={min} max={max} step={Math.round((max - min) / 100)}
          value={value}
          onChange={e => {
            const v = Number(e.target.value);
            onValueChange(v);
            if (v > capacity) onCapacityChange(v);
          }}
          className="w-full accent-orange-500 h-2"
        />
      </div>

      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-white/60">Max Capacity</span>
          <span className="font-mono text-white/80">{capacity.toLocaleString()} {unit}</span>
        </div>
        <input
          type="range"
          min={capMin} max={capMax} step={Math.round((capMax - capMin) / 100)}
          value={capacity}
          onChange={e => {
            const c = Number(e.target.value);
            onCapacityChange(c);
            if (value > c) onValueChange(c);
          }}
          className="w-full accent-orange-500 h-2"
        />
      </div>

      <div className="w-full bg-mars-900 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-orange-500/70 transition-all duration-300"
          style={{ width: `${(value / capacity) * 100}%` }}
        />
      </div>
      <p className="text-xs text-white/30">{description}</p>
    </div>
  );
}
