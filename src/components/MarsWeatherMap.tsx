import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MarsWeather } from '../types';
import { fetchNASAMarsWeather, type NASASolWeather, type NASAMarsWeatherResponse } from '../services/nasaApi';

interface Props {
  weather: MarsWeather;
  solHour: number;
  day: number;
  outsideTemp: number;
  insideTemp: number;
  insideHumidity: number;
}

// Wind arrow compass
function WindCompass({ direction, speed, gusts }: { direction: number; speed: number; gusts: number }) {
  return (
    <div className="relative w-full aspect-square max-w-[200px] mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Outer ring */}
        <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(120,113,108,0.2)" strokeWidth="1" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(120,113,108,0.1)" strokeWidth="0.5" strokeDasharray="4 4" />
        <circle cx="100" cy="100" r="46" fill="none" stroke="rgba(120,113,108,0.08)" strokeWidth="0.5" strokeDasharray="2 4" />

        {/* Cardinal labels */}
        {[
          { label: 'N', angle: 0 },
          { label: 'E', angle: 90 },
          { label: 'S', angle: 180 },
          { label: 'W', angle: 270 },
        ].map(({ label, angle }) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          const x = 100 + Math.cos(rad) * 85;
          const y = 100 + Math.sin(rad) * 85;
          return (
            <text key={label} x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
              fill="#a8a29e" fontSize="11" fontWeight="600" fontFamily="Inter">
              {label}
            </text>
          );
        })}

        {/* Intercardinal ticks */}
        {[45, 135, 225, 315].map(angle => {
          const rad = ((angle - 90) * Math.PI) / 180;
          const x1 = 100 + Math.cos(rad) * 88;
          const y1 = 100 + Math.sin(rad) * 88;
          const x2 = 100 + Math.cos(rad) * 92;
          const y2 = 100 + Math.sin(rad) * 92;
          return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#78716c" strokeWidth="1" opacity="0.3" />;
        })}

        {/* Wind gust range (outer arc) */}
        <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="12"
          strokeDasharray={`${(gusts / 50) * 377} 377`}
          transform={`rotate(${direction - 90}, 100, 100)`} />

        {/* Wind direction arrow */}
        <g transform={`rotate(${direction}, 100, 100)`}>
          {/* Arrow shaft */}
          <line x1="100" y1="100" x2="100" y2={100 - Math.min(55, speed * 3.5)} stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
          {/* Arrow head */}
          <polygon
            points={`100,${100 - Math.min(60, speed * 3.5 + 5)} 94,${100 - Math.min(48, speed * 3)} 106,${100 - Math.min(48, speed * 3)}`}
            fill="#f97316"
          />
          {/* Base circle */}
          <circle cx="100" cy="100" r="6" fill="#f97316" opacity="0.8" />
        </g>

        {/* Center speed display */}
        <text x="100" y="118" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Inter">
          {speed}
        </text>
        <text x="100" y="132" textAnchor="middle" fill="#a8a29e" fontSize="9" fontFamily="Inter">
          m/s
        </text>
      </svg>
    </div>
  );
}

// Temperature gauge (vertical thermometer style)
function TempGauge({ label, value, min, max, color }: {
  label: string; value: number; min: number; max: number; color: string;
}) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-mars-400 font-medium">{label}</div>
      <div className="relative w-5 h-28 rounded-full bg-mars-800/80 overflow-hidden border border-mars-700/40">
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{ background: `linear-gradient(to top, ${color}, ${color}88)` }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map(p => (
          <div key={p} className="absolute left-0 right-0 border-t border-mars-700/30" style={{ bottom: `${p}%` }} />
        ))}
      </div>
      <div className="text-center">
        <div className="text-lg font-bold" style={{ color }}>{value}°</div>
        <div className="text-[10px] text-mars-500">{min}° / {max}°</div>
      </div>
    </div>
  );
}

// Stat card
function StatCard({ label, value, unit, icon, color, sublabel }: {
  label: string; value: string | number; unit: string; icon: string; color: string; sublabel?: string;
}) {
  return (
    <div className="bg-mars-900/60 rounded-xl p-4 border border-mars-800/40">
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-mars-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-mars-400 mt-0.5">{unit}</div>
      {sublabel && <div className="text-[10px] text-mars-500 mt-1">{sublabel}</div>}
    </div>
  );
}

