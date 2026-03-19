import { useMemo, useState, useRef, useCallback, type WheelEvent, type MouseEvent, type PointerEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CropZone, SimEvent } from '../types';
import { SEED_LIBRARY } from '../data/crops';

interface Props {
  zones: CropZone[];
  activeEvents: SimEvent[];
  solHour: number;
  greenhouseArea?: number;
}

// Greenhouse layout: dynamic grid based on area (1 cell = 1 m²)
const CELL = 1;

function getGridDimensions(area: number) {
  // Aim for a roughly 1.2:1 aspect ratio (cols:rows)
  const cols = Math.max(4, Math.round(Math.sqrt(area * 1.2)));
  const rows = Math.max(3, Math.ceil(area / cols));
  return { cols, rows, totalCells: cols * rows };
}

function getCrop(id: string) {
  return SEED_LIBRARY.find(c => c.id === id)!;
}

function buildGrid(zones: CropZone[], cols: number, rows: number) {
  const grid: (CropZone | null)[] = new Array(cols * rows).fill(null);
  let cellIdx = 0;
  for (const zone of zones) {
    const cellCount = Math.round(zone.area / CELL);
    for (let i = 0; i < cellCount && cellIdx < cols * rows; i++, cellIdx++) {
      grid[cellIdx] = zone;
    }
  }
  return grid;
}

const TILE_W = 32;
const TILE_H = 18;

// Rotation-aware isometric projection
function isoProject(col: number, row: number, rotationDeg: number) {
  const rad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);
  // Rotate grid coordinates
  const rc = col * cosR - row * sinR;
  const rr = col * sinR + row * cosR;
  return {
    x: (rc - rr) * (TILE_W / 2),
    y: (rc + rr) * (TILE_H / 2),
  };
}

// Tile diamond points for a given iso position
function tilePoints(x: number, y: number) {
  return [
    `${x},${y - TILE_H / 2}`,
    `${x + TILE_W / 2},${y}`,
    `${x},${y + TILE_H / 2}`,
    `${x - TILE_W / 2},${y}`,
  ].join(' ');
}

// 24-hour sol arc — shows sun/moon position on a semicircular horizon
function SolArc({ solHour }: { solHour: number }) {
  const W = 56, H = 28;
  const cx = W / 2, cy = H - 2;
  const r = 22;

  // Map solHour (0-24) to angle: 6h = left (π), 12h = top (π/2), 18h = right (0)
  // Night: 18h→6h mapped to lower arc
  const isDaytime = solHour >= 6 && solHour < 18;
  const angle = isDaytime
    ? Math.PI - ((solHour - 6) / 12) * Math.PI          // π → 0  (left to right arc above horizon)
    : Math.PI + ((solHour >= 18 ? solHour - 18 : solHour + 6) / 12) * Math.PI; // 0 → -π (right to left below)
  
  const dotX = cx + r * Math.cos(angle);
  const dotY = cy - r * Math.sin(angle);

  // Dawn/dusk tick positions
  const dawn = { x: cx - r, y: cy };
  const noon = { x: cx, y: cy - r };
  const dusk = { x: cx + r, y: cy };

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      {/* Horizon line */}
      <line x1={cx - r - 3} y1={cy} x2={cx + r + 3} y2={cy} stroke="#334155" strokeWidth={0.8} />

      {/* Day arc (upper half) — warm gradient */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={isDaytime ? '#f59e0b' : '#44403c'}
        strokeWidth={1.5}
        strokeOpacity={isDaytime ? 0.5 : 0.2}
      />

      {/* Night arc (lower half) */}
      <path
        d={`M ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx - r} ${cy}`}
        fill="none"
        stroke={!isDaytime ? '#64748b' : '#1e293b'}
        strokeWidth={1}
        strokeOpacity={!isDaytime ? 0.4 : 0.15}
        strokeDasharray="2 2"
      />

      {/* Tick marks: 6h, 12h, 18h */}
      <line x1={dawn.x} y1={dawn.y - 2} x2={dawn.x} y2={dawn.y + 2} stroke="#64748b" strokeWidth={0.6} />
      <line x1={noon.x} y1={noon.y} x2={noon.x} y2={noon.y + 2} stroke="#64748b" strokeWidth={0.6} />
      <line x1={dusk.x} y1={dusk.y - 2} x2={dusk.x} y2={dusk.y + 2} stroke="#64748b" strokeWidth={0.6} />

      {/* Hour labels */}
      <text x={dawn.x} y={cy + 8} textAnchor="middle" fill="#475569" fontSize={4} fontFamily="monospace">06</text>
      <text x={noon.x} y={noon.y - 2} textAnchor="middle" fill="#475569" fontSize={4} fontFamily="monospace">12</text>
      <text x={dusk.x} y={cy + 8} textAnchor="middle" fill="#475569" fontSize={4} fontFamily="monospace">18</text>

      {/* Current position dot */}
      <circle cx={dotX} cy={dotY} r={3.5}
        fill={isDaytime ? '#fbbf24' : '#94a3b8'}
        stroke={isDaytime ? '#f59e0b' : '#64748b'}
        strokeWidth={0.8}
      />
      {/* Glow */}
      <circle cx={dotX} cy={dotY} r={6}
        fill={isDaytime ? '#fbbf24' : '#94a3b8'}
        opacity={0.15}
      />
      {/* Symbol inside dot */}
      <text x={dotX} y={dotY + 1.5} textAnchor="middle" fontSize={4}
        fill={isDaytime ? '#78350f' : '#1e293b'}
        fontWeight="bold"
      >
        {isDaytime ? '☀' : '☽'}
      </text>
    </svg>
  );
}

