import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { captureFrame, analyzePlantImage, PlantAnalysis, ActionStep } from '../services/geminiVision';
import { annotateImage } from '../services/falAnnotation';

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

  // Gemini analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PlantAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  // fal.ai annotation state
  const [annotating, setAnnotating] = useState(false);
  const [annotatedUrl, setAnnotatedUrl] = useState<string | null>(null);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<number>>(new Set());
  const [executingAction, setExecutingAction] = useState<number | null>(null);

  const executeAction = async (step: ActionStep) => {
    setExecutingAction(step.id);
    // Simulate action execution (robot / system command)
    await new Promise(r => setTimeout(r, 1500));
    setCompletedActions(prev => new Set(prev).add(step.id));
    setExecutingAction(null);
  };

  const handleCapture = async () => {
    if (!videoRef.current || !active) return;
    setAnalyzing(true);
    setAnalysis(null);
    setAnalysisError(null);
    setAnnotatedUrl(null);

    try {
      const base64 = captureFrame(videoRef.current);
      setSnapshot(`data:image/jpeg;base64,${base64}`);

      // Step 1: Gemini text analysis
      const result = await analyzePlantImage(base64);
      setAnalysis(result);
      setAnalyzing(false);

      // Step 2: fal.ai visual annotation (fire & forget into state)
      setAnnotating(true);
      const context = `Plants: ${result.plants.map(p => p.name).join(', ')}. Health: ${result.healthStatus}. Issues: ${result.issues.join('; ')}. Actions: ${result.actionPlan?.map(a => a.action).join('; ') ?? ''}`;
      const url = await annotateImage(base64, context);
      setAnnotatedUrl(url);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
      setAnnotating(false);
    }
  };

  const dismissAnalysis = () => {
    setAnalysis(null);
    setAnalysisError(null);
    setSnapshot(null);
    setAnnotatedUrl(null);
    setCompletedActions(new Set());
    setExecutingAction(null);
  };

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
          <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-alert-400 animate-pulse' : 'bg-mars-600'}`} />
          <h2 className="text-sm font-semibold text-mars-300 uppercase tracking-wider">Live Camera Feed</h2>
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

      {/* Main content: viewport + analysis panel */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* Webcam viewport */}
        <div className={`relative rounded-xl overflow-hidden border border-mars-700/50 bg-mars-950 ${analysis || analysisError ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
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
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />

          {/* Capture button overlay */}
          {active && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <button
                onClick={handleCapture}
                disabled={analyzing}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${
                  analyzing
                    ? 'bg-mars-700 text-mars-400 cursor-wait'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white hover:scale-105 active:scale-95'
                }`}
              >
                {analyzing ? (
                  <>
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>⏳</motion.span>
                    Analyzing…
                  </>
                ) : (
                  <>🔬 Analyze Plants</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Analysis result panel */}
        <AnimatePresence>
          {(analysis || analysisError) && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="w-1/2 glass rounded-xl p-4 overflow-y-auto flex flex-col gap-3"
            >
              {/* Close button */}
              <div className="flex items-center justify-between shrink-0">
                <h3 className="text-base font-bold text-mars-200 uppercase tracking-wider flex items-center gap-2">
                  🌿 Plant Analysis
                </h3>
                <button onClick={dismissAnalysis} className="text-mars-500 hover:text-mars-300 text-lg leading-none">✕</button>
              </div>

              {analysisError ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl mb-2">⚠️</div>
                    <p className="text-sm text-red-400 font-semibold">Analysis Failed</p>
                    <p className="text-xs text-mars-500 mt-1 max-w-[280px]">{analysisError}</p>
                    <button onClick={handleCapture} className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold bg-mars-800 text-mars-300 hover:bg-mars-700 transition-all">
                      Retry
                    </button>
                  </div>
                </div>
              ) : analysis && (
                <>
                  {/* Snapshot / Annotated image */}
                  {(annotatedUrl || snapshot) && (
                    <div
                      className="rounded-lg overflow-hidden border border-mars-700/50 shrink-0 relative cursor-pointer group"
                      onClick={() => setFullscreenImg(annotatedUrl ?? snapshot!)}
                    >
                      <img
                        src={annotatedUrl ?? snapshot!}
                        alt={annotatedUrl ? 'AI-Annotated' : 'Captured frame'}
                        className="w-full h-64 object-cover transition-transform group-hover:scale-[1.02]"
                      />
                      {annotating && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="flex items-center gap-2 text-xs text-mars-300 font-semibold">
                            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>🎨</motion.span>
                            Annotating…
                          </div>
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          annotatedUrl
                            ? 'bg-purple-900/80 text-purple-300 border border-purple-600/50'
                            : 'bg-mars-800/80 text-mars-400 border border-mars-600/50'
                        }`}>
                          {annotatedUrl ? '🎨 AI ANNOTATED' : '📸 ORIGINAL'}
                        </span>
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-white/80 font-semibold">🔍 Click to enlarge</span>
                      </div>
                    </div>
                  )}

                  {/* Health badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-mars-400">Health:</span>
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                      analysis.healthStatus === 'Excellent' || analysis.healthStatus === 'Good'
                        ? 'bg-green-900/50 text-green-400 border border-green-700/50'
                        : analysis.healthStatus === 'Fair'
                          ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/50'
                          : 'bg-red-900/50 text-red-400 border border-red-700/50'
                    }`}>
                      {analysis.healthStatus === 'Excellent' ? '✅' : analysis.healthStatus === 'Good' ? '👍' : analysis.healthStatus === 'Fair' ? '⚠️' : '🚨'} {analysis.healthStatus}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-mars-300 leading-relaxed">{analysis.summary}</p>

                  {/* Plants identified */}
                  {analysis.plants.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-mars-400 uppercase mb-1.5">Plants Identified</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.plants.map((p, i) => (
                          <span key={i} className="px-2.5 py-1.5 rounded-lg bg-mars-800/80 text-xs text-mars-200 border border-mars-700/50">
                            🌱 {p.name} <span className="text-mars-500">({p.confidence})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issues */}
                  {analysis.issues.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-yellow-400 uppercase mb-1.5">⚠ Issues Detected</h4>
                      <ul className="space-y-1.5">
                        {analysis.issues.map((issue, i) => (
                          <li key={i} className="text-xs text-mars-300 flex gap-1.5">
                            <span className="text-yellow-500 shrink-0">•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Plan */}
                  {analysis.actionPlan && analysis.actionPlan.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-cyan-400 uppercase">📋 Action Plan ({completedActions.size}/{analysis.actionPlan.length})</h4>
                        {completedActions.size === analysis.actionPlan.length && (
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-green-900/50 text-green-400 border border-green-700/50 font-bold">ALL DONE ✓</span>
                        )}
                      </div>
                      <ul className="space-y-1.5">
                        {analysis.actionPlan.map((step) => {
                          const done = completedActions.has(step.id);
                          const running = executingAction === step.id;
                          const catIcons: Record<string, string> = {
                            nutrition: '🧪', watering: '💧', lighting: '💡', pruning: '✂️',
                            'pest-control': '🐛', temperature: '🌡️', harvesting: '🌾', other: '🔧',
                          };
                          const prioColors: Record<string, string> = {
                            critical: 'text-red-400 bg-red-950/50 border-red-800/50',
                            high: 'text-orange-400 bg-orange-950/50 border-orange-800/50',
                            medium: 'text-yellow-400 bg-yellow-950/50 border-yellow-800/50',
                            low: 'text-blue-400 bg-blue-950/50 border-blue-800/50',
                          };
                          return (
                            <li key={step.id} className={`flex items-start gap-2 p-2 rounded-lg border transition-all ${
                              done
                                ? 'bg-green-950/30 border-green-800/30 opacity-70'
                                : 'bg-mars-900/50 border-mars-700/30'
                            }`}>
                              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                                <span className="text-sm">{catIcons[step.category] || '🔧'}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${prioColors[step.priority] || prioColors.medium}`}>
                                  {step.priority}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs leading-snug ${done ? 'line-through text-mars-500' : 'text-mars-200'}`}>
                                  {step.action}
                                </p>
                                <span className="text-[10px] text-mars-500">→ {step.targetPlant}</span>
                              </div>
                              <button
                                onClick={() => executeAction(step)}
                                disabled={done || running}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  done
                                    ? 'bg-green-900/40 text-green-500 border border-green-700/30 cursor-default'
                                    : running
                                      ? 'bg-mars-700 text-mars-400 cursor-wait border border-mars-600'
                                      : 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/50 hover:bg-cyan-800/50 hover:text-cyan-200 active:scale-95'
                                }`}
                              >
                                {done ? '✓ Done' : running ? (
                                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>⚙️</motion.span>
                                ) : '▶ Execute'}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fullscreen lightbox */}
      <AnimatePresence>
        {fullscreenImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 cursor-pointer"
            onClick={() => setFullscreenImg(null)}
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              src={fullscreenImg}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setFullscreenImg(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white text-3xl font-bold transition-colors"
            >
              ✕
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <span className="text-xs text-white/50">Click anywhere or press ✕ to close</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
