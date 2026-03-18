import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CropZone } from '../types';
import { CROPS } from '../data/crops';

interface Props {
  zones: CropZone[];
  activeEvents: { type: string }[];
  day: number;
}

function getCrop(id: string) {
  return CROPS.find(c => c.id === id)!;
}

function healthColor(h: number) {
  if (h >= 80) return '#22c55e';
  if (h >= 50) return '#eab308';
  return '#ef4444';
}

function ripenessLabel(progress: number): { text: string; color: string } {
  if (progress >= 0.95) return { text: 'HARVEST', color: '#f59e0b' };
  if (progress >= 0.75) return { text: 'RIPENING', color: '#22c55e' };
  if (progress >= 0.4) return { text: 'GROWING', color: '#0ea5e9' };
  return { text: 'SEEDLING', color: '#8b5cf6' };
}

/* ── Detailed plant shapes per crop type ── */
function PlantSprite({ cropId, x, y, progress, health, size }: {
  cropId: string; x: number; y: number; progress: number; health: number; size: number;
}) {
  const h = size * progress;
  const opacity = 0.5 + health / 200;
  const sway = Math.sin(x * 0.3 + y * 0.2) * 1.5;
  const crop = getCrop(cropId);

  if (cropId === 'lettuce') {
    const leafCount = Math.floor(3 + progress * 5);
    return (
      <g transform={`translate(${x},${y})`} opacity={opacity}>
        <ellipse cx={0} cy={-h * 0.3} rx={size * 0.15} ry={size * 0.2 * progress} fill="#166534" />
        {Array.from({ length: leafCount }).map((_, i) => {
          const angle = (i / leafCount) * 360 + sway;
          const leafLen = h * 0.5 + i * 0.8;
          const rad = (angle * Math.PI) / 180;
          return (
            <ellipse
              key={i}
              cx={Math.cos(rad) * leafLen * 0.4}
              cy={-h * 0.3 + Math.sin(rad) * leafLen * 0.25}
              rx={leafLen * 0.35}
              ry={leafLen * 0.15}
              fill={health > 60 ? crop.color : '#a16207'}
              opacity={0.7 + i * 0.03}
              transform={`rotate(${angle}, ${Math.cos(rad) * leafLen * 0.4}, ${-h * 0.3 + Math.sin(rad) * leafLen * 0.25})`}
            />
          );
        })}
      </g>
    );
  }

  if (cropId === 'potato') {
    const leafPairs = Math.floor(2 + progress * 3);
    return (
      <g transform={`translate(${x},${y})`} opacity={opacity}>
        <ellipse cx={0} cy={2} rx={size * 0.5} ry={size * 0.12} fill="rgba(120,80,40,0.3)" />
        <line x1={sway * 0.3} y1={0} x2={sway * 0.5} y2={-h} stroke="#166534" strokeWidth={1.8} strokeLinecap="round" />
        {Array.from({ length: leafPairs }).map((_, i) => {
          const ly = -h * ((i + 1) / (leafPairs + 1));
          const leafW = size * 0.4 * (1 - i * 0.1);
          return (
            <g key={i}>
              <ellipse cx={-leafW * 0.5 + sway} cy={ly} rx={leafW * 0.5} ry={leafW * 0.2} fill={health > 60 ? '#15803d' : '#a16207'} opacity={0.8} transform={`rotate(-20, ${-leafW * 0.5 + sway}, ${ly})`} />
              <ellipse cx={leafW * 0.5 + sway} cy={ly} rx={leafW * 0.5} ry={leafW * 0.2} fill={health > 60 ? '#22c55e' : '#ca8a04'} opacity={0.7} transform={`rotate(20, ${leafW * 0.5 + sway}, ${ly})`} />
            </g>
          );
        })}
        {progress > 0.7 && <circle cx={sway * 0.5} cy={-h - 2} r={2} fill="#e9d5ff" />}
      </g>
    );
  }

  if (cropId === 'beans') {
    const segments = Math.floor(3 + progress * 4);
    return (
      <g transform={`translate(${x},${y})`} opacity={opacity}>
        <line x1={0} y1={2} x2={0} y2={-h - 4} stroke="rgba(120,113,108,0.4)" strokeWidth={0.8} strokeDasharray="2 2" />
        <path
          d={`M 0,0 ${Array.from({ length: segments }).map((_, i) => {
            const sy = -h * ((i + 1) / (segments + 1));
            const sx = Math.sin(i * 1.2) * size * 0.3;
            return `Q ${sx * 1.5},${sy + 4} ${sx},${sy}`;
          }).join(' ')}`}
          fill="none" stroke="#15803d" strokeWidth={1.2} strokeLinecap="round"
        />
        {Array.from({ length: segments }).map((_, i) => {
          const sy = -h * ((i + 1) / (segments + 1));
          const sx = Math.sin(i * 1.2) * size * 0.3;
          return (
            <g key={i}>
              <ellipse cx={sx - 3} cy={sy} rx={3.5} ry={2} fill={health > 60 ? '#4ade80' : '#a16207'} opacity={0.8} transform={`rotate(-30,${sx - 3},${sy})`} />
              {progress > 0.5 && i % 2 === 0 && (
                <ellipse cx={sx + 3} cy={sy + 1} rx={1.5} ry={4 * progress} fill="#a3e635" opacity={0.9} transform={`rotate(10,${sx + 3},${sy + 1})`} />
              )}
            </g>
          );
        })}
      </g>
    );
  }

  if (cropId === 'radish') {
    const leafCount = Math.floor(2 + progress * 4);
    return (
      <g transform={`translate(${x},${y})`} opacity={opacity}>
        {progress > 0.4 && (
          <ellipse cx={0} cy={2} rx={size * 0.15 * progress} ry={size * 0.2 * progress} fill="#dc2626" opacity={0.8} />
        )}
        {Array.from({ length: leafCount }).map((_, i) => {
          const angle = -60 + (i / (leafCount - 1 || 1)) * 120 + sway;
          const leafLen = h * 0.6;
          const rad = (angle * Math.PI) / 180;
          return (
            <g key={i}>
              <line x1={0} y1={0} x2={Math.sin(rad) * leafLen * 0.4} y2={-leafLen} stroke={health > 60 ? '#22c55e' : '#854d0e'} strokeWidth={1.5} strokeLinecap="round" />
              <ellipse cx={Math.sin(rad) * leafLen * 0.4} cy={-leafLen} rx={3} ry={5 * progress} fill={health > 60 ? crop.color : '#a16207'} opacity={0.7} transform={`rotate(${angle},${Math.sin(rad) * leafLen * 0.4},${-leafLen})`} />
            </g>
          );
        })}
      </g>
    );
  }

  // Herbs
  const leafCount = Math.floor(4 + progress * 6);
  return (
    <g transform={`translate(${x},${y})`} opacity={opacity}>
      <line x1={0} y1={0} x2={sway * 0.3} y2={-h * 0.7} stroke="#166534" strokeWidth={1} strokeLinecap="round" />
      {Array.from({ length: leafCount }).map((_, i) => {
        const ly = -h * 0.2 - (i / leafCount) * h * 0.6;
        const side = i % 2 === 0 ? -1 : 1;
        const jitter = ((i * 7 + 3) % 5) * 0.4;
        return (
          <ellipse
            key={i}
            cx={side * (size * 0.2 + jitter) + sway * 0.2}
            cy={ly}
            rx={2.5 + progress * 2}
            ry={1.5 + progress}
            fill={health > 60 ? crop.color : '#a16207'}
            opacity={0.7 + i * 0.02}
            transform={`rotate(${side * 25 + sway}, ${side * size * 0.2}, ${ly})`}
          />
        );
      })}
    </g>
  );
}

