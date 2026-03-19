import { useEffect, useRef, useCallback, useState } from 'react';
import type { MarsWeather } from '../types';

interface Props {
  weather: MarsWeather;
}

interface Particle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

// Viewport: zoom into greenhouse area (center=0.71,0.40)
const VIEW_CENTER = { x: 0.71, y: 0.40 };
const VIEW_SPAN = { x: 0.35, y: 0.35 };

function worldToScreen(wx: number, wy: number): [number, number] {
  return [
    (wx - VIEW_CENTER.x + VIEW_SPAN.x / 2) / VIEW_SPAN.x,
    (wy - VIEW_CENTER.y + VIEW_SPAN.y / 2) / VIEW_SPAN.y,
  ];
}

function generateTopoMap(width: number, height: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#d4d4ee');
  gradient.addColorStop(0.1, '#c4823c');
  gradient.addColorStop(0.5, '#8b3a1a');
  gradient.addColorStop(0.9, '#a0522d');
  gradient.addColorStop(1, '#c4c4dd');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const zoomFactor = 1 / VIEW_SPAN.x;

  const features = [
    { x: 0.22, y: 0.48, rx: 0.12, ry: 0.18, color: '#c4823c', opacity: 0.6 },
    { x: 0.13, y: 0.40, rx: 0.04, ry: 0.04, color: '#e8c4a0', opacity: 0.5 },
    { x: 0.28, y: 0.54, rx: 0.15, ry: 0.02, color: '#2d1500', opacity: 0.7 },
    { x: 0.69, y: 0.71, rx: 0.08, ry: 0.10, color: '#1a0a00', opacity: 0.5 },
    { x: 0.74, y: 0.44, rx: 0.05, ry: 0.06, color: '#4a1a08', opacity: 0.4 },
    { x: 0.69, y: 0.45, rx: 0.03, ry: 0.08, color: '#2d1000', opacity: 0.5 },
    { x: 0.56, y: 0.36, rx: 0.10, ry: 0.08, color: '#b07040', opacity: 0.3 },
    { x: 0.81, y: 0.25, rx: 0.09, ry: 0.07, color: '#5a2510', opacity: 0.4 },
    { x: 0.90, y: 0.36, rx: 0.03, ry: 0.04, color: '#b07040', opacity: 0.5 },
    { x: 0.71, y: 0.40, rx: 0.015, ry: 0.02, color: '#22c55e', opacity: 0.8 },
  ];

  features.forEach(f => {
    const [sx, sy] = worldToScreen(f.x, f.y);
    ctx.beginPath();
    ctx.ellipse(
      sx * width, sy * height,
      f.rx * zoomFactor * width, f.ry * zoomFactor * height,
      0, 0, Math.PI * 2
    );
    ctx.fillStyle = f.color;
    ctx.globalAlpha = f.opacity;
    ctx.fill();
  });

  ctx.globalAlpha = 1;
  return ctx.getImageData(0, 0, width, height);
}