// Plant sprites
function PlantSprite({ cropId, progress, health }: { cropId: string; progress: number; health: number }) {
  const crop = getCrop(cropId);
  const h = progress < 0.3 ? 7 : progress < 0.7 ? 14 : 20;
  const opacity = health / 100;
  const colors: Record<string, { stem: string; leaf: string }> = {
    lettuce: { stem: '#22c55e', leaf: '#4ade80' },
    potato:  { stem: '#a16207', leaf: '#ca8a04' },
    radish:  { stem: '#dc2626', leaf: '#4ade80' },
    beans:   { stem: '#65a30d', leaf: '#a3e635' },
    herbs:   { stem: '#0891b2', leaf: '#22d3ee' },
  };
  const c = colors[cropId] || colors.lettuce;
  return (
    <g opacity={opacity}>
      <line x1={0} y1={0} x2={0} y2={-h} stroke={c.stem} strokeWidth={2} />
      {progress > 0.2 && (
        <>
          <ellipse cx={-4} cy={-h + 3} rx={4.5} ry={2.8} fill={c.leaf} opacity={0.8} />
          <ellipse cx={4} cy={-h + 3} rx={4.5} ry={2.8} fill={c.leaf} opacity={0.8} />
        </>
      )}
      {progress > 0.5 && <ellipse cx={0} cy={-h} rx={5.5} ry={3.5} fill={c.leaf} />}
      {progress >= 0.9 && <circle cx={0} cy={-h - 3} r={3.5} fill={crop.color} stroke="#fff" strokeWidth={0.6} />}
    </g>
  );
}

