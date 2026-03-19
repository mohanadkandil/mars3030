import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FoodStoreEntry, ConsumptionEntry, ProductionSnapshot, NutrientTarget } from '../types';
import { SEED_LIBRARY } from '../data/crops';

function getCrop(id: string) {
  return SEED_LIBRARY.find(c => c.id === id)!;
}

interface Props {
  foodStores: Record<string, FoodStoreEntry>;
  consumptionLog: ConsumptionEntry[];
  productionLog: ProductionSnapshot[];
  prePackedCaloriesRemaining: number;
  totalHarvested: number;
  crewTarget: NutrientTarget;
  day: number;
  initialFoodDays: number;
  crewSize: number;
}

type ViewTab = 'stores' | 'harvests' | 'consumption';

export default function HarvestOrganizer({
  foodStores,
  consumptionLog,
  productionLog,
  prePackedCaloriesRemaining,
  totalHarvested,
  crewTarget,
  day,
  initialFoodDays,
  crewSize,
}: Props) {
  const [viewTab, setViewTab] = useState<ViewTab>('stores');

  // Aggregate food store data
  const storeEntries = useMemo(() => {
    return Object.values(foodStores)
      .filter(e => e.totalHarvestedKg > 0)
      .sort((a, b) => b.kgStored - a.kgStored);
  }, [foodStores]);

  const totalStoredKg = useMemo(() =>
    storeEntries.reduce((s, e) => s + e.kgStored, 0),
  [storeEntries]);

  const totalConsumedKg = useMemo(() =>
    storeEntries.reduce((s, e) => s + e.totalConsumedKg, 0),
  [storeEntries]);

  const totalStoredCalories = useMemo(() =>
    storeEntries.reduce((s, e) => s + e.kgStored * getCrop(e.cropId).caloriesPerKg, 0),
  [storeEntries]);

  const prePackedDaysLeft = Math.max(0, Math.round(prePackedCaloriesRemaining / Math.max(1, crewTarget.dailyCalories)));

  const greenhouseDaysOfFood = Math.max(0, Math.round(totalStoredCalories / Math.max(1, crewTarget.dailyCalories)));

  // Per-crop harvest summary for the harvest tab
  const harvestSummary = useMemo(() => {
    const map = new Map<string, { cropId: string; totalKg: number; totalCal: number; totalProt: number; count: number; lastDay: number }>();
    for (const p of productionLog) {
      const existing = map.get(p.cropId);
      if (existing) {
        existing.totalKg += p.yieldKg;
        existing.totalCal += p.calories;
        existing.totalProt += p.protein;
        existing.count += 1;
        existing.lastDay = Math.max(existing.lastDay, p.day);
      } else {
        map.set(p.cropId, {
          cropId: p.cropId,
          totalKg: p.yieldKg,
          totalCal: p.calories,
          totalProt: p.protein,
          count: 1,
          lastDay: p.day,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalCal - a.totalCal);
  }, [productionLog]);

  // Recent consumption (last 10 days)
  const allConsumption = useMemo(() =>
    [...consumptionLog].reverse(),
  [consumptionLog]);

  // Consumption self-sufficiency — what % of crew needs come from greenhouse vs pre-packed
  const recentSelfSufficiency = useMemo(() => {
    const recent = consumptionLog.slice(-10);
    if (recent.length === 0) return 0;
    const totalCal = recent.reduce((s, c) => s + c.totalCalories, 0);
    const fromPrePacked = recent.reduce((s, c) => s + c.fromPrePacked, 0);
    return totalCal > 0 ? Math.round(((totalCal - fromPrePacked) / totalCal) * 100) : 0;
  }, [consumptionLog]);

  const TABS: { id: ViewTab; label: string; icon: string }[] = [
    { id: 'stores', label: 'Food Stores', icon: '📦' },
    { id: 'harvests', label: 'Harvest Log', icon: '🌾' },
    { id: 'consumption', label: 'Consumption', icon: '🍽️' },
  ];

  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col overflow-hidden">
      {/* Header with key metrics */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-bio-400 animate-pulse" />
          <h2 className="text-sm font-semibold text-mars-300 uppercase tracking-wider">Harvest & Food Organizer</h2>
        </div>
        <div className="text-xs text-white/40">Sol {day}</div>
      </div>

      {/* Key metrics bar */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        <MetricCard label="Total Harvested" value={`${Math.round(totalHarvested)} kg`} color="text-bio-400" />
        <MetricCard label="In Storage" value={`${Math.round(totalStoredKg)} kg`} color="text-orange-400" />
        <MetricCard label="Consumed" value={`${Math.round(totalConsumedKg)} kg`} color="text-water-400" />
        <MetricCard
          label="GH Food Supply"
          value={`${greenhouseDaysOfFood} sols`}
          color={greenhouseDaysOfFood > 30 ? 'text-bio-400' : greenhouseDaysOfFood > 10 ? 'text-sun-400' : 'text-alert-400'}
        />
        <MetricCard
          label="Pre-Packed Left"
          value={`${prePackedDaysLeft} sols`}
          color={prePackedDaysLeft > 30 ? 'text-bio-400' : prePackedDaysLeft > 0 ? 'text-sun-400' : 'text-alert-400'}
        />
      </div>

      {/* Self-sufficiency bar */}
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-white/50">Greenhouse Self-Sufficiency</span>
          <span className={`font-bold ${recentSelfSufficiency >= 80 ? 'text-bio-400' : recentSelfSufficiency >= 40 ? 'text-sun-400' : 'text-alert-400'}`}>
            {recentSelfSufficiency}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: recentSelfSufficiency >= 80 ? 'linear-gradient(90deg, #22c55e, #4ade80)' :
                recentSelfSufficiency >= 40 ? 'linear-gradient(90deg, #eab308, #facc15)' :
                'linear-gradient(90deg, #ef4444, #f87171)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${recentSelfSufficiency}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/30 mt-0.5">
          <span>🥫 Pre-packed supply</span>
          <span>🌱 Greenhouse crops</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-3">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewTab === tab.id
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {viewTab === 'stores' && (
            <motion.div key="stores" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {storeEntries.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-sm">No harvests yet — crops are still growing</p>
                  <p className="text-xs mt-1">Crew is consuming pre-packed supplies ({prePackedDaysLeft} sols remaining)</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {storeEntries.map(entry => {
                    const crop = getCrop(entry.cropId);
                    const storedCal = entry.kgStored * crop.caloriesPerKg;
                    const pctOfTotal = totalStoredKg > 0 ? (entry.kgStored / totalStoredKg) * 100 : 0;
                    return (
                      <div key={entry.cropId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                        <span className="text-xl">{crop.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white/90">{crop.name}</span>
                            <span className="text-sm font-bold text-orange-400">{entry.kgStored.toFixed(1)} kg</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-white/40 mt-0.5">
                            <span>Harvested: {entry.totalHarvestedKg.toFixed(1)} kg ({entry.harvestCount}×)</span>
                            <span>Eaten: {entry.totalConsumedKg.toFixed(1)} kg</span>
                            <span>{Math.round(storedCal)} kcal stored</span>
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, pctOfTotal)}%`,
                                backgroundColor: crop.color,
                                opacity: 0.7,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {viewTab === 'harvests' && (
            <motion.div key="harvests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Per-crop summary */}
              {harvestSummary.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <div className="text-4xl mb-2">🌾</div>
                  <p className="text-sm">No harvests recorded yet</p>
                </div>
              ) : (
                <>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-white/40 border-b border-white/5">
                        <th className="text-left py-2 px-2 font-medium">Crop</th>
                        <th className="text-right py-2 px-2 font-medium">Harvests</th>
                        <th className="text-right py-2 px-2 font-medium">Total Yield</th>
                        <th className="text-right py-2 px-2 font-medium">Calories</th>
                        <th className="text-right py-2 px-2 font-medium">Protein</th>
                        <th className="text-right py-2 px-2 font-medium">Last Harvest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {harvestSummary.map(h => {
                        const crop = getCrop(h.cropId);
                        return (
                          <tr key={h.cropId} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-2">
                                <span>{crop.emoji}</span>
                                <span className="text-white/80">{crop.name}</span>
                              </div>
                            </td>
                            <td className="text-right py-2 px-2 text-white/60">{h.count}×</td>
                            <td className="text-right py-2 px-2 text-orange-400 font-medium">{Math.round(h.totalKg)} kg</td>
                            <td className="text-right py-2 px-2 text-sun-400">{Math.round(h.totalCal).toLocaleString()}</td>
                            <td className="text-right py-2 px-2 text-bio-400">{Math.round(h.totalProt)}g</td>
                            <td className="text-right py-2 px-2 text-white/40">Sol {h.lastDay}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/10 text-white/70 font-medium">
                        <td className="py-2 px-2">Total</td>
                        <td className="text-right py-2 px-2">{harvestSummary.reduce((s, h) => s + h.count, 0)}×</td>
                        <td className="text-right py-2 px-2 text-orange-400">{Math.round(totalHarvested)} kg</td>
                        <td className="text-right py-2 px-2 text-sun-400">
                          {Math.round(harvestSummary.reduce((s, h) => s + h.totalCal, 0)).toLocaleString()}
                        </td>
                        <td className="text-right py-2 px-2 text-bio-400">
                          {Math.round(harvestSummary.reduce((s, h) => s + h.totalProt, 0))}g
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>

                  {/* Timeline: recent harvest events */}
                  <h3 className="text-xs font-semibold text-white/40 uppercase mt-4 mb-2 px-2">Recent Harvests</h3>
                  <div className="space-y-1">
                    {productionLog.slice(-10).reverse().map((p, i) => {
                      const crop = getCrop(p.cropId);
                      return (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] text-xs">
                          <span className="text-white/30 w-12">Sol {p.day}</span>
                          <span>{crop.emoji}</span>
                          <span className="text-white/70">{crop.name}</span>
                          <span className="ml-auto text-orange-400 font-medium">{p.yieldKg.toFixed(1)} kg</span>
                          <span className="text-sun-400 w-16 text-right">{Math.round(p.calories)} kcal</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {viewTab === 'consumption' && (
            <motion.div key="consumption" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {allConsumption.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <div className="text-4xl mb-2">🍽️</div>
                  <p className="text-sm">No consumption data yet — simulation hasn't started</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {allConsumption.map((c, i) => {
                    const ghPct = c.totalCalories > 0 ? Math.round(((c.totalCalories - c.fromPrePacked) / c.totalCalories) * 100) : 0;
                    const calPct = Math.round((c.totalCalories / crewTarget.dailyCalories) * 100);
                    return (
                      <div key={i} className="px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white/50">Sol {c.day}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className={`font-bold ${calPct >= 90 ? 'text-bio-400' : calPct >= 60 ? 'text-sun-400' : 'text-alert-400'}`}>
                              {Math.round(c.totalCalories).toLocaleString()} kcal
                            </span>
                            <span className="text-white/30">({calPct}% of need)</span>
                          </div>
                        </div>
                        {/* Source bar */}
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                          {c.fromPrePacked > 0 && (
                            <div
                              className="h-full bg-blue-500/60"
                              style={{ width: `${c.totalCalories > 0 ? (c.fromPrePacked / c.totalCalories) * 100 : 0}%` }}
                              title="Pre-packed"
                            />
                          )}
                          <div
                            className="h-full bg-bio-400/60"
                            style={{ width: `${ghPct}%` }}
                            title="Greenhouse"
                          />
                        </div>
                        {/* Items consumed */}
                        {c.items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {c.items.map((item, j) => {
                              const crop = getCrop(item.cropId);
                              return (
                                <span key={j} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-white/60">
                                  {crop.emoji} {item.kgConsumed.toFixed(1)}kg
                                </span>
                              );
                            })}
                            {c.fromPrePacked > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-300">
                                🥫 {Math.round(c.fromPrePacked)} kcal
                              </span>
                            )}
                          </div>
                        )}
                        {c.items.length === 0 && c.fromPrePacked > 0 && (
                          <div className="text-[10px] text-blue-300/60 mt-1">
                            🥫 Crew ate entirely from pre-packed supplies
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 px-2.5 py-2 text-center">
      <div className="text-[10px] text-white/40 mb-0.5">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