// Mars surface mini-map with wind particles
function MarsSurfaceMap({ weather }: { weather: MarsWeather }) {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 400,
      y: Math.random() * 200,
      size: 1 + Math.random() * 2,
      speed: 0.5 + Math.random() * 1.5,
      opacity: 0.2 + Math.random() * 0.4,
    })),
    []
  );

  const windRad = (weather.windDirection * Math.PI) / 180;
  const dx = Math.sin(windRad) * 80;
  const dy = -Math.cos(windRad) * 80;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{
      background: `radial-gradient(ellipse at 60% 40%, #7c2d12, #451a03 50%, #1c0a00 90%)`,
    }}>
      {/* Mars terrain features */}
      <svg viewBox="0 0 400 200" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="crater1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3d1500" />
            <stop offset="70%" stopColor="#5c2000" />
            <stop offset="100%" stopColor="#7c2d12" />
          </radialGradient>
          <filter id="marsBlur">
            <feGaussianBlur stdDeviation="1" />
          </filter>
        </defs>

        {/* Craters */}
        <ellipse cx="80" cy="70" rx="35" ry="30" fill="url(#crater1)" opacity="0.5" />
        <ellipse cx="280" cy="130" rx="50" ry="40" fill="url(#crater1)" opacity="0.4" />
        <ellipse cx="340" cy="50" rx="20" ry="18" fill="url(#crater1)" opacity="0.3" />
        <ellipse cx="160" cy="160" rx="25" ry="20" fill="url(#crater1)" opacity="0.35" />

        {/* Ridge lines */}
        <path d="M0 120 Q100 100 200 130 Q300 160 400 120" fill="none" stroke="#92400e" strokeWidth="1" opacity="0.3" />
        <path d="M0 80 Q150 60 250 90 Q350 110 400 80" fill="none" stroke="#78350f" strokeWidth="0.7" opacity="0.2" />

        {/* Greenhouse marker */}
        <g transform="translate(200, 100)">
          <rect x="-12" y="-6" width="24" height="12" rx="3" fill="#22c55e" opacity="0.4" stroke="#22c55e" strokeWidth="0.8" />
          <text x="0" y="3" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">GH</text>
          {/* Pulse ring */}
          <circle cx="0" cy="0" r="16" fill="none" stroke="#22c55e" strokeWidth="0.5" opacity="0.6">
            <animate attributeName="r" values="16;24;16" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Wind particles */}
        {particles.map(p => (
          <circle key={p.id} r={p.size} fill="#fdba74" opacity={p.opacity * (weather.dustOpacity > 1 ? 1.5 : 0.8)}>
            <animateMotion
              dur={`${3 / (weather.windSpeed / 8 * p.speed)}s`}
              repeatCount="indefinite"
              path={`M${p.x},${p.y} l${dx * p.speed},${dy * p.speed}`}
            />
          </circle>
        ))}

        {/* Dust overlay during storms */}
        {weather.dustOpacity > 1.5 && (
          <rect x="0" y="0" width="400" height="200" fill="#92400e" opacity={Math.min(0.4, weather.dustOpacity * 0.1)}>
            <animate attributeName="opacity" values={`${weather.dustOpacity * 0.08};${weather.dustOpacity * 0.12};${weather.dustOpacity * 0.08}`} dur="3s" repeatCount="indefinite" />
          </rect>
        )}
      </svg>

      {/* Labels overlay */}
      <div className="absolute top-3 left-4 text-[10px] text-orange-300/60 font-mono">
        Jezero Region · {weather.solarLongitude}° Ls
      </div>
      <div className="absolute bottom-3 right-4 text-[10px] text-orange-300/60 font-mono">
        {weather.season}
      </div>
    </div>
  );
}

