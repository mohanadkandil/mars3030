import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CropZone } from '../types';
import { SEED_LIBRARY } from '../data/crops';

interface Props {
  zones: CropZone[];
  activeEvents: { type: string }[];
  day: number;
}

function getCrop(id: string) {
  return SEED_LIBRARY.find(c => c.id === id)!;
}

/* Simulated detection bounding boxes for AI vision */
interface Detection {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
  color: string;
  type: 'ripeness' | 'disease' | 'health';
}

function generateDetections(zone: CropZone, hasDisease: boolean): Detection[] {
  const crop = getCrop(zone.cropId);
  const detections: Detection[] = [];
  const seed = zone.cropId.charCodeAt(0) + zone.plantedDay;

  // Plant detections (ripeness)
  const plantCount = 4 + Math.floor(zone.growthProgress * 4);
  for (let i = 0; i < plantCount; i++) {
    const px = 40 + ((seed * (i + 1) * 37) % 300);
    const py = 60 + ((seed * (i + 1) * 23) % 140);
    const bw = 30 + zone.growthProgress * 25;
    const bh = 20 + zone.growthProgress * 35;

    let label: string;
    let color: string;
    let confidence: number;

    if (zone.growthProgress >= 0.95) {
      label = 'HARVEST READY';
      color = '#f59e0b';
      confidence = 0.92 + ((i * 3) % 8) * 0.01;
    } else if (zone.growthProgress >= 0.75) {
      label = `${crop.name} - Ripe`;
      color = '#22c55e';
      confidence = 0.85 + ((i * 7) % 12) * 0.01;
    } else if (zone.growthProgress >= 0.4) {
      label = `${crop.name} - Growing`;
      color = '#0ea5e9';
      confidence = 0.78 + ((i * 5) % 15) * 0.01;
    } else {
      label = `${crop.name} - Seedling`;
      color = '#8b5cf6';
      confidence = 0.70 + ((i * 11) % 20) * 0.01;
    }

    detections.push({
      id: `det-${zone.id}-${i}`,
      x: Math.min(px, 350),
      y: Math.min(py, 180),
      w: bw,
      h: bh,
      label,
      confidence: Math.min(0.99, confidence),
      color,
      type: 'ripeness',
    });
  }

  // Disease detections
  if (hasDisease && zone.health < 85) {
    const diseaseCount = zone.health < 60 ? 3 : zone.health < 75 ? 2 : 1;
    for (let d = 0; d < diseaseCount; d++) {
      const dx = 60 + ((seed * (d + 1) * 41) % 280);
      const dy = 80 + ((seed * (d + 1) * 29) % 120);
      detections.push({
        id: `dis-${zone.id}-${d}`,
        x: Math.min(dx, 330),
        y: Math.min(dy, 170),
        w: 40 + d * 8,
        h: 35 + d * 6,
        label: d === 0 ? 'Fungal Lesion' : d === 1 ? 'Leaf Spot' : 'Blight',
        confidence: 0.82 + d * 0.04,
        color: '#ef4444',
        type: 'disease',
      });
    }
  }

  // Low health warning
  if (zone.health < 50) {
    detections.push({
      id: `health-${zone.id}`,
      x: 150,
      y: 100,
      w: 120,
      h: 80,
      label: 'CRITICAL STRESS',
      confidence: 0.95,
      color: '#ef4444',
      type: 'health',
    });
  }

  return detections;
}

/* Simulated camera noise scanlines */
function ScanLines() {
  return (
    <>
      {Array.from({ length: 30 }).map((_, i) => (
        <line
          key={i}
          x1={0} y1={i * 9} x2={430} y2={i * 9}
          stroke="rgba(255,255,255,0.015)"
          strokeWidth={1}
        />
      ))}
    </>
  );
}