function noise2D(x: number, y: number, seed: number = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function interpolateWind(
  x: number,
  y: number,
  width: number,
  height: number,
  windDirection: number,
  windSpeed: number
): [number, number] {
  const rad = ((windDirection + 180) * Math.PI) / 180;
  const baseU = Math.sin(rad) * windSpeed;
  const baseV = -Math.cos(rad) * windSpeed;

  const scale1 = 0.005;
  const scale2 = 0.015;
  const scale3 = 0.04;

  const turb1 = noise2D(x * scale1, y * scale1, 1) * 0.5;
  const turb2 = noise2D(x * scale2, y * scale2, 2) * 0.25;
  const turb3 = noise2D(x * scale3, y * scale3, 3) * 0.15;
  const turbulence = turb1 + turb2 + turb3;

  const dx = noise2D((x + 1) * scale2, y * scale2, 4) - noise2D((x - 1) * scale2, y * scale2, 4);
  const dy = noise2D(x * scale2, (y + 1) * scale2, 4) - noise2D(x * scale2, (y - 1) * scale2, 4);

  const curlStrength = windSpeed * 0.3;
  const u = baseU + turbulence * windSpeed * 0.4 + dy * curlStrength;
  const v = baseV + turbulence * windSpeed * 0.3 - dx * curlStrength;

  return [u, v];
}

export default function MarsWindCanvas({ weather }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const topoImageRef = useRef<ImageData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.floor(rect.height);
      if (newWidth > 0 && newHeight > 0) {
        setDimensions({ width: newWidth, height: newHeight });
        topoImageRef.current = null;
        particlesRef.current = [];
        if (offscreenRef.current) {
          offscreenRef.current.width = newWidth;
          offscreenRef.current.height = newHeight;
        }
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  const { width, height } = dimensions;

  const initParticles = useCallback((count: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        age: Math.floor(Math.random() * 100),
        maxAge: 80 + Math.floor(Math.random() * 40),
      });
    }
    return particles;
  }, [width, height]);

  const resetParticle = useCallback((p: Particle) => {
    p.x = Math.random() * width;
    p.y = Math.random() * height;
    p.age = 0;
    p.maxAge = 80 + Math.floor(Math.random() * 40);
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
      offscreenRef.current.width = width;
      offscreenRef.current.height = height;
    }
    const offscreen = offscreenRef.current;
    const offCtx = offscreen.getContext('2d')!;

    if (!topoImageRef.current) {
      topoImageRef.current = null as any; // topo map disabled
    }

    const particleCount = Math.min(800, 200 + weather.windSpeed * 30);
    if (particlesRef.current.length === 0) {
      particlesRef.current = initParticles(particleCount);
    }

    while (particlesRef.current.length < particleCount) {
      particlesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        age: 0,
        maxAge: 50 + Math.floor(Math.random() * 30),
      });
    }
    while (particlesRef.current.length > particleCount) {
      particlesRef.current.pop();
    }

    const animate = () => {
      offCtx.fillStyle = 'rgba(10, 10, 15, 0.04)';
      offCtx.fillRect(0, 0, width, height);

      const particles = particlesRef.current;
      const speedFactor = Math.max(0.15, weather.windSpeed / 35);

      particles.forEach(p => {
        const [u, v] = interpolateWind(
          p.x, p.y, width, height,
          weather.windDirection,
          weather.windSpeed
        );

        const ageRatio = p.age / p.maxAge;
        const alpha = Math.sin(ageRatio * Math.PI) * 0.85;

        const prevX = p.x;
        const prevY = p.y;

        p.x += u * speedFactor * 0.12;
        p.y += v * speedFactor * 0.12;
        p.age++;

        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height || p.age >= p.maxAge) {
          resetParticle(p);
          return;
        }

        const lineLen = Math.sqrt((p.x - prevX) ** 2 + (p.y - prevY) ** 2);

        offCtx.beginPath();
        offCtx.moveTo(prevX, prevY);
        offCtx.lineTo(p.x, p.y);

        const speedRatio = Math.min(1, lineLen / 3);
        const r = 255;
        const g = Math.floor(200 - speedRatio * 80);
        const b = Math.floor(100 - speedRatio * 60);

        offCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, alpha * 1.5)})`;
        offCtx.lineWidth = 1.8;
        offCtx.lineCap = 'round';
        offCtx.stroke();
      });

      ctx.fillStyle = '#0f0a08';
      ctx.fillRect(0, 0, width, height);

      if (weather.dustOpacity > 1) {
        ctx.fillStyle = `rgba(146, 64, 14, ${Math.min(0.4, weather.dustOpacity * 0.1)})`;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.globalAlpha = 0.9;
      ctx.drawImage(offscreen, 0, 0);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 0.5;
      for (let lat = 1; lat < 6; lat++) {
        const y = (lat / 6) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let lon = 1; lon < 8; lon++) {
        const x = (lon / 8) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      const [ghSx, ghSy] = worldToScreen(0.71, 0.40);
      const ghX = ghSx * width;
      const ghY = ghSy * height;

      const pulseRadius = 12 + Math.sin(Date.now() / 300) * 4;
      ctx.beginPath();
      ctx.arc(ghX, ghY, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ghX, ghY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();

      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#22c55e';
      ctx.textAlign = 'left';
      ctx.fillText('Greenhouse', ghX + 12, ghY + 4);

      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.textAlign = 'left';
      ctx.fillText(`Wind: ${weather.windSpeed} m/s @ ${weather.windDirection}°`, 10, 20);

      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(`Dust τ: ${weather.dustOpacity.toFixed(2)}`, 10, 34);

      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(`Ls: ${weather.solarLongitude}°`, width - 10, 20);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText(weather.season, width - 10, 34);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [weather, width, height, initParticles, resetParticle]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 rounded-xl"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    </div>
  );
}
