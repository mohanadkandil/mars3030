import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVision } from '../hooks/useVision';

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface Props {
  day: number;
}

export default function LiveCameraFeed({ day }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Real Vision Hook
  const { detections, isBackendReady, modelInfo } = useVision(videoRef, active);

  // Enumerate available video devices
  const enumerateCameras = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoCams = devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${i + 1}`,
      }));
    setCameras(videoCams);
    return videoCams;
  }, []);

  // Start stream for a given device
  const startStream = useCallback(async (deviceId?: string) => {
    // Stop previous stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setActive(false);
    setError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        setActive(true);
      }
      // Re-enumerate after permission grant (labels become available)
      await enumerateCameras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access denied');
    }
  }, [enumerateCameras]);

  // Initial mount — request permission then enumerate
  useEffect(() => {
    startStream();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-detect hot-plugged cameras
  useEffect(() => {
    const handler = () => enumerateCameras();
    navigator.mediaDevices.addEventListener('devicechange', handler);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handler);
  }, [enumerateCameras]);

  // Switch camera
  const handleSwitch = (idx: number) => {
    setSelectedIdx(idx);
    if (cameras[idx]) {
      startStream(cameras[idx].deviceId);
    }
  };

  const handleRefresh = async () => {
    const cams = await enumerateCameras();
    // If the selected index is out of bounds, reset
    if (selectedIdx >= cams.length) {
      setSelectedIdx(0);
      if (cams.length > 0) startStream(cams[0].deviceId);
    }
  };

  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isBackendReady ? 'bg-green-400' : 'bg-alert-400'} animate-pulse`} />
          <h2 className="text-sm font-semibold text-mars-300 uppercase tracking-wider">
            {isBackendReady ? 'Live AI Vision Feed' : 'Live Camera Feed'}
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-mars-800 text-mars-500 font-mono">
            CAM-{selectedIdx + 1} · ZONE {String.fromCharCode(65 + selectedIdx)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-mars-500 font-mono tabular-nums">SOL {day}</span>
          {active && (
            <>
              <motion.div className="w-2 h-2 rounded-full bg-alert-400"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
              <span className="text-[10px] text-alert-400 font-semibold">REC</span>
            </>
          )}
        </div>
      </div>

      {/* Camera selector — always visible */}
      <div className="flex gap-1.5 mb-3 shrink-0">
        {cameras.map((cam, i) => (
          <button
            key={cam.deviceId}
            onClick={() => handleSwitch(i)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              i === selectedIdx
                ? 'bg-mars-700 text-mars-200 border border-mars-600 shadow-lg shadow-mars-900/50'
                : 'bg-mars-900/50 text-mars-500 border border-transparent hover:border-mars-700 hover:text-mars-400'
            }`}
          >
            📷 {cam.label}
          </button>
        ))}
        <button
          onClick={handleRefresh}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-mars-900/50 text-mars-500 border border-transparent hover:border-mars-700 hover:text-mars-400 transition-all"
          title="Rescan for cameras"
        >
          🔄
        </button>
      </div>

      {/* Webcam viewport */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-mars-700/50 bg-mars-950">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">📷</div>
              <p className="text-sm text-mars-400 font-semibold">Camera Unavailable</p>
              <p className="text-xs text-mars-600 mt-1">{error}</p>
              <p className="text-[10px] text-mars-700 mt-3">Allow camera access in browser and reload</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* AI Detection Overlay */}
            <svg viewBox="0 0 430 260" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice">
              <AnimatePresence>
                {isBackendReady && detections.map((det) => (
                  <motion.g
                    key={det.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Bounding box (mirrored to match video) */}
                    <rect
                      x={430 - det.x - det.w} y={det.y} width={det.w} height={det.h}
                      fill="none" stroke={det.color} strokeWidth={1.5}
                      rx={2}
                      opacity={0.8}
                    />
                    {/* Corner brackets */}
                    <path d={`M ${430 - det.x - det.w},${det.y + 6} L ${430 - det.x - det.w},${det.y} L ${430 - det.x - det.w + 6},${det.y}`} fill="none" stroke={det.color} strokeWidth={2} />
                    <path d={`M ${430 - det.x - 6},${det.y} L ${430 - det.x},${det.y} L ${430 - det.x},${det.y + 6}`} fill="none" stroke={det.color} strokeWidth={2} />
                    <path d={`M ${430 - det.x - det.w},${det.y + det.h - 6} L ${430 - det.x - det.w},${det.y + det.h} L ${430 - det.x - det.w + 6},${det.y + det.h}`} fill="none" stroke={det.color} strokeWidth={2} />
                    <path d={`M ${430 - det.x - 6},${det.y + det.h} L ${430 - det.x},${det.y + det.h} L ${430 - det.x},${det.y + det.h - 6}`} fill="none" stroke={det.color} strokeWidth={2} />
                  </motion.g>
                ))}
              </AnimatePresence>

              {/* HUD Text */}
              <div className="absolute bottom-2 left-2 flex flex-col gap-0.5 pointer-events-none">
                <p className="text-[8px] text-white/25 font-mono">
                  {isBackendReady && modelInfo
                    ? `${modelInfo.model.toUpperCase()} | ${modelInfo.device.toUpperCase()} | LIVE WEBCAM | MIRROR ON`
                    : 'REDHARVESTER AI VISION v2.1 | WAITING FOR BACKEND...'}
                </p>
              </div>
            </svg>
          </>
        )}
        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />
      </div>
    </div>
  );
}