/* Simulated plant rendering for the "camera view" */
function CameraPlantScene({ zone, hasDisease }: { zone: CropZone; hasDisease: boolean }) {
  const crop = getCrop(zone.cropId);
  const p = zone.growthProgress;

  return (
    <>
      {/* Ground / soil */}
      <rect x={0} y={200} width={430} height={60} fill="rgba(80,50,25,0.6)" />
      <rect x={0} y={200} width={430} height={2} fill="rgba(120,80,40,0.4)" />

      {/* Grow light bar at top */}
      <rect x={10} y={5} width={410} height={6} rx={3} fill="rgba(100,80,120,0.3)" />
      {Array.from({ length: 10 }).map((_, i) => (
        <circle key={i} cx={30 + i * 40} cy={8} r={3} fill="rgba(200,170,255,0.5)" />
      ))}
      <rect x={10} y={14} width={410} height={20} fill="rgba(200,170,255,0.03)" />

      {/* Irrigation tubes */}
      <line x1={0} y1={195} x2={430} y2={195} stroke="rgba(14,165,233,0.2)" strokeWidth={2} />
      {[80, 180, 280, 370].map(x => (
        <g key={x}>
          <line x1={x} y1={195} x2={x} y2={200} stroke="rgba(14,165,233,0.3)" strokeWidth={1} />
          {zone.waterStress < 0.3 && (
            <motion.circle cx={x} cy={198} r={1.5} fill="rgba(14,165,233,0.4)"
              animate={{ cy: [198, 202], opacity: [0.6, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: x * 0.003 }} />
          )}
        </g>
      ))}

      {/* Plants (bigger, more detailed for camera view) */}
      {Array.from({ length: 7 }).map((_, i) => {
        const px = 40 + i * 55;
        const plantH = 40 + p * 100;
        const baseY = 198;

        return (
          <g key={i} transform={`translate(${px},${baseY})`}>
            {/* Stem */}
            <line x1={0} y1={0} x2={Math.sin(i) * 3} y2={-plantH} stroke="#15803d" strokeWidth={2.5} strokeLinecap="round" />

            {/* Leaves */}
            {Array.from({ length: Math.floor(2 + p * 5) }).map((_, li) => {
              const ly = -plantH * ((li + 1) / (Math.floor(2 + p * 5) + 1));
              const side = li % 2 === 0 ? -1 : 1;
              const leafW = 8 + p * 12;
              const isHealthy = zone.health > 60;
              const leafColor = hasDisease && !isHealthy && li > 2
                ? `rgba(180,120,40,${0.6 + li * 0.05})`
                : isHealthy ? crop.color : '#a16207';
              return (
                <g key={li}>
                  <ellipse
                    cx={side * leafW * 0.6}
                    cy={ly}
                    rx={leafW}
                    ry={leafW * 0.35}
                    fill={leafColor}
                    opacity={0.75}
                    transform={`rotate(${side * 20}, ${side * leafW * 0.6}, ${ly})`}
                  />
                  {/* Disease spots on leaves */}
                  {hasDisease && zone.health < 70 && li % 3 === 0 && (
                    <>
                      <circle cx={side * leafW * 0.4} cy={ly - 2} r={2.5} fill="rgba(120,80,20,0.6)" />
                      <circle cx={side * leafW * 0.8} cy={ly + 1} r={1.5} fill="rgba(100,60,10,0.5)" />
                    </>
                  )}
                </g>
              );
            })}

            {/* Fruit / head based on crop type */}
            {zone.cropId === 'lettuce' && p > 0.3 && (
              <circle cx={0} cy={-plantH + 5} r={6 + p * 8} fill={crop.color} opacity={0.6} />
            )}
            {zone.cropId === 'potato' && p > 0.7 && (
              <circle cx={Math.sin(i) * 3} cy={-plantH - 3} r={3} fill="#e9d5ff" opacity={0.7} />
            )}
            {zone.cropId === 'radish' && p > 0.4 && (
              <ellipse cx={0} cy={3} rx={5 * p} ry={8 * p} fill="#dc2626" opacity={0.7} />
            )}
            {zone.cropId === 'beans' && p > 0.5 && Array.from({ length: Math.floor(p * 3) }).map((_, bi) => (
              <ellipse key={bi} cx={6 * (bi % 2 === 0 ? 1 : -1)} cy={-plantH * 0.4 - bi * 15}
                rx={2} ry={6 * p} fill="#a3e635" opacity={0.8} transform={`rotate(${10 * (bi % 2 === 0 ? 1 : -1)})`} />
            ))}
            {zone.cropId === 'herbs' && p > 0.3 && (
              <g>
                {Array.from({ length: Math.floor(p * 4) }).map((_, fi) => (
                  <circle key={fi} cx={(fi - 1) * 4} cy={-plantH + fi * 3} r={1.5} fill="#fbbf24" opacity={0.6} />
                ))}
              </g>
            )}
          </g>
        );
      })}
    </>
  );
}

export default function CameraFeed({ zones, activeEvents, day }: Props) {
  const [selectedZone, setSelectedZone] = useState(0);
  const hasDisease = activeEvents.some(e => e.type === 'crop_disease');
  const zone = zones[selectedZone];
  const crop = getCrop(zone.cropId);

  const detections = useMemo(
    () => generateDetections(zone, hasDisease),
    [zone.id, zone.growthProgress, zone.health, hasDisease, zone.plantedDay]
  );

  const diseaseDetections = detections.filter(d => d.type === 'disease');
  const ripenessDetections = detections.filter(d => d.type === 'ripeness');

  return (
    <div className="glass rounded-2xl p-3 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-alert-400 animate-pulse" />
          <h2 className="text-xs font-semibold text-mars-300 uppercase tracking-wider">AI Vision Feed</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-mars-800 text-mars-500 font-mono">
            CAM-{selectedZone + 1}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-mars-500 font-mono tabular-nums">SOL {day}</span>
          <motion.div className="w-1.5 h-1.5 rounded-full bg-alert-400"
            animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
          <span className="text-[10px] text-alert-400 font-semibold">REC</span>
        </div>
      </div>

      {/* Camera selector */}
      <div className="flex gap-1 mb-2">
        {zones.map((z, i) => {
          const c = getCrop(z.cropId);
          return (
            <button
              key={z.id}
              onClick={() => setSelectedZone(i)}
              className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all ${
                i === selectedZone
                  ? 'bg-mars-700 text-mars-200 border border-mars-600'
                  : 'bg-mars-900/50 text-mars-500 border border-transparent hover:border-mars-700 hover:text-mars-400'
              }`}
            >
              {c.emoji} {c.name.slice(0, 4)}
            </button>
          );
        })}
      </div>

      {/* Camera viewport */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-mars-700/50 bg-mars-950">
        <svg viewBox="0 0 430 260" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          {/* Dark camera background */}
          <rect width="430" height="260" fill="rgba(12,10,9,0.95)" />

          {/* Plant scene */}
          <CameraPlantScene zone={zone} hasDisease={hasDisease} />

          {/* Scan lines */}
          <ScanLines />

          {/* AI Detection bounding boxes */}
          <AnimatePresence>
            {detections.slice(0, 8).map((det) => (
              <motion.g
                key={det.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Bounding box */}
                <rect
                  x={det.x} y={det.y} width={det.w} height={det.h}
                  fill="none" stroke={det.color} strokeWidth={1.5}
                  rx={2}
                  opacity={0.8}
                />
                {/* Corner brackets */}
                <path d={`M ${det.x},${det.y + 6} L ${det.x},${det.y} L ${det.x + 6},${det.y}`} fill="none" stroke={det.color} strokeWidth={2} />
                <path d={`M ${det.x + det.w - 6},${det.y} L ${det.x + det.w},${det.y} L ${det.x + det.w},${det.y + 6}`} fill="none" stroke={det.color} strokeWidth={2} />
                <path d={`M ${det.x},${det.y + det.h - 6} L ${det.x},${det.y + det.h} L ${det.x + 6},${det.y + det.h}`} fill="none" stroke={det.color} strokeWidth={2} />
                <path d={`M ${det.x + det.w - 6},${det.y + det.h} L ${det.x + det.w},${det.y + det.h} L ${det.x + det.w},${det.y + det.h - 6}`} fill="none" stroke={det.color} strokeWidth={2} />

                {/* Label background */}
                <rect
                  x={det.x} y={det.y - 14}
                  width={Math.max(det.label.length * 5.5 + 30, 60)} height={13} rx={2}
                  fill={det.color} opacity={0.85}
                />
                {/* Label text */}
                <text
                  x={det.x + 3} y={det.y - 4}
                  fontSize={8} fill="white" fontFamily="JetBrains Mono" fontWeight="600"
                >
                  {det.label} {(det.confidence * 100).toFixed(0)}%
                </text>
              </motion.g>
            ))}
          </AnimatePresence>

          {/* Camera HUD overlay */}
          <text x={10} y={16} fontSize={8} fill="rgba(255,255,255,0.3)" fontFamily="JetBrains Mono">
            ZONE {String.fromCharCode(65 + selectedZone)} | {crop.name.toUpperCase()} | {zone.area}m²
          </text>
          <text x={10} y={252} fontSize={8} fill="rgba(255,255,255,0.25)" fontFamily="JetBrains Mono">
            ARESFARM AI VISION v2.1 | RESOLUTION 1920x1080 | IR+VISIBLE
          </text>

          {/* Crosshair center indicator */}
          <line x1={210} y1={120} x2={210} y2={140} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
          <line x1={205} y1={130} x2={215} y2={130} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
        </svg>

        {/* Vignette overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />
      </div>

      {/* Detection summary bar */}
      <div className="mt-2 flex items-center gap-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-bio-400" />
          <span className="text-[10px] text-mars-400 font-mono">{ripenessDetections.length} plants</span>
        </div>
        {diseaseDetections.length > 0 && (
          <div className="flex items-center gap-1.5">
            <motion.div className="w-2 h-2 rounded-sm bg-alert-400"
              animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
            <span className="text-[10px] text-alert-400 font-mono font-semibold">{diseaseDetections.length} disease</span>
          </div>
        )}
        <div className="ml-auto text-[10px] text-mars-600 font-mono">
          {zone.growthProgress >= 0.95 ? '🟡 Ready to harvest' :
           zone.growthProgress >= 0.75 ? '🟢 Ripening nicely' :
           zone.growthProgress >= 0.4 ? '🔵 Active growth' :
           '🟣 Early stage'}
        </div>
      </div>
    </div>
  );
}
