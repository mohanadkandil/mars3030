import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DaySnapshot } from '../types';
import { CREW_NUTRIENTS } from '../data/crops';

interface Props {
  history: DaySnapshot[];
}

export default function HistoryCharts({ history }: Props) {
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

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Calories Chart */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-sun-400" />
            <span className="text-[10px] text-mars-500 uppercase">Calories / day</span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
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
              <Area type="monotone" dataKey="calories" stroke="#eab308" fill="url(#calGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="h-px bg-mars-800 my-1" />
          <div className="text-[9px] text-mars-600">Target: {CREW_NUTRIENTS.dailyCalories.toLocaleString()} kcal/day</div>
        </div>

        {/* Health Chart */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-bio-400" />
            <span className="text-[10px] text-mars-500 uppercase">Avg Crop Health</span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
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
              <Area type="monotone" dataKey="avgHealth" stroke="#22c55e" fill="url(#healthGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Water Chart */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-water-400" />
            <span className="text-[10px] text-mars-500 uppercase">Water Reservoir</span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
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
              <Area type="monotone" dataKey="water" stroke="#0ea5e9" fill="url(#waterGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Energy Chart */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-sun-400" />
            <span className="text-[10px] text-mars-500 uppercase">Energy Stored</span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
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
              <Area type="monotone" dataKey="energy" stroke="#eab308" fill="url(#energyGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