// Crop impact assessment
function CropImpact({ weather, insideTemp }: { weather: MarsWeather; insideTemp: number }) {
  const risks: { label: string; level: 'good' | 'warn' | 'danger'; detail: string }[] = [];

  if (weather.dustOpacity > 2) {
    risks.push({ label: 'Solar Availability', level: 'danger', detail: `Dust storm active (τ=${weather.dustOpacity}). Light reduced >70%.` });
  } else if (weather.dustOpacity > 0.8) {
    risks.push({ label: 'Solar Availability', level: 'warn', detail: `Elevated dust (τ=${weather.dustOpacity}). Light reduced ~${Math.round(weather.dustOpacity * 30)}%.` });
  } else {
    risks.push({ label: 'Solar Availability', level: 'good', detail: `Clear skies (τ=${weather.dustOpacity}). Full solar exposure.` });
  }

  if (weather.surfaceTemp < -90) {
    risks.push({ label: 'External Temperature', level: 'danger', detail: `Extreme cold (${weather.surfaceTemp}°C). Heating load critical.` });
  } else if (weather.surfaceTemp < -70) {
    risks.push({ label: 'External Temperature', level: 'warn', detail: `Very cold (${weather.surfaceTemp}°C). Increased heating demand.` });
  } else {
    risks.push({ label: 'External Temperature', level: 'good', detail: `Moderate for Mars (${weather.surfaceTemp}°C). Normal heating load.` });
  }

  if (weather.windSpeed > 20) {
    risks.push({ label: 'Wind Stress', level: 'danger', detail: `High winds (${weather.windSpeed} m/s). Structure stress concern.` });
  } else if (weather.windSpeed > 12) {
    risks.push({ label: 'Wind Stress', level: 'warn', detail: `Moderate winds (${weather.windSpeed} m/s). Monitor structure integrity.` });
  } else {
    risks.push({ label: 'Wind Stress', level: 'good', detail: `Light winds (${weather.windSpeed} m/s). No structural concern.` });
  }

  if (weather.uvIndex > 10) {
    risks.push({ label: 'UV Radiation', level: 'warn', detail: `High UV (${weather.uvIndex}). EVA time limited. Greenhouse shielded.` });
  } else {
    risks.push({ label: 'UV Radiation', level: 'good', detail: `UV index ${weather.uvIndex}. Safe for greenhouse operations.` });
  }

  const levelColors = { good: '#22c55e', warn: '#eab308', danger: '#ef4444' };
  const levelLabels = { good: 'OK', warn: 'CAUTION', danger: 'ALERT' };

  return (
    <div className="space-y-2">
      {risks.map(r => (
        <div key={r.label} className="flex items-start gap-3 bg-mars-900/40 rounded-lg p-3 border border-mars-800/30">
          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: levelColors[r.level], boxShadow: `0 0 6px ${levelColors[r.level]}` }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{r.label}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: levelColors[r.level], background: `${levelColors[r.level]}15` }}>
                {levelLabels[r.level]}
              </span>
            </div>
            <div className="text-xs text-mars-400 mt-0.5">{r.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// NASA InSight real data panel  
function NASADataPanel({ data, selectedSol, onSelectSol }: {
  data: NASAMarsWeatherResponse | null;
  selectedSol: number;
  onSelectSol: (i: number) => void;
}) {
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-pulse">📡</div>
          <div className="text-sm text-mars-400">Connecting to NASA InSight API...</div>
        </div>
      </div>
    );
  }

  const sol = data.sols[selectedSol];
  if (!sol) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/200px-NASA_logo.svg.png"
              alt="NASA" className="h-5 w-auto" crossOrigin="anonymous" />
            <span className="text-sm font-bold text-white">InSight Weather Station</span>
          </div>
          <div className="text-[10px] text-mars-500 mt-0.5">{data.source}</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400">LIVE API</span>
        </div>
      </div>

      {/* Sol selector */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {data.sols.map((s, i) => (
          <button
            key={s.sol}
            onClick={() => onSelectSol(i)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              i === selectedSol
                ? 'bg-orange-500/30 text-orange-300 ring-1 ring-orange-500/40'
                : 'bg-mars-900/40 text-mars-500 hover:text-mars-300 hover:bg-mars-800/40'
            }`}
          >
            Sol {s.sol}
          </button>
        ))}
      </div>

      {/* Selected sol data */}
      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        <div className="text-[10px] text-mars-500 font-mono">
          {sol.firstUTC} → {sol.lastUTC}
        </div>
        <div className="text-xs text-mars-400">
          {sol.northernSeason} (north) · {sol.southernSeason} (south)
        </div>

        {/* Temperature */}
        {sol.temperature && (
          <div className="bg-mars-900/50 rounded-xl p-3 border border-mars-800/30">
            <div className="text-[10px] text-mars-500 uppercase tracking-wider mb-1.5">🌡️ Air Temperature</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-mars-500">Min</div>
                <div className="text-lg font-bold text-blue-400">{sol.temperature.min}°C</div>
              </div>
              <div>
                <div className="text-xs text-mars-500">Average</div>
                <div className="text-xl font-bold text-orange-400">{sol.temperature.avg}°C</div>
              </div>
              <div>
                <div className="text-xs text-mars-500">Max</div>
                <div className="text-lg font-bold text-red-400">{sol.temperature.max}°C</div>
              </div>
            </div>
            {/* Temperature bar */}
            <div className="mt-2 relative h-3 bg-mars-800 rounded-full overflow-hidden">
              <div
                className="absolute h-full rounded-full"
                style={{
                  background: 'linear-gradient(to right, #3b82f6, #f97316, #ef4444)',
                  left: `${((sol.temperature.min + 120) / 140) * 100}%`,
                  right: `${100 - ((sol.temperature.max + 120) / 140) * 100}%`,
                }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-white"
                style={{ left: `${((sol.temperature.avg + 120) / 140) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-mars-600 mt-0.5">
              <span>-120°C</span>
              <span>+20°C</span>
            </div>
          </div>
        )}

        {/* Wind */}
        {sol.wind && (
          <div className="bg-mars-900/50 rounded-xl p-3 border border-mars-800/30">
            <div className="text-[10px] text-mars-500 uppercase tracking-wider mb-1.5">💨 Horizontal Wind</div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-xs text-mars-500">Avg</div>
                <div className="text-lg font-bold text-cyan-400">{sol.wind.avg} m/s</div>
              </div>
              <div>
                <div className="text-xs text-mars-500">Min</div>
                <div className="text-sm font-bold text-mars-300">{sol.wind.min}</div>
              </div>
              <div>
                <div className="text-xs text-mars-500">Gust Max</div>
                <div className="text-lg font-bold text-red-400">{sol.wind.max} m/s</div>
              </div>
              <div>
                <div className="text-xs text-mars-500">Direction</div>
                <div className="text-lg font-bold text-yellow-400">{sol.wind.direction}</div>
              </div>
            </div>
          </div>
        )}

        {/* Pressure */}
        {sol.pressure && (
          <div className="bg-mars-900/50 rounded-xl p-3 border border-mars-800/30">
            <div className="text-[10px] text-mars-500 uppercase tracking-wider mb-1.5">🌬️ Atmospheric Pressure</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-mars-500">Min</div>
                <div className="text-sm font-bold text-mars-300">{sol.pressure.min} Pa</div>
              </div>
              <div>
                <div className="text-xs text-mars-500">Average</div>
                <div className="text-xl font-bold text-purple-400">{sol.pressure.avg} Pa</div>
              </div>
              <div>
                <div className="text-xs text-mars-500">Max</div>
                <div className="text-sm font-bold text-mars-300">{sol.pressure.max} Pa</div>
              </div>
            </div>
            <div className="text-[10px] text-mars-600 mt-1 text-center">
              Earth sea level: 101,325 Pa — Mars is ~0.7% of Earth's pressure
            </div>
          </div>
        )}

        {/* Multi-sol comparison mini chart */}
        <div className="bg-mars-900/50 rounded-xl p-3 border border-mars-800/30">
          <div className="text-[10px] text-mars-500 uppercase tracking-wider mb-2">📊 7-Sol Temperature Trend</div>
          <div className="flex items-end gap-1 h-16">
            {data.sols.map((s, i) => {
              if (!s.temperature) return null;
              const pct = Math.max(5, ((s.temperature.avg + 120) / 140) * 100);
              return (
                <div key={s.sol} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="text-[8px] text-mars-500">{Math.round(s.temperature.avg)}°</div>
                  <motion.div
                    className={`w-full rounded-t ${i === selectedSol ? 'bg-orange-500' : 'bg-mars-600'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  />
                  <div className={`text-[8px] ${i === selectedSol ? 'text-orange-400 font-bold' : 'text-mars-600'}`}>{s.sol}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Interactive Mars globe map — custom SVG with MOLA topography, landmarks, and weather overlay
function MarsInteractiveMap({ weather }: { weather: MarsWeather }) {
  const [hoveredLandmark, setHoveredLandmark] = useState<string | null>(null);

  // Key Mars landmarks with lat/lon → map coords (simple equirectangular)
  const landmarks = useMemo(() => [
    { name: 'Jezero Crater (Greenhouse)', lat: 18.4, lon: 77.5, type: 'greenhouse' as const, desc: 'Perseverance rover landing site. Greenhouse location.' },
    { name: 'Olympus Mons', lat: 18.6, lon: -133.0, type: 'volcano' as const, desc: 'Tallest volcano in the solar system, 21.9 km.' },
    { name: 'Valles Marineris', lat: -14.0, lon: -59.0, type: 'canyon' as const, desc: '4,000 km canyon system, up to 7 km deep.' },
    { name: 'Hellas Planitia', lat: -42.4, lon: 70.0, type: 'basin' as const, desc: 'Deepest impact basin, 7,152 m below datum.' },
    { name: 'Gale Crater (Curiosity)', lat: -5.4, lon: 137.8, type: 'rover' as const, desc: 'Curiosity rover landing site, 2012.' },
    { name: 'Elysium (InSight)', lat: 4.5, lon: 135.6, type: 'lander' as const, desc: 'InSight lander — weather data source.' },
    { name: 'Tharsis Bulge', lat: 0, lon: -100, type: 'volcano' as const, desc: 'Volcanic plateau, three shield volcanoes.' },
    { name: 'Syrtis Major', lat: 8.4, lon: 69.5, type: 'region' as const, desc: 'Dark volcanic region, visible from Earth.' },
    { name: 'Utopia Planitia', lat: 46.7, lon: 110.0, type: 'basin' as const, desc: 'Viking 2 & Zhurong landing site. Ice deposits.' },
    { name: 'Polar Ice Cap (N)', lat: 85, lon: 0, type: 'ice' as const, desc: 'Northern polar ice cap — water + CO₂ ice.' },
    { name: 'Polar Ice Cap (S)', lat: -85, lon: 0, type: 'ice' as const, desc: 'Southern polar ice cap — mostly CO₂ ice.' },
  ], []);

  const typeEmoji = { greenhouse: '🏠', volcano: '🌋', canyon: '🏜️', basin: '🕳️', rover: '🤖', lander: '📡', region: '🗺️', ice: '🧊' };
  const typeColor = { greenhouse: '#22c55e', volcano: '#ef4444', canyon: '#f97316', basin: '#8b5cf6', rover: '#3b82f6', lander: '#06b6d4', region: '#a8a29e', ice: '#93c5fd' };

  // Convert lat/lon to SVG coords (800x400, equirectangular)
  const toSvg = (lat: number, lon: number): [number, number] => {
    const x = ((lon + 180) / 360) * 800;
    const y = ((90 - lat) / 180) * 400;
    return [x, y];
  };

  // Wind arrow for each wind "station" across the map
  const windRad = (weather.windDirection * Math.PI) / 180;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🪐</span>
          <span className="text-sm font-bold text-white">Mars Global Map — MOLA Topography</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-mars-500">
          <span>Click landmarks for details</span>
          <span>·</span>
          <span>Wind: {weather.windSpeed} m/s from {weather.windDirection}°</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-mars-700/40 relative">
        <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            {/* Mars-like topographic gradient fill */}
            <linearGradient id="marsTopoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8c4a0" />
              <stop offset="30%" stopColor="#c4823c" />
              <stop offset="50%" stopColor="#a0522d" />
              <stop offset="70%" stopColor="#8b3a1a" />
              <stop offset="100%" stopColor="#4a1a00" />
            </linearGradient>
            {/* Polar ice gradient */}
            <radialGradient id="polarNorth" cx="50%" cy="0%" r="20%">
              <stop offset="0%" stopColor="#e8e8ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e8e8ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="polarSouth" cx="50%" cy="100%" r="20%">
              <stop offset="0%" stopColor="#d4d4ff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d4d4ff" stopOpacity="0" />
            </radialGradient>
            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowSmall">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Base Mars surface */}
          <rect width="800" height="400" fill="#8b3a1a" />

          {/* Topo features — simplified MOLA-inspired shapes */}
          {/* Tharsis bulge (light/high terrain) */}
          <ellipse cx={toSvg(5, -105)[0]} cy={toSvg(5, -105)[1]} rx="80" ry="70" fill="#c4823c" opacity="0.6" />
          {/* Olympus Mons */}
          <circle cx={toSvg(18.6, -133)[0]} cy={toSvg(18.6, -133)[1]} r="25" fill="#d4954c" opacity="0.5" />
          <circle cx={toSvg(18.6, -133)[0]} cy={toSvg(18.6, -133)[1]} r="10" fill="#e8c4a0" opacity="0.4" />
          {/* Valles Marineris (dark canyon) */}
          <path d={`M${toSvg(-14, -100).join(',')} Q${toSvg(-12, -70).join(',')} ${toSvg(-14, -35).join(',')}`}
            fill="none" stroke="#4a1a00" strokeWidth="8" opacity="0.7" strokeLinecap="round" />
          {/* Hellas Planitia (deep basin—dark) */}
          <ellipse cx={toSvg(-42.4, 70)[0]} cy={toSvg(-42.4, 70)[1]} rx="50" ry="40" fill="#3d1500" opacity="0.5" />
          {/* Isidis Planitia */}
          <ellipse cx={toSvg(12, 87)[0]} cy={toSvg(12, 87)[1]} rx="30" ry="25" fill="#6b2c12" opacity="0.4" />
          {/* Syrtis Major (dark) */}
          <ellipse cx={toSvg(8.4, 69.5)[0]} cy={toSvg(8.4, 69.5)[1]} rx="20" ry="35" fill="#2d1000" opacity="0.4" />
          {/* Arabia Terra (light) */}
          <ellipse cx={toSvg(25, 20)[0]} cy={toSvg(25, 20)[1]} rx="60" ry="40" fill="#c47030" opacity="0.3" />
          {/* Utopia Planitia */}
          <ellipse cx={toSvg(46.7, 110)[0]} cy={toSvg(46.7, 110)[1]} rx="55" ry="35" fill="#5a2510" opacity="0.4" />
          {/* Elysium Mons */}
          <circle cx={toSvg(25, 147)[0]} cy={toSvg(25, 147)[1]} r="18" fill="#b07040" opacity="0.5" />
          {/* Chryse Planitia */}
          <ellipse cx={toSvg(28, -40)[0]} cy={toSvg(28, -40)[1]} rx="35" ry="25" fill="#6b3020" opacity="0.35" />
          {/* Argyre Planitia */}
          <ellipse cx={toSvg(-50, -43)[0]} cy={toSvg(-50, -43)[1]} rx="30" ry="25" fill="#4a1a08" opacity="0.4" />

          {/* Polar ice caps */}
          <rect x="0" y="0" width="800" height="400" fill="url(#polarNorth)" />
          <rect x="0" y="0" width="800" height="400" fill="url(#polarSouth)" />
          {/* Explicit cap shapes */}
          <ellipse cx="400" cy="5" rx="350" ry="35" fill="#d4d4ee" opacity="0.25" />
          <ellipse cx="400" cy="395" rx="300" ry="25" fill="#c4c4dd" opacity="0.2" />

          {/* Lat/lon grid */}
          {[-60, -30, 0, 30, 60].map(lat => {
            const y = ((90 - lat) / 180) * 400;
            return <line key={`lat${lat}`} x1="0" y1={y} x2="800" y2={y} stroke="#ffffff" strokeWidth="0.3" opacity="0.08" />;
          })}
          {[-120, -60, 0, 60, 120].map(lon => {
            const x = ((lon + 180) / 360) * 800;
            return <line key={`lon${lon}`} x1={x} y1="0" x2={x} y2="400" stroke="#ffffff" strokeWidth="0.3" opacity="0.08" />;
          })}

          {/* Wind arrows scattered across map */}
          {Array.from({ length: 12 }).map((_, i) => {
            const cx = 50 + (i % 4) * 200 + 60;
            const cy = 60 + Math.floor(i / 4) * 120 + 40;
            const len = 8 + weather.windSpeed * 0.8;
            const dx = Math.sin(windRad) * len;
            const dy = -Math.cos(windRad) * len;
            return (
              <g key={`wind${i}`} opacity={0.35}>
                <line x1={cx} y1={cy} x2={cx + dx} y2={cy + dy} stroke="#fdba74" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx={cx + dx} cy={cy + dy} r="2" fill="#fdba74" />
              </g>
            );
          })}

          {/* Dust overlay */}
          {weather.dustOpacity > 0.8 && (
            <rect width="800" height="400" fill="#92400e" opacity={Math.min(0.3, weather.dustOpacity * 0.08)}>
              <animate attributeName="opacity" values={`${weather.dustOpacity * 0.05};${weather.dustOpacity * 0.09};${weather.dustOpacity * 0.05}`} dur="4s" repeatCount="indefinite" />
            </rect>
          )}

          {/* Landmark markers */}
          {landmarks.map(lm => {
            const [x, y] = toSvg(lm.lat, lm.lon);
            const isHovered = hoveredLandmark === lm.name;
            const isGreenhouse = lm.type === 'greenhouse';
            const color = typeColor[lm.type];
            return (
              <g key={lm.name}
                onMouseEnter={() => setHoveredLandmark(lm.name)}
                onMouseLeave={() => setHoveredLandmark(null)}
                className="cursor-pointer"
              >
                {/* Marker */}
                <circle cx={x} cy={y} r={isGreenhouse ? 8 : 5} fill={color} opacity={isHovered ? 1 : 0.8}
                  filter={isGreenhouse ? 'url(#glow)' : undefined}
                  stroke={isHovered ? 'white' : 'none'} strokeWidth={isHovered ? 1.5 : 0}
                />
                {isGreenhouse && (
                  <circle cx={x} cy={y} r="14" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5">
                    <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Label (always visible for greenhouse, on hover for others) */}
                {(isHovered || isGreenhouse) && (
                  <g>
                    <rect x={x + 10} y={y - 12} width={Math.min(200, lm.name.length * 6.5 + 20)} height={isHovered ? 32 : 18}
                      rx="4" fill="rgba(0,0,0,0.85)" stroke={color} strokeWidth="0.5" />
                    <text x={x + 16} y={y} fill="white" fontSize="9" fontWeight="600" fontFamily="Inter">{lm.name}</text>
                    {isHovered && (
                      <text x={x + 16} y={y + 12} fill="#a8a29e" fontSize="7" fontFamily="Inter">{lm.desc}</text>
                    )}
                  </g>
                )}
              </g>
            );
          })}

          {/* Legend */}
          <rect x="10" y="360" width="170" height="32" rx="4" fill="rgba(0,0,0,0.7)" />
          <text x="18" y="374" fill="#a8a29e" fontSize="7" fontFamily="Inter">
            🏠 GH  🌋 Volcano  🕳️ Basin  🤖 Rover  📡 Lander  🏜️ Canyon
          </text>
          <text x="18" y="386" fill="#78716c" fontSize="6.5" fontFamily="Inter">
            Imagery: MOLA topography (NASA/JPL/GSFC) — Equirectangular projection
          </text>
        </svg>
      </div>
    </div>
  );
}

export default function MarsWeatherMap({ weather, solHour, day, outsideTemp, insideTemp, insideHumidity }: Props) {
  const isDaytime = solHour >= 6 && solHour < 18;
  const [nasaData, setNasaData] = useState<NASAMarsWeatherResponse | null>(null);
  const [selectedSol, setSelectedSol] = useState(0);
  const [activeView, setActiveView] = useState<'map' | 'sim'>('map');

  useEffect(() => {
    fetchNASAMarsWeather().then(setNasaData);
  }, []);

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Top row: NASA Mars Trek map + Real NASA data */}
      <div className="grid grid-cols-12 gap-3" style={{ height: '50%' }}>
        {/* Interactive Mars Trek Map */}
        <div className="col-span-8 glass rounded-2xl p-4 flex flex-col">
          {/* View toggle */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setActiveView('map')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeView === 'map' ? 'bg-orange-500/30 text-orange-300' : 'text-mars-500 hover:text-mars-300'
              }`}
            >
              🗺️ Mars Global Map
            </button>
            <button
              onClick={() => setActiveView('sim')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeView === 'sim' ? 'bg-orange-500/30 text-orange-300' : 'text-mars-500 hover:text-mars-300'
              }`}
            >
              🌪️ Simulation Wind Map
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-3 text-xs text-mars-400">
              <span>{isDaytime ? '☀️' : '🌙'} Sol {day}</span>
              <span className="px-2 py-1 rounded-lg bg-mars-800/60 text-mars-300 font-medium">{weather.season}</span>
              <span>Ls = {weather.solarLongitude}°</span>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {activeView === 'map' ? (
              <MarsInteractiveMap weather={weather} />
            ) : (
              <MarsSurfaceMap weather={weather} />
            )}
          </div>
        </div>

        {/* Real NASA InSight data */}
        <div className="col-span-4 glass rounded-2xl p-4">
          <NASADataPanel data={nasaData} selectedSol={selectedSol} onSelectSol={setSelectedSol} />
        </div>
      </div>

      {/* Bottom row: Simulation weather + Wind compass + Temps + Crop impact */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Atmospheric stats (sim) */}
        <div className="col-span-3 glass rounded-2xl p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-mars-300 uppercase tracking-wider mb-3">Sim Atmosphere</h3>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Pressure" value={weather.pressure} unit="Pa" icon="🌡️" color="#60a5fa" sublabel="Earth: ~101,325 Pa" />
            <StatCard label="Dust" value={weather.dustOpacity} unit="τ opacity" icon="🌫️"
              color={weather.dustOpacity > 1.5 ? '#ef4444' : weather.dustOpacity > 0.7 ? '#eab308' : '#22c55e'}
              sublabel={weather.dustOpacity > 1.5 ? 'Storm!' : 'Normal'} />
            <StatCard label="UV" value={weather.uvIndex} unit="index" icon="☢️"
              color={weather.uvIndex > 10 ? '#ef4444' : '#f97316'} />
            <StatCard label="Solar" value={weather.solarIrradiance} unit="W/m²" icon="🔆" color="#fbbf24" />
            <StatCard label="Humidity" value={`${(weather.humidity * 100).toFixed(2)}%`} unit="" icon="💧" color="#38bdf8" />
            <StatCard label="CO₂" value="95.3%" unit="" icon="🫧" color="#a78bfa" />
          </div>
        </div>

        {/* Wind compass */}
        <div className="col-span-2 glass rounded-2xl p-4 flex flex-col">
          <h3 className="text-sm font-semibold text-mars-300 uppercase tracking-wider mb-2">Wind</h3>
          <div className="flex-1 flex items-center justify-center">
            <WindCompass direction={weather.windDirection} speed={weather.windSpeed} gusts={weather.windGusts} />
          </div>
          <div className="text-center mt-1">
            <span className="text-[10px] text-mars-400">
              Gusts <strong className="text-alert-400">{weather.windGusts} m/s</strong>
              {' '}· {weather.windDirection}°
            </span>
          </div>
        </div>

        {/* Temperature gauges */}
        <div className="col-span-3 glass rounded-2xl p-4 flex flex-col">
          <h3 className="text-sm font-semibold text-mars-300 uppercase tracking-wider mb-3">Temperatures</h3>
          <div className="flex-1 flex items-center justify-around">
            <TempGauge label="Surface" value={Math.round(weather.surfaceTemp)} min={-120} max={20} color="#f97316" />
            <div className="w-px h-24 bg-mars-800/50" />
            <TempGauge label="Greenhouse" value={Math.round(insideTemp)} min={0} max={40} color="#22c55e" />
          </div>
          <div className="mt-2 pt-2 border-t border-mars-800/50">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-[10px] text-mars-500">Sol Range</div>
                <div className="text-sm font-bold text-orange-400">{weather.surfaceTempMin}° / {weather.surfaceTempMax}°</div>
              </div>
              <div>
                <div className="text-[10px] text-mars-500">GH Humidity</div>
                <div className="text-sm font-bold text-water-400">{Math.round(insideHumidity)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Crop impact assessment */}
        <div className="col-span-4 glass rounded-2xl p-4 flex flex-col overflow-hidden">
          <h3 className="text-sm font-semibold text-mars-300 uppercase tracking-wider mb-3">🌾 Crop Impact Assessment</h3>
          <div className="flex-1 overflow-y-auto min-h-0">
            <CropImpact weather={weather} insideTemp={insideTemp} />
          </div>
          <div className="mt-2 pt-2 border-t border-mars-800/50 text-[10px] text-mars-500">
            Real weather: NASA InSight SEIS/APSS. Simulation: Mars Climate Sounder model.
            <br />
            Map: NASA/JPL Mars Trek. Greenhouse shielding isolates crops from external conditions.
          </div>
        </div>
      </div>
    </div>
  );
}
