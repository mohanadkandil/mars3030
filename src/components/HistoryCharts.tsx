import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DaySnapshot } from '../types';
import { CREW_NUTRIENTS, SEED_LIBRARY } from '../data/crops';

interface Props {
  history: DaySnapshot[];
}

export default function HistoryCharts({ history }: Props) {
  // Derive crop data for the availability chart — use cumulative harvested (always increasing)
  const { cropData, cropIds } = useMemo(() => {
    // Collect all crop IDs from both stores and harvested
    const allCropIds = new Set<string>();
    for (const snap of history) {
      if (snap.cropHarvested) {
        for (const [id, v] of Object.entries(snap.cropHarvested)) { if (v > 0) allCropIds.add(id); }
      } else if (snap.cropStores) {
        for (const [id, v] of Object.entries(snap.cropStores)) { if (v > 0) allCropIds.add(id); }
      }
    }
    const ids = Array.from(allCropIds);

    // Build flat data array — use cumulative harvest totals (always rising, never eaten)
    const data = history.map(snap => {
      const entry: Record<string, number> = { day: snap.day };
      for (const id of ids) {
        entry[id] = snap.cropHarvested?.[id] ?? snap.cropStores?.[id] ?? 0;
      }
      return entry;
    });

    return { cropData: data, cropIds: ids };
  }, [history]);
  if (history.length < 2) {
    return (
      <div className="glass rounded-2xl p-4 h-full flex items-center justify-center">
        <p className="text-xs text-mars-600">Charts will appear as the simulation progresses...</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col">
      <h2 className="text-sm font-semibold text-mars-300 uppercase tracking-wider mb-3">Mission Timeline</h2>

      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Calories Chart — consumed + theoretical output */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-sun-400" />
            <span className="text-[10px] text-mars-500 uppercase">Calories / day</span>
          </div>
          <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eab308" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(68,64,60,0.2)" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#78716c' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#78716c' }} tickLine={false} axisLine={false} width={35} />
              <Tooltip
                contentStyle={{ background: '#1c1917', border: '1px solid #44403c', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#a8a29e' }}
              />
              <Area type="linear" dataKey="dailyOutput" name="Potential yield" stroke="#f97316" fill="url(#outputGrad)" strokeWidth={1} strokeDasharray="4 3" dot={false} />
              <Area type="linear" dataKey="calories" name="Consumed" stroke="#eab308" fill="url(#calGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
          <div className="h-px bg-mars-800 my-1" />
          <div className="text-[9px] text-mars-600">Target: {CREW_NUTRIENTS.dailyCalories.toLocaleString()} kcal/day</div>
        </div>

        {/* Health Chart */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-bio-400" />
            <span className="text-[10px] text-mars-500 uppercase">Avg Crop Health</span>
          </div>
          <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(68,64,60,0.2)" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#78716c' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#78716c' }} tickLine={false} axisLine={false} width={25} />
              <Tooltip
                contentStyle={{ background: '#1c1917', border: '1px solid #44403c', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#a8a29e' }}
              />
              <Area type="linear" dataKey="avgHealth" stroke="#22c55e" fill="url(#healthGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Water Chart */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-water-400" />
            <span className="text-[10px] text-mars-500 uppercase">Water Reservoir</span>
          </div>
          <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(68,64,60,0.2)" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#78716c' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#78716c' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: '#1c1917', border: '1px solid #44403c', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#a8a29e' }}
              />
              <Area type="linear" dataKey="water" stroke="#0ea5e9" fill="url(#waterGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Energy Chart */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-sun-400" />
            <span className="text-[10px] text-mars-500 uppercase">Energy Stored</span>
          </div>
          <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eab308" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(68,64,60,0.2)" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#78716c' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#78716c' }} tickLine={false} axisLine={false} width={35} />
              <Tooltip
                contentStyle={{ background: '#1c1917', border: '1px solid #44403c', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#a8a29e' }}
              />
              <Area type="linear" dataKey="energy" stroke="#eab308" fill="url(#energyGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Crop Availability Chart — stacked area */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-[10px] text-mars-500 uppercase">Total Harvested (kg)</span>
          </div>
          {cropIds.length > 0 ? (
            <>
              <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cropData}>
                  <defs>
                    {cropIds.map(id => {
                      const crop = SEED_LIBRARY.find(c => c.id === id);
                      const color = crop?.color ?? '#888';
                      return (
                        <linearGradient key={id} id={`crop-${id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(68,64,60,0.2)" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#78716c' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#78716c' }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ background: '#1c1917', border: '1px solid #44403c', borderRadius: 8, fontSize: 10 }}
                    labelStyle={{ color: '#a8a29e' }}
                    formatter={(value, name) => {
                      const crop = SEED_LIBRARY.find(c => c.id === String(name));
                      return [`${Number(value).toFixed(1)} kg`, crop ? `${crop.emoji} ${crop.name}` : String(name)];
                    }}
                  />
                  {cropIds.map(id => {
                    const crop = SEED_LIBRARY.find(c => c.id === id);
                    return (
                      <Area
                        key={id}
                        type="linear"
                        dataKey={id}
                        stackId="crops"
                        stroke={crop?.color ?? '#888'}
                        fill={`url(#crop-${id})`}
                        strokeWidth={1}
                        dot={false}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {cropIds.map(id => {
                  const crop = SEED_LIBRARY.find(c => c.id === id);
                  return (
                    <span key={id} className="text-[8px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: crop?.color ?? '#888' }} />
                      <span className="text-mars-500">{crop?.emoji} {crop?.name}</span>
                    </span>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[10px] text-mars-600">No harvests yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
