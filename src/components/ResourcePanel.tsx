import { motion } from 'framer-motion';

interface GaugeProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  icon: string;
  glowClass?: string;
}

function Gauge({ label, value, max, unit, color, icon, glowClass }: GaugeProps) {
  const pct = Math.min(100, (value / max) * 100);
  const isLow = pct < 20;

  return (
    <div className={`glass-bright rounded-xl p-3 ${isLow ? 'glow-red' : glowClass || ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-mars-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {Math.round(value).toLocaleString()}
        </span>
        <span className="text-xs text-mars-500">{unit}</span>
      </div>
      <div className="h-1.5 bg-mars-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: isLow ? '#ef4444' : color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-mars-600">0</span>
        <span className="text-[10px] text-mars-600">{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

interface Props {
  water: number;
  waterCapacity: number;
  energy: number;
  energyCapacity: number;
  nutrients: number;
  nutrientCapacity: number;
  solarOutput: number;
  recycleRate: number;
  insideTemp: number;
  insideHumidity: number;
  co2Level: number;
  lightIntensity: number;
}

export default function ResourcePanel(props: Props) {
  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col">
      <h2 className="text-sm font-semibold text-mars-300 uppercase tracking-wider mb-3">Resources</h2>

      <div className="grid grid-cols-2 gap-2 flex-1">
        <Gauge
          label="Water"
          value={props.water}
          max={props.waterCapacity}
          unit="L"
          color="#0ea5e9"
          icon="💧"
          glowClass="glow-blue"
        />
        <Gauge
          label="Energy"
          value={props.energy}
          max={props.energyCapacity}
          unit="kWh"
          color="#eab308"
          icon="⚡"
        />
        <Gauge
          label="Nutrients"
          value={props.nutrients}
          max={props.nutrientCapacity}
          unit="kg"
          color="#22c55e"
          icon="🧪"
          glowClass="glow-green"
        />
        <div className="glass-bright rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">☀️</span>
            <span className="text-xs font-medium text-mars-400 uppercase tracking-wider">Solar</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums text-sun-400">{Math.round(props.solarOutput)}</span>
            <span className="text-xs text-mars-500">kWh/d</span>
          </div>
        </div>
      </div>

      {/* Environment stats */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { label: 'Temp', value: `${props.insideTemp.toFixed(1)}°C`, icon: '🌡️' },
          { label: 'Humid', value: `${props.insideHumidity.toFixed(0)}%`, icon: '💨' },
          { label: 'CO₂', value: `${Math.round(props.co2Level)}`, icon: '🫧' },
          { label: 'Light', value: `${Math.round(props.lightIntensity)}%`, icon: '💡' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-sm">{s.icon}</div>
            <div className="text-xs font-semibold tabular-nums text-mars-300">{s.value}</div>
            <div className="text-[10px] text-mars-600">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
