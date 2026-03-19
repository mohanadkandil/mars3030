import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MissionConfig, SeedAllocation, Astronaut, NutrientTarget, CropType } from '../types';
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

// ─── Crop Optimizer ───────────────────────────────────────────
// Given crew needs, food supply runway, and greenhouse area,
// compute an optimal initial planting layout.
function optimizeCropLayout(
  crewTarget: NutrientTarget,
  initialFoodDays: number,
  missionDays: number,
  greenhouseArea: number,
): { allocations: Record<string, number>; reasoning: string[] } {
  const reasoning: string[] = [];
  
  // We need crops producing food by the time pre-packed supply runs out.
  // Priority: fast-growing crops first if food supply is short.
  const urgency = initialFoodDays < 60 ? 'critical' : initialFoodDays < 120 ? 'moderate' : 'comfortable';
  reasoning.push(`Food supply: ${initialFoodDays} sols → urgency: ${urgency}`);

  // Score each crop based on multiple factors
  const scored = SEED_LIBRARY
    .filter(c => c.canGrowHydroponic)  // only hydroponic-capable for Mars
    .map(crop => {
      // Daily caloric yield per m² = (yieldPerM2 * caloriesPerKg) / growthDays
      const dailyCalPerM2 = (crop.yieldPerM2 * crop.caloriesPerKg) / crop.growthDays;
      const dailyProteinPerM2 = (crop.yieldPerM2 * crop.proteinPerKg) / crop.growthDays;
      const dailyVitCPerM2 = (crop.yieldPerM2 * crop.vitaminCPerKg) / crop.growthDays;

      // Speed score — how quickly first harvest arrives (critical if low food supply)
      const speedScore = urgency === 'critical'
        ? Math.max(0, 1 - crop.growthDays / 60)   // heavily penalize slow crops
        : urgency === 'moderate'
        ? Math.max(0, 1 - crop.growthDays / 90)
        : Math.max(0, 1 - crop.growthDays / 150);  // less pressure

      // Must have first harvest before food runs out
      const harvestBeforeRunout = crop.growthDays <= initialFoodDays ? 1 : 0.3;

      // Caloric density score (normalized)
      const calScore = Math.min(1, dailyCalPerM2 / 80);
      // Protein score
      const protScore = Math.min(1, dailyProteinPerM2 / 3);
      // Vitamin diversity
      const vitScore = Math.min(1, dailyVitCPerM2 / 10);
      // Mars suitability
      const marsScore = crop.marsSuitability / 10;
      // Difficulty (easier = better)
      const diffScore = crop.difficulty === 'easy' ? 1 : crop.difficulty === 'moderate' ? 0.7 : 0.4;

      // Weighted composite
      const total = (
        calScore * 0.30 +
        protScore * 0.20 +
        vitScore * 0.10 +
        speedScore * 0.15 +
        harvestBeforeRunout * 0.10 +
        marsScore * 0.10 +
        diffScore * 0.05
      );

      return { crop, total, dailyCalPerM2, dailyProteinPerM2 };
    })
    .sort((a, b) => b.total - a.total);

  // Greedy allocation: fill greenhouse area with top-scoring crops
  const allocations: Record<string, number> = {};
  const targetCalPerDay = crewTarget.dailyCalories;
  const remainingMissionDays = missionDays - initialFoodDays;
  
  // Pick top crops ensuring category diversity
  const usedCategories = new Set<string>();
  const selected: typeof scored = [];
  
  // First pass: pick best from each category
  for (const s of scored) {
    if (!usedCategories.has(s.crop.category) && selected.length < 8) {
      selected.push(s);
      usedCategories.add(s.crop.category);
    }
  }
  // Second pass: fill remaining slots with top scorers
  for (const s of scored) {
    if (selected.length >= 8) break;
    if (!selected.includes(s)) {
      selected.push(s);
    }
  }

  // Sort selected by score descending for allocation priority
  selected.sort((a, b) => b.total - a.total);

  // Allocate area proportionally to the FULL greenhouse area
  const totalScore = selected.reduce((s, c) => s + c.total, 0);
  for (const s of selected) {
    const proportion = s.total / totalScore;
    allocations[s.crop.id] = Math.max(5, Math.round(greenhouseArea * proportion));
  }

  // Adjust so the total exactly equals the greenhouse area
  let allocated = Object.values(allocations).reduce((s, v) => s + v, 0);
  if (allocated !== greenhouseArea && selected.length > 0) {
    allocations[selected[0].crop.id] += greenhouseArea - allocated;
  }

  // Build reasoning
  const topPick = selected[0];
  if (urgency === 'critical') {
    reasoning.push(`⚠️ Only ${initialFoodDays} sols of food — prioritizing fast-growing crops`);
    const fastCrops = selected.filter(s => s.crop.growthDays <= initialFoodDays);
    reasoning.push(`Fast harvest crops (≤${initialFoodDays}d): ${fastCrops.map(s => s.crop.name).join(', ')}`);
  } else if (urgency === 'moderate') {
    reasoning.push(`Moderate food runway — balanced mix of fast and calorie-dense crops`);
  } else {
    reasoning.push(`Comfortable ${initialFoodDays}-sol food supply — optimizing for long-term nutrition`);
  }
  reasoning.push(`Top pick: ${topPick.crop.emoji} ${topPick.crop.name} (${topPick.dailyCalPerM2.toFixed(0)} kcal/m²/day)`);
  reasoning.push(`Selected ${Object.keys(allocations).length} crops across ${usedCategories.size} categories`);

  const estDailyCal = selected.reduce((s, c) => {
    const area = allocations[c.crop.id] ?? 0;
    return s + c.dailyCalPerM2 * area;
  }, 0);
  reasoning.push(`Estimated yield: ~${Math.round(estDailyCal).toLocaleString()} kcal/day (target: ${targetCalPerDay.toLocaleString()})`);

  return { allocations, reasoning };
}