// Selected plant detail popup
function PlantDetail({ zone, onClose }: { zone: CropZone; onClose: () => void }) {
  const crop = getCrop(zone.cropId);
  const plantCount = Math.floor(zone.area / crop.spacePerPlant);
  const stage = zone.growthProgress < 0.2 ? 'Seedling' : zone.growthProgress < 0.5 ? 'Growing' : zone.growthProgress < 0.85 ? 'Maturing' : zone.growthProgress < 1 ? 'Ripening' : 'Ready';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-2 left-2 right-2 z-20 rounded-xl overflow-hidden"
      style={{ background: 'rgba(10,10,20,0.92)', border: `1px solid ${crop.color}40`, backdropFilter: 'blur(12px)' }}
    >
      <div className="p-3">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-2 right-2 text-mars-600 hover:text-mars-400 text-xs transition-colors">✕</button>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{crop.emoji}</span>
          <div>
            <div className="text-sm font-bold" style={{ color: crop.color }}>{crop.name}</div>
            <div className="text-[10px] text-mars-500">Zone {zone.id.replace('z', '')} · {zone.area}m²</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[10px] font-semibold" style={{ color: zone.health > 70 ? '#4ade80' : zone.health > 40 ? '#fbbf24' : '#ef4444' }}>
              {Math.round(zone.health)}% Health
            </div>
            <div className="text-[10px] text-mars-500">{stage}</div>
          </div>
        </div>
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Plants', value: String(plantCount), color: crop.color },
            { label: 'Growth', value: `${Math.round(zone.growthProgress * 100)}%`, color: '#a78bfa' },
            { label: 'Water Stress', value: `${Math.round(zone.waterStress * 100)}%`, color: zone.waterStress > 0.3 ? '#ef4444' : '#3b82f6' },
            { label: 'Space/Plant', value: `${crop.spacePerPlant}m²`, color: '#94a3b8' },
          ].map(s => (
            <div key={s.label} className="bg-mars-900/60 rounded-lg p-1.5 text-center">
              <div className="text-[9px] text-mars-600 mb-0.5">{s.label}</div>
              <div className="text-xs font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
        {/* Growth bar */}
        <div className="mt-2">
          <div className="flex justify-between text-[9px] text-mars-600 mb-0.5">
            <span>Growth Progress</span>
            <span>{Math.round(zone.growthProgress * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-mars-800 overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: crop.color }} animate={{ width: `${zone.growthProgress * 100}%` }} />
          </div>
        </div>
        {/* Crop info */}
        <div className="mt-2 flex gap-3 text-[9px] text-mars-500">
          <span>Yield: {crop.yieldPerM2} kg/m²</span>
          <span>Water: {crop.waterPerDay} L/m²/day</span>
          <span>Temp: {crop.optimalTemp[0]}-{crop.optimalTemp[1]}°C</span>
        </div>
      </div>
    </motion.div>
  );
}

// View state defaults
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;
const ROTATION_STEP = 45; // degrees per click