/* ── Zone layout ── */
const ZONE_LAYOUT = [
  { x: 28, y: 44, w: 190, h: 120, label: 'Zone A' },
  { x: 236, y: 44, w: 210, h: 120, label: 'Zone B' },
  { x: 464, y: 44, w: 190, h: 120, label: 'Zone C' },
  { x: 28, y: 182, w: 300, h: 105, label: 'Zone D' },
  { x: 346, y: 182, w: 308, h: 105, label: 'Zone E' },
];

export default function GreenhouseView({ zones, activeEvents, day }: Props) {
  const hasStorm = activeEvents.some(e => e.type === 'dust_storm');
  const hasDisease = activeEvents.some(e => e.type === 'crop_disease');
  const hasPowerOut = activeEvents.some(e => e.type === 'power_outage');

  const plantGrids = useMemo(() => {
    return zones.map((zone, zi) => {
      const rect = ZONE_LAYOUT[zi];
      const cols = Math.floor(rect.w / 22);
      const rows = Math.floor(rect.h / 28);
      const plants: { px: number; py: number; key: string }[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const jitterX = ((c + r * 7 + zi * 13) % 5) * 0.6 - 1.5;
          const jitterY = ((c * 3 + r + zi * 7) % 5) * 0.5 - 1.25;
          plants.push({
            px: rect.x + 18 + c * ((rect.w - 28) / Math.max(cols - 1, 1)) + jitterX,
            py: rect.y + rect.h - 14 + jitterY,
            key: `p-${zi}-${r}-${c}`,
          });
        }
      }
      return plants;
    });
  }, [zones.length]);

  return (
    <div className="glass rounded-2xl p-3 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-bio-400 animate-pulse" />
          <h2 className="text-xs font-semibold text-mars-300 uppercase tracking-wider">Greenhouse Digital Twin</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasStorm && (
            <motion.span className="text-[10px] px-2 py-0.5 rounded-full bg-rust-500/20 text-rust-300 border border-rust-500/30"
              animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
              🌪️ DUST STORM
            </motion.span>
          )}
          {hasDisease && (
            <motion.span className="text-[10px] px-2 py-0.5 rounded-full bg-alert-500/20 text-alert-300 border border-alert-500/30"
              animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              🦠 PATHOGEN
            </motion.span>
          )}
          {hasPowerOut && (
            <motion.span className="text-[10px] px-2 py-0.5 rounded-full bg-sun-500/20 text-sun-300 border border-sun-500/30"
              animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
              ⚡ POWER LOW
            </motion.span>
          )}
        </div>
      </div>

      <div className="flex-1 relative rounded-xl overflow-hidden">
        <svg viewBox="0 0 682 305" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="domeRadial" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(194,65,12,0.06)" />
              <stop offset="60%" stopColor="rgba(28,25,23,0.15)" />
              <stop offset="100%" stopColor="rgba(12,10,9,0.5)" />
            </radialGradient>
            <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(120,80,40,0.25)" />
              <stop offset="100%" stopColor="rgba(80,50,25,0.4)" />
            </linearGradient>
            <radialGradient id="ledGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(250,200,255,0.15)" />
              <stop offset="100%" stopColor="rgba(250,200,255,0)" />
            </radialGradient>
            <radialGradient id="ledGlowWarm" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,200,100,0.12)" />
              <stop offset="100%" stopColor="rgba(255,200,100,0)" />
            </radialGradient>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width="682" height="305" rx="12" fill="url(#domeRadial)" />
          
          {/* Structural ribs */}
          <path d="M 0 0 Q 341 -25 682 0" fill="none" stroke="rgba(194,65,12,0.2)" strokeWidth="1.5" />
          <path d="M 10 0 Q 341 -15 672 0" fill="none" stroke="rgba(194,65,12,0.08)" strokeWidth="0.8" />
          {[136, 272, 408, 544].map(xp => (
            <line key={xp} x1={xp} y1={0} x2={xp} y2={305} stroke="rgba(68,64,60,0.08)" strokeWidth="0.5" strokeDasharray="4 8" />
          ))}
          
          {/* Main irrigation line */}
          <line x1={20} y1={36} x2={662} y2={36} stroke="rgba(14,165,233,0.25)" strokeWidth={1.5} strokeDasharray="8 4" />
          {[120, 340, 560].map(cx => (
            <circle key={cx} cx={cx} cy={36} r={2} fill="#0ea5e9" opacity={0.4} />
          ))}

          {/* Growing Zones */}
          {zones.map((zone, i) => {
            const rect = ZONE_LAYOUT[i];
            const crop = getCrop(zone.cropId);
            const hc = healthColor(zone.health);
            const ripeness = ripenessLabel(zone.growthProgress);
            const plants = plantGrids[i];
            const plantSize = 12 + zone.growthProgress * 6;

            return (
              <g key={zone.id}>
                {/* Zone bg */}
                <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={6}
                  fill={`${crop.color}06`} stroke={hc} strokeWidth={0.8} strokeOpacity={0.4} />

                {/* Soil bed */}
                <rect x={rect.x + 3} y={rect.y + rect.h - 16} width={rect.w - 6} height={14} rx={4} fill="url(#soilGrad)" />
                {Array.from({ length: Math.floor(rect.w / 18) }).map((_, di) => (
                  <circle key={`s-${i}-${di}`} cx={rect.x + 10 + di * 18} cy={rect.y + rect.h - 9} r={1}
                    fill={zone.waterStress > 0.3 ? 'rgba(202,138,4,0.4)' : 'rgba(14,165,233,0.3)'} />
                ))}

                {/* LED grow lights */}
                <rect x={rect.x + 4} y={rect.y + 2} width={rect.w - 8} height={3} rx={1.5} fill="rgba(168,162,158,0.15)" />
                {!hasPowerOut && Array.from({ length: Math.floor(rect.w / 24) }).map((_, li) => (
                  <g key={`led-${i}-${li}`}>
                    <circle cx={rect.x + 16 + li * 24} cy={rect.y + 3.5} r={1.5}
                      fill={hasStorm ? 'rgba(255,200,100,0.6)' : 'rgba(220,180,255,0.7)'} />
                    <circle cx={rect.x + 16 + li * 24} cy={rect.y + 3.5} r={12}
                      fill={hasStorm ? 'url(#ledGlowWarm)' : 'url(#ledGlow)'} />
                  </g>
                ))}

                {/* Irrigation lines */}
                {[0.25, 0.5, 0.75].map(frac => (
                  <line key={`ir-${i}-${frac}`}
                    x1={rect.x + rect.w * frac} y1={rect.y + 6}
                    x2={rect.x + rect.w * frac} y2={rect.y + rect.h - 16}
                    stroke={zone.waterStress > 0.3 ? 'rgba(202,138,4,0.12)' : 'rgba(14,165,233,0.12)'}
                    strokeWidth={0.5} strokeDasharray="2 6" />
                ))}

                {/* Plants */}
                {plants.map(p => (
                  <PlantSprite key={p.key} cropId={zone.cropId} x={p.px} y={p.py}
                    progress={zone.growthProgress} health={zone.health} size={plantSize} />
                ))}

                {/* Disease detection overlay */}
                {hasDisease && zone.health < 80 && (
                  <>
                    {[0.3, 0.6, 0.8].map((fx, si) => (
                      <motion.circle key={`d-${i}-${si}`}
                        cx={rect.x + rect.w * fx} cy={rect.y + rect.h * 0.5 + si * 8}
                        r={3 + si} fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth={1} strokeDasharray="2 2"
                        animate={{ r: [3 + si, 5 + si, 3 + si], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2, delay: si * 0.3 }} />
                    ))}
                    <rect x={rect.x + rect.w - 60} y={rect.y + rect.h - 32} width={52} height={14} rx={3}
                      fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.4)" strokeWidth={0.5} />
                    <text x={rect.x + rect.w - 34} y={rect.y + rect.h - 22} textAnchor="middle"
                      fontSize={7} fill="#f87171" fontFamily="JetBrains Mono" fontWeight="600">
                      ⚠ DISEASE
                    </text>
                  </>
                )}

                {/* Zone label */}
                <rect x={rect.x + 4} y={rect.y + 8} width={72} height={26} rx={4}
                  fill="rgba(12,10,9,0.7)" stroke="rgba(68,64,60,0.3)" strokeWidth={0.5} />
                <text x={rect.x + 10} y={rect.y + 20} fontSize={9} fill={crop.color} fontFamily="Inter" fontWeight="700">
                  {crop.emoji} {crop.name}
                </text>
                <text x={rect.x + 10} y={rect.y + 30} fontSize={7} fill="rgba(168,162,158,0.8)" fontFamily="JetBrains Mono">
                  {rect.label} · {zone.area}m²
                </text>

                {/* Health bar */}
                <rect x={rect.x + rect.w - 56} y={rect.y + 9} width={48} height={4} rx={2} fill="rgba(68,64,60,0.3)" />
                <rect x={rect.x + rect.w - 56} y={rect.y + 9}
                  width={Math.max(0, zone.health * 0.48)} height={4} rx={2} fill={hc} />
                <text x={rect.x + rect.w - 56} y={rect.y + 21} fontSize={7} fill="rgba(168,162,158,0.7)" fontFamily="JetBrains Mono">
                  HP {Math.round(zone.health)}%
                </text>

                {/* Ripeness badge */}
                <rect x={rect.x + 4} y={rect.y + rect.h - 30} width={64} height={14} rx={3}
                  fill="rgba(12,10,9,0.7)" stroke={ripeness.color} strokeWidth={0.5} strokeOpacity={0.5} />
                <circle cx={rect.x + 12} cy={rect.y + rect.h - 23} r={2.5} fill={ripeness.color} opacity={0.8} />
                <text x={rect.x + 18} y={rect.y + rect.h - 20} fontSize={7} fill={ripeness.color} fontFamily="JetBrains Mono" fontWeight="600" opacity={0.9}>
                  {ripeness.text}
                </text>

                {/* Growth % */}
                <text x={rect.x + rect.w - 8} y={rect.y + rect.h - 20} textAnchor="end"
                  fontSize={8} fill="rgba(168,162,158,0.6)" fontFamily="JetBrains Mono">
                  {Math.round(zone.growthProgress * 100)}%
                </text>

                {/* Harvest-ready glow */}
                {zone.growthProgress >= 0.95 && (
                  <motion.rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={6}
                    fill="none" stroke="#f59e0b" strokeWidth={1.5}
                    animate={{ strokeOpacity: [0.2, 0.6, 0.2] }}
                    transition={{ repeat: Infinity, duration: 2 }} />
                )}
              </g>
            );
          })}

          {/* Storm overlay */}
          {hasStorm && (
            <>
              <motion.rect x="0" y="0" width="682" height="305" rx="12"
                fill="rgba(194,65,12,0.06)"
                animate={{ opacity: [0.03, 0.1, 0.03] }}
                transition={{ repeat: Infinity, duration: 4 }} />
              {Array.from({ length: 12 }).map((_, pi) => (
                <motion.circle key={`dust-${pi}`}
                  cx={50 + pi * 55} cy={30 + (pi % 3) * 90} r={1} fill="rgba(194,65,12,0.3)"
                  animate={{ cx: [50 + pi * 55, 50 + pi * 55 + 80], cy: [30 + (pi % 3) * 90, 30 + (pi % 3) * 90 + 20], opacity: [0, 0.4, 0] }}
                  transition={{ repeat: Infinity, duration: 3 + pi * 0.2, delay: pi * 0.25 }} />
              ))}
            </>
          )}

          {/* Power outage darkening */}
          {hasPowerOut && (
            <motion.rect x="0" y="0" width="682" height="305" rx="12"
              fill="rgba(0,0,0,0.3)"
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ repeat: Infinity, duration: 3 }} />
          )}
        </svg>
      </div>
    </div>
  );
}