export default function MissionSetup({ crew, crewTarget, onUpdateCrew, onLaunch }: Props) {
  const [step, setStep] = useState<SetupStep>('crew');

  // Mission params
  const [missionDays, setMissionDays] = useState(450);
  const [greenhouseArea, setGreenhouseArea] = useState(120);
  const [initialFoodDays, setInitialFoodDays] = useState(90);

  // Resources
  const [waterReservoir, setWaterReservoir] = useState(8000);
  const [waterCapacity, setWaterCapacity] = useState(10000);
  const [energyStored, setEnergyStored] = useState(500);
  const [energyCapacity, setEnergyCapacity] = useState(800);
  const [nutrientReservoir, setNutrientReservoir] = useState(2000);
  const [nutrientCapacity, setNutrientCapacity] = useState(2500);

  // Seed selection — starts empty, gets populated by optimizer
  const [seedAllocations, setSeedAllocations] = useState<Record<string, number>>({});
  const [hasOptimized, setHasOptimized] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string[]>([]);

  const allocatedArea = useMemo(
    () => Object.values(seedAllocations).reduce((s, v) => s + v, 0),
    [seedAllocations]
  );
  const remainingArea = greenhouseArea - allocatedArea;

  // Run optimizer when entering seeds step
  const runOptimizer = useCallback(() => {
    const { allocations, reasoning } = optimizeCropLayout(
      crewTarget, initialFoodDays, missionDays, greenhouseArea,
    );
    setSeedAllocations(allocations);
    setAiReasoning(reasoning);
    setHasOptimized(true);
  }, [crewTarget, initialFoodDays, missionDays, greenhouseArea]);

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
      initialFoodDays,
      waterReservoir,
      waterCapacity,
      energyStored,
      energyCapacity,
      nutrientReservoir,
      nutrientCapacity,
      selectedSeeds,
    });
  };

  const handleStepChange = (newStep: SetupStep) => {
    // Auto-run optimizer when entering seeds step
    if (newStep === 'seeds' && !hasOptimized) {
      runOptimizer();
    }
    setStep(newStep);
  };

  const stepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div className="flex flex-col h-full">
      {/* Step Navigation */}
      <div className="relative z-10 flex justify-center gap-2 mb-4">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => handleStepChange(s.id)}
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
                          onChange={e => { setMissionDays(Number(e.target.value)); setHasOptimized(false); }}
                          className="flex-1 accent-orange-500 h-2"
                        />
                        <input
                          type="number"
                          min={90}
                          max={900}
                          value={missionDays}
                          onChange={e => { setMissionDays(Math.max(90, Math.min(900, Number(e.target.value)))); setHasOptimized(false); }}
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
                          onChange={e => { setGreenhouseArea(Number(e.target.value)); setHasOptimized(false); }}
                          className="flex-1 accent-orange-500 h-2"
                        />
                        <input
                          type="number"
                          min={40}
                          max={300}
                          value={greenhouseArea}
                          onChange={e => { setGreenhouseArea(Math.max(40, Math.min(300, Number(e.target.value)))); setHasOptimized(false); }}
                          className="w-24 bg-mars-900/80 border border-mars-700 rounded-lg px-3 py-2 text-white text-center text-lg font-mono"
                        />
                      </div>
                      <p className="text-sm text-white/40 mt-1">Standard: 120 m² (about the size of a large apartment)</p>
                    </div>

                    <div>
                      <label className="block text-lg text-white/80 mb-2">Pre-Packed Food Supply (sols)</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={14}
                          max={300}
                          step={1}
                          value={initialFoodDays}
                          onChange={e => { setInitialFoodDays(Number(e.target.value)); setHasOptimized(false); }}
                          className="flex-1 accent-orange-500 h-2"
                        />
                        <input
                          type="number"
                          min={14}
                          max={300}
                          value={initialFoodDays}
                          onChange={e => { setInitialFoodDays(Math.max(14, Math.min(300, Number(e.target.value)))); setHasOptimized(false); }}
                          className="w-24 bg-mars-900/80 border border-mars-700 rounded-lg px-3 py-2 text-white text-center text-lg font-mono"
                        />
                      </div>
                      <p className="text-sm text-white/40 mt-1">
                        How many sols can the crew survive on pre-packed rations alone?
                        {initialFoodDays < 60 && <span className="text-red-400 ml-1">⚠️ Very tight — fast crops needed!</span>}
                        {initialFoodDays >= 60 && initialFoodDays < 120 && <span className="text-yellow-400 ml-1">Moderate runway</span>}
                        {initialFoodDays >= 120 && <span className="text-green-400 ml-1">Comfortable buffer</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick summary */}
                <div className="glass rounded-2xl p-6 border border-mars-800/50">
                  <h3 className="text-lg font-semibold text-white/80 mb-3">Mission Summary</h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
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
                    <div>
                      <div className="text-3xl font-bold text-yellow-400">{initialFoodDays}</div>
                      <div className="text-sm text-white/50">Food Supply (sols)</div>
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

                {/* AI Reasoning Panel */}
                {aiReasoning.length > 0 && (
                  <div className="glass rounded-2xl p-5 border border-orange-400/30 bg-orange-500/5">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-bold text-orange-300 flex items-center gap-2">
                        🤖 RedHarvester AI — Recommended Crop Layout
                      </h2>
                      <button
                        onClick={runOptimizer}
                        className="text-sm px-4 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/20 transition"
                      >
                        ↻ Re-optimize
                      </button>
                    </div>
                    <div className="space-y-1">
                      {aiReasoning.map((line, i) => (
                        <p key={i} className="text-sm text-white/60">
                          {line.startsWith('⚠️') ? <span className="text-red-400">{line}</span> : line}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Area gauge */}
                <div className="glass rounded-2xl p-5 border border-mars-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-white">🌱 Planting Plan</h2>
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
                  <p className="text-xs text-white/30 mt-1">AI-selected based on {initialFoodDays}-sol food supply and crew of {crew.length}. Adjust below or re-optimize.</p>
                </div>

                {/* Selected crops — compact editable list */}
                {Object.keys(seedAllocations).length > 0 && (
                  <div className="glass rounded-2xl p-5 border border-mars-800/50">
                    <h3 className="text-base font-bold text-white/80 mb-3">Selected Crops ({Object.keys(seedAllocations).length})</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {Object.entries(seedAllocations).map(([cropId, area]) => {
                        const crop = SEED_LIBRARY.find(c => c.id === cropId);
                        if (!crop) return null;
                        return (
                          <div key={cropId} className="rounded-xl p-3 bg-white/8 border border-orange-400/30">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{crop.emoji}</span>
                                <span className="text-sm font-semibold text-white">{crop.name}</span>
                              </div>
                              <button
                                onClick={() => toggleSeed(cropId)}
                                className="text-white/30 hover:text-red-400 text-sm"
                              >✕</button>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-white/40 mb-2">
                              <span>📅 {crop.growthDays}d</span>
                              <span>{Math.round(crop.yieldPerM2 * crop.caloriesPerKg / crop.growthDays)} kcal/m²/d</span>
                              <span className={`px-1 py-0.5 rounded font-bold ${
                                crop.nutriScore === 'A' ? 'bg-green-600 text-white' :
                                crop.nutriScore === 'B' ? 'bg-lime-600 text-white' :
                                'bg-yellow-600 text-white'
                              }`}>{crop.nutriScore}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={1}
                                max={Math.min(80, area + Math.max(0, remainingArea))}
                                value={area}
                                onChange={e => updateSeedArea(cropId, Number(e.target.value))}
                                className="flex-1 accent-orange-500 h-1.5"
                              />
                              <span className="text-sm font-mono text-orange-300 w-14 text-right">{area} m²</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add more crops from catalog */}
                <div className="glass rounded-2xl p-5 border border-mars-800/50">
                  <h3 className="text-base font-bold text-white/60 mb-3">+ Add More Crops</h3>
                  <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                    {SEED_LIBRARY.filter(c => seedAllocations[c.id] === undefined).map(crop => (
                      <button
                        key={crop.id}
                        onClick={() => toggleSeed(crop.id)}
                        disabled={remainingArea <= 0}
                        className="rounded-lg p-2 bg-white/3 border border-mars-800/30 hover:border-mars-700/50 hover:bg-white/5 transition text-left disabled:opacity-30"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{crop.emoji}</span>
                          <span className="text-xs font-medium text-white/70 truncate">{crop.name}</span>
                        </div>
                        <div className="text-[10px] text-white/30 mt-0.5">{crop.growthDays}d · {crop.category}</div>
                      </button>
                    ))}
                  </div>
                </div>
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
            if (idx > 0) handleStepChange(STEPS[idx - 1].id);
          }}
          disabled={stepIdx === 0}
          className="px-6 py-3 rounded-xl text-lg text-white/60 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 disabled:pointer-events-none"
        >
          ← Back
        </button>

        {stepIdx < STEPS.length - 1 ? (
          <button
            onClick={() => handleStepChange(STEPS[stepIdx + 1].id)}
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