export default function GreenhouseGrid({ zones, activeEvents, solHour, greenhouseArea = 120 }: Props) {
  const { cols: COLS, rows: ROWS } = useMemo(() => getGridDimensions(greenhouseArea), [greenhouseArea]);
  const grid = useMemo(() => buildGrid(zones, COLS, ROWS), [zones, COLS, ROWS]);
  const isDaytime = solHour >= 6 && solHour < 18;
  const hasStorm = activeEvents.some(e => e.type === 'dust_storm' && e.active);

  // Interaction state
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // degrees (0, 45, 90, ...)
  const [selectedZone, setSelectedZone] = useState<CropZone | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);

  // Drag state
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; startPanX: number; startPanY: number }>({
    dragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom handler
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev - e.deltaY * 0.001)));
  }, []);

  // Pan handlers
  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.startPanX + dx / zoom, y: dragRef.current.startPanY + dy / zoom });
  }, [zoom]);

  const handlePointerUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  // Rotation
  const rotateLeft = () => setRotation(prev => (prev - ROTATION_STEP + 360) % 360);
  const rotateRight = () => setRotation(prev => (prev + ROTATION_STEP) % 360);
  const resetView = () => { setZoom(DEFAULT_ZOOM); setPan({ x: 0, y: 0 }); setRotation(0); setSelectedZone(null); };

  // Lighting — computed as darkness overlay opacity (0 = full brightness, 1 = pitch black)
  const sunProgress = isDaytime ? (solHour - 6) / 12 : 0;
  // Daytime: 0.85 at dawn/dusk → 1.0 at noon. Night: 0.5 (dim but clearly visible)
  const ambientLight = isDaytime ? 0.85 + 0.15 * Math.sin(sunProgress * Math.PI) : 0.5;
  const finalAmbient = ambientLight * (hasStorm ? 0.6 : 1);
  // Invert to darkness and cap at 0.4 so it never gets too dark
  const darknessOpacity = Math.max(0, Math.min(0.4, 1 - finalAmbient));

  // Zone stats
  const zoneStats = useMemo(() => {
    return zones.map(z => {
      const crop = getCrop(z.cropId);
      const plantCount = Math.floor(z.area / crop.spacePerPlant);
      const usedArea = plantCount * crop.spacePerPlant;
      const utilization = usedArea / z.area;
      return { zone: z, crop, plantCount, usedArea, utilization };
    });
  }, [zones]);
  const totalPlants = zoneStats.reduce((s, z) => s + z.plantCount, 0);
  const totalUsed = zoneStats.reduce((s, z) => s + z.usedArea, 0);

  // SVG viewBox
  const center = isoProject(COLS / 2, ROWS / 2, rotation);
  const baseW = 500;
  const baseH = 280;
  const vbW = baseW / zoom;
  const vbH = baseH / zoom;
  const vbX = center.x - vbW / 2 - pan.x;
  const vbY = center.y - vbH / 2 + 10 - pan.y;

  // Tile click handler
  const handleTileClick = (zone: CropZone | null, e: MouseEvent) => {
    e.stopPropagation();
    if (!dragRef.current.dragging) {
      setSelectedZone(prev => prev?.id === zone?.id ? null : zone);
    }
  };

  return (
    <div className="glass rounded-2xl p-3 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">{isDaytime ? '☀️' : '🌙'}</span>
          <h3 className="text-sm font-semibold text-mars-300">Space Allocation Grid</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-mars-800 text-mars-400 font-mono">
            {greenhouseArea}m² · {COLS}×{ROWS}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* 24h sol arc indicator */}
          <div className="flex items-center gap-1.5">
            <SolArc solHour={solHour} />
            <span className="text-[10px] text-mars-500 font-mono tabular-nums">
              {String(Math.floor(solHour)).padStart(2, '0')}:{String(Math.round((solHour % 1) * 60)).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[10px] text-mars-500">
            {totalPlants} plants · {Math.round(totalUsed)}/{greenhouseArea}m² used
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-1">
          {/* Rotation buttons */}
          <button onClick={rotateLeft} className="w-7 h-7 rounded-lg bg-mars-800/60 border border-mars-700/40 text-mars-400 hover:text-white hover:bg-mars-700/60 transition-all text-xs flex items-center justify-center" title="Rotate left">↶</button>
          <button onClick={rotateRight} className="w-7 h-7 rounded-lg bg-mars-800/60 border border-mars-700/40 text-mars-400 hover:text-white hover:bg-mars-700/60 transition-all text-xs flex items-center justify-center" title="Rotate right">↷</button>
          <div className="w-px h-5 bg-mars-700/40 mx-1" />
          {/* Zoom buttons */}
          <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.2))} className="w-7 h-7 rounded-lg bg-mars-800/60 border border-mars-700/40 text-mars-400 hover:text-white hover:bg-mars-700/60 transition-all text-xs flex items-center justify-center" title="Zoom in">+</button>
          <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.2))} className="w-7 h-7 rounded-lg bg-mars-800/60 border border-mars-700/40 text-mars-400 hover:text-white hover:bg-mars-700/60 transition-all text-xs flex items-center justify-center" title="Zoom out">−</button>
          <div className="w-px h-5 bg-mars-700/40 mx-1" />
          {/* Reset */}
          <button onClick={resetView} className="h-7 px-2 rounded-lg bg-mars-800/60 border border-mars-700/40 text-mars-500 hover:text-white hover:bg-mars-700/60 transition-all text-[10px] flex items-center justify-center" title="Reset view">Reset</button>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-mars-600">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>·</span>
          <span>Rot: {rotation}°</span>
          <span>·</span>
          <span className="text-mars-700">Scroll to zoom · Drag to pan · Click plant to inspect</span>
        </div>
      </div>

      {/* Interactive Isometric Grid */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative cursor-grab active:cursor-grabbing select-none"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ transition: 'viewBox 0.1s' }}
        >
          <defs>
            <filter id="tileShadow">
              <feDropShadow dx={1} dy={1} stdDeviation={0.5} floodColor="#000" floodOpacity={0.3} />
            </filter>
            <filter id="tileGlow">
              <feDropShadow dx={0} dy={0} stdDeviation={2} floodColor="#fbbf24" floodOpacity={0.6} />
            </filter>
          </defs>

          <g>
            {/* Floor tiles */}
            {Array.from({ length: ROWS }, (_, row) =>
              Array.from({ length: COLS }, (_, col) => {
                const idx = row * COLS + col;
                const zone = grid[idx];
                const crop = zone ? getCrop(zone.cropId) : null;
                const { x, y } = isoProject(col, row, rotation);
                const points = tilePoints(x, y);

                let fillColor = '#1a1a2e';
                let fillOpacity = 0.6;
                if (zone && crop) {
                  fillColor = crop.color;
                  fillOpacity = 0.15 + (zone.health / 100) * 0.25;
                }

                const isHovered = hoveredCell?.col === col && hoveredCell?.row === row;
                const isSelected = zone && selectedZone?.id === zone.id;

                let hasPlant = false;
                if (zone && crop) {
                  const cellsPerPlant = Math.max(1, Math.round(crop.spacePerPlant / CELL));
                  const zoneStartIdx = grid.indexOf(zone);
                  const posInZone = idx - zoneStartIdx;
                  hasPlant = posInZone % cellsPerPlant === 0;
                }

                return (
                  <g
                    key={`${col}-${row}`}
                    onClick={(e) => handleTileClick(zone, e)}
                    onMouseEnter={() => setHoveredCell({ col, row })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{ cursor: zone ? 'pointer' : 'default' }}
                  >
                    <polygon
                      points={points}
                      fill={fillColor}
                      fillOpacity={isSelected ? fillOpacity + 0.2 : isHovered && zone ? fillOpacity + 0.1 : fillOpacity}
                      stroke={isSelected ? '#fbbf24' : isHovered && zone ? '#fff' : zone ? crop!.color : '#333'}
                      strokeWidth={isSelected ? 1.2 : isHovered && zone ? 0.8 : 0.5}
                      strokeOpacity={isSelected ? 0.9 : isHovered && zone ? 0.7 : zone ? 0.4 : 0.2}
                      filter={isSelected ? 'url(#tileGlow)' : 'url(#tileShadow)'}
                    />
                    {zone && (
                      <>
                        <circle cx={x - 3} cy={y - 1} r={0.5} fill="#5c4033" opacity={0.4} />
                        <circle cx={x + 4} cy={y + 1} r={0.4} fill="#5c4033" opacity={0.3} />
                      </>
                    )}
                    {hasPlant && zone && (
                      <g transform={`translate(${x}, ${y - 2})`}>
                        <PlantSprite cropId={zone.cropId} progress={zone.growthProgress} health={zone.health} />
                      </g>
                    )}
                    {zone && zone.waterStress > 0.3 && hasPlant && (
                      <circle cx={x + 7} cy={y - 10} r={2} fill="#ef4444" opacity={0.7}>
                        <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* Hover tooltip */}
                    {isHovered && zone && crop && (
                      <g>
                        <rect x={x - 30} y={y - 38} width={60} height={18} rx={4} fill="#000" fillOpacity={0.88} />
                        <text x={x} y={y - 25} textAnchor="middle" fill={crop.color} fontSize={7} fontWeight="bold" fontFamily="Inter">
                          {crop.emoji} {crop.name} · {Math.round(zone.health)}%
                        </text>
                      </g>
                    )}
                  </g>
                );
              })
            )}

            {/* Zone labels (only at lower zoom levels) */}
            {zoom < 1.8 && (() => {
              let cellOffset = 0;
              return zones.map((zone) => {
                const crop = getCrop(zone.cropId);
                const cellCount = Math.round(zone.area / CELL);
                const midCell = cellOffset + Math.floor(cellCount / 2);
                const midRow = Math.floor(midCell / COLS);
                const midCol = midCell % COLS;
                const { x: lx, y: ly } = isoProject(midCol, midRow, rotation);
                cellOffset += cellCount;
                return (
                  <g key={zone.id}>
                    <rect x={lx - 26} y={ly - 24} width={52} height={18} rx={4} fill="#000" fillOpacity={0.65} />
                    <text x={lx} y={ly - 13} textAnchor="middle" fill={crop.color} fontSize={7} fontWeight="bold" fontFamily="Inter">
                      {crop.emoji} {crop.name}
                    </text>
                    <text x={lx} y={ly - 5} textAnchor="middle" fill="#aaa" fontSize={5} fontFamily="JetBrains Mono">
                      {zone.area}m² · {Math.floor(zone.area / crop.spacePerPlant)} plants
                    </text>
                  </g>
                );
              });
            })()}

            {/* Night LED strips */}
            {!isDaytime && (
              <>
                {[0, COLS - 1].map(col =>
                  Array.from({ length: ROWS }, (_, row) => {
                    const { x, y } = isoProject(col, row, rotation);
                    return (
                      <circle key={`led-${col}-${row}`} cx={x} cy={y - 8} r={3} fill="#c084fc" opacity={0.15}>
                        <animate attributeName="opacity" values="0.15;0.25;0.15" dur="2s" repeatCount="indefinite" />
                      </circle>
                    );
                  })
                )}
              </>
            )}
          </g>

          {/* Sun/moon rendered as fixed HTML overlay below */}
        </svg>

        {/* Darkness overlay — smoothly transitions between light levels */}
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            backgroundColor: isDaytime ? `rgba(10,10,30,${darknessOpacity})` : `rgba(5,5,20,${darknessOpacity})`,
            transition: 'background-color 2s ease-in-out',
          }}
        />

        {/* Sky tint overlay — subtle ambient color shift */}
        <div
          className="absolute top-0 left-0 right-0 h-12 pointer-events-none rounded-t-xl"
          style={{
            background: isDaytime
              ? `linear-gradient(180deg, rgba(251,191,36,${0.03 + Math.sin(sunProgress * Math.PI) * 0.06}) 0%, transparent 100%)`
              : 'linear-gradient(180deg, rgba(100,120,200,0.06) 0%, transparent 100%)',
            transition: 'background 2s ease-in-out',
          }}
        />

        {/* Dust storm overlay */}
        {hasStorm && (
          <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-orange-900/20 animate-pulse" />
          </div>
        )}

        {/* Selected plant detail panel */}
        <AnimatePresence>
          {selectedZone && (
            <PlantDetail zone={selectedZone} onClose={() => setSelectedZone(null)} />
          )}
        </AnimatePresence>
      </div>

      {/* Zone stats bar */}
      <div className="flex gap-2 mt-2 shrink-0">
        {zoneStats.map(({ zone, crop, plantCount, utilization }) => (
          <div
            key={zone.id}
            className={`flex-1 rounded-xl px-3 py-2 cursor-pointer transition-all duration-200 ${selectedZone?.id === zone.id ? 'ring-1 ring-offset-1 ring-offset-transparent' : 'hover:brightness-125'}`}
            style={{
              background: `${crop.color}${selectedZone?.id === zone.id ? '20' : '10'}`,
              border: `1px solid ${crop.color}${selectedZone?.id === zone.id ? '60' : '30'}`,
              ...(selectedZone?.id === zone.id ? { ringColor: crop.color } : {}),
            }}
            onClick={() => setSelectedZone(prev => prev?.id === zone.id ? null : zone)}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-semibold" style={{ color: crop.color }}>{crop.emoji} {crop.name}</span>
              <span className="text-xs text-mars-400 font-medium">{Math.round(zone.growthProgress * 100)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-mars-500">{plantCount} plants</span>
              <span className="text-xs text-mars-600">{zone.area}m²</span>
            </div>
            <div className="h-1 mt-1 rounded-full bg-mars-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${utilization * 100}%`, background: crop.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
